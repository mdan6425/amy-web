// AMY conversation endpoint. The browser runs AMY's tools; this function only
// talks to Anthropic, adds AMY's fixed system prompt, and enforces limits so the
// key cannot be used as a general-purpose proxy.
import { AMY_SYSTEM } from "./_amy-system.js";

export const config = { runtime: "edge" };

const MODELS = {
  quick: process.env.AMY_MODEL_QUICK || "claude-haiku-5-5",
  default: process.env.AMY_MODEL || "claude-sonnet-5-5",
};
const LIMITS = { bodyBytes: 250_000, messages: 40, context: 14_000, prompt: 16_000, tools: 30, chatTokens: 1500, jsonTokens: 1200 };

// Light per-instance rate limit (each edge instance keeps its own window).
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 60_000, max = 30;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(req.url).host || (process.env.AMY_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean).includes(origin); } catch { return false; }
}

function cleanMessages(list) {
  if (!Array.isArray(list) || !list.length || list.length > LIMITS.messages) return null;
  const out = [];
  for (const m of list) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    if (typeof m.content === "string") { if (!m.content.trim()) continue; out.push({ role: m.role, content: m.content.slice(0, 8000) }); continue; }
    if (!Array.isArray(m.content)) return null;
    const blocks = [];
    for (const b of m.content) {
      if (b.type === "text" && typeof b.text === "string") blocks.push({ type: "text", text: b.text.slice(0, 8000) });
      else if (b.type === "tool_use" && m.role === "assistant") blocks.push({ type: "tool_use", id: String(b.id), name: String(b.name).slice(0, 64), input: b.input && typeof b.input === "object" ? b.input : {} });
      else if (b.type === "tool_result" && m.role === "user") blocks.push({ type: "tool_result", tool_use_id: String(b.tool_use_id), content: String(b.content ?? "").slice(0, 12000) });
    }
    if (blocks.length) out.push({ role: m.role, content: blocks });
  }
  if (!out.length || out[0].role !== "user") return null;
  return out;
}

function cleanTools(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, LIMITS.tools).filter((t) => t && /^[a-z_]{1,64}$/.test(t.name)).map((t) => ({
    name: t.name,
    description: String(t.description || "").slice(0, 1200),
    input_schema: t.input_schema && t.input_schema.type === "object" ? t.input_schema : { type: "object", properties: {} },
  }));
}

export default async function handler(req) {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!sameOrigin(req)) return json(403, { error: "forbidden" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(503, { error: "not_configured" });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
  if (limited(ip)) return json(429, { error: "rate_limited" });

  const raw = await req.text();
  if (raw.length > LIMITS.bodyBytes) return json(413, { error: "too_large" });
  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { error: "bad_json" }); }

  const tier = body.tier === "quick" ? "quick" : "default";
  let payload;
  if (body.mode === "json") {
    const prompt = String(body.prompt || "").slice(0, LIMITS.prompt);
    if (!prompt.trim()) return json(400, { error: "empty" });
    payload = {
      model: MODELS.quick, max_tokens: LIMITS.jsonTokens,
      system: "You are a helper inside AMY, a gentle spiritual companion website. Reply with one valid JSON value only, no prose and no code fences.",
      messages: [{ role: "user", content: prompt }],
    };
  } else {
    const messages = cleanMessages(body.messages);
    if (!messages) return json(400, { error: "bad_messages" });
    const context = String(body.context || "").slice(0, LIMITS.context);
    payload = {
      model: MODELS[tier], max_tokens: LIMITS.chatTokens, stream: true,
      system: [
        { type: "text", text: AMY_SYSTEM, cache_control: { type: "ephemeral" } },
        ...(context.trim() ? [{ type: "text", text: context }] : []),
      ],
      messages,
    };
    const tools = cleanTools(body.tools);
    if (tools.length) payload.tools = tools;
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("[amy] anthropic", upstream.status, detail.slice(0, 400));
    return json(upstream.status === 429 || upstream.status === 529 ? 429 : 502, { error: upstream.status === 429 || upstream.status === 529 ? "rate_limited" : "upstream" });
  }

  if (body.mode === "json") {
    const data = await upstream.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    return json(200, { text });
  }
  return new Response(upstream.body, { status: 200, headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
}
