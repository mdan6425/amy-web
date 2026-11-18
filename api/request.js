// Candle and session requests. Each request is saved as a private JSON file in
// the project's Vercel Blob store, so the owner can read them in the dashboard.
import { put } from "@vercel/blob";

export const config = { runtime: "edge" };

const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const clip = (v, n) => String(v ?? "").slice(0, n);

export default async function handler(req) {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return json(403, { error: "forbidden" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(503, { error: "not_configured" });
  let body;
  try { body = JSON.parse((await req.text()).slice(0, 20_000)); } catch { return json(400, { error: "bad_json" }); }
  const item = body && body.item;
  if (!item || !clip(item.contact, 200).trim()) return json(400, { error: "missing_contact" });
  const clean = {};
  for (const [k, v] of Object.entries(item).slice(0, 20)) clean[clip(k, 40)] = clip(v, 1200);
  const record = { ...clean, guest: clip(body.guest, 60), receivedAt: new Date().toISOString() };
  const day = record.receivedAt.slice(0, 10);
  await put(`requests/${day}/${clip(clean.kind, 20) || "request"}.json`, JSON.stringify(record, null, 2), { access: "private", addRandomSuffix: true, contentType: "application/json" });
  return json(200, { ok: true });
}
