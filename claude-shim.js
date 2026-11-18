/* AMY on the open web.
   The site was first built as a Claude page, where the page asks Claude for
   "sample" (the AI), "db" (storage), "user", "tts" (speech) and "dictation".
   This file gives the same five things to a normal website:
   - sample: talks to /api/chat (our Vercel function, which holds the Anthropic key)
     and runs AMY's tools here in the browser, round by round.
   - db: this browser's localStorage (only used when the visitor turns memory on).
     Candle and session requests go to /api/request so the owner receives them.
   - user: an anonymous id kept in this browser.
   - tts / dictation: the browser's own speech and speech recognition. */
(function () {
  "use strict";
  window.AMY_WEB = true;
  const err = (code, text) => Object.assign(new Error(code), { code, text });

  /* ---------- AI ---------- */
  function splitHead(messages) {
    let msgs = messages.map((m) => ({ role: m.role, content: m.content }));
    let context = "";
    const sys = typeof AMY_SYSTEM !== "undefined" ? AMY_SYSTEM : null; // defined by app.js
    if (msgs[0] && msgs[0].role === "user" && sys && typeof msgs[0].content === "string" && msgs[0].content.startsWith(sys)) {
      context = msgs[0].content.slice(sys.length).trim();
      msgs = msgs.slice(1);
      if (msgs[0] && msgs[0].role === "assistant" && msgs[0].content === "Understood.") msgs = msgs.slice(1);
    }
    // The API needs the conversation to start and end with the visitor. After the birth sky
    // (or any moment AMY speaks first) add a quiet stage note instead of dropping her words.
    if (!msgs.length || msgs[0].role !== "user") msgs.unshift({ role: "user", content: "[The visitor has opened AMY.]" });
    if (msgs[msgs.length - 1].role !== "user") msgs.push({ role: "user", content: "[The visitor is with AMY now and waiting for her next words.]" });
    return { context, msgs };
  }

  async function post(body, signal) {
    let res;
    try {
      res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
    } catch (e) {
      if (signal && signal.aborted) throw e;
      throw err("network", "I lost the connection for a moment. Your message is still here; try again?");
    }
    if (!res.ok) {
      let code = "upstream";
      try { code = (await res.json()).error || code; } catch (e) { /* ignore */ }
      if (code === "not_configured") throw err(code, "AMY is almost ready. Her connection is still being set up, so she can't reply yet. The Library, meditations, today's sky and Light Work all work now from the menu.");
      if (code === "rate_limited") throw err("rate_limited");
      if (code === "key_rejected") throw err(code, "AMY can't reach her thinking right now: the site's Anthropic key was not accepted. (Site owner: check ANTHROPIC_API_KEY in Vercel, then redeploy.)");
      if (code === "no_credit") throw err(code, "AMY is resting right now. (Site owner: the Anthropic account needs credit or a higher spending limit.)");
      throw err(code);
    }
    return res;
  }

  async function streamRound(body, signal, onDelta) {
    const res = await post(body, signal);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    const blocks = [];
    let buf = "", stop = null;
    const handle = (ev) => {
      if (ev.type === "content_block_start") {
        const b = ev.content_block;
        blocks[ev.index] = b.type === "tool_use" ? { type: "tool_use", id: b.id, name: b.name, input: {}, _json: "" } : { type: "text", text: "" };
      } else if (ev.type === "content_block_delta") {
        const b = blocks[ev.index];
        if (!b) return;
        if (ev.delta.type === "text_delta") { b.text += ev.delta.text; onDelta(ev.delta.text); }
        else if (ev.delta.type === "input_json_delta") b._json += ev.delta.partial_json;
      } else if (ev.type === "content_block_stop") {
        const b = blocks[ev.index];
        if (b && b.type === "tool_use") { try { b.input = b._json ? JSON.parse(b._json) : {}; } catch (e) { b.input = {}; } delete b._json; }
      } else if (ev.type === "message_delta" && ev.delta) {
        stop = ev.delta.stop_reason || stop;
      } else if (ev.type === "error") {
        throw err(ev.error && ev.error.type === "overloaded_error" ? "rate_limited" : "upstream");
      }
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          let ev; try { ev = JSON.parse(data); } catch (e) { continue; }
          handle(ev);
        }
      }
    }
    return { content: blocks.filter(Boolean).filter((b) => b.type !== "text" || b.text), stop };
  }

  async function sample(messages, opts) {
    opts = opts || {};
    const { context, msgs } = splitHead(messages);
    const list = opts.tools || [];
    const byName = Object.fromEntries(list.map((t) => [t.name, t]));
    const tools = list.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema || { type: "object", properties: {} } }));
    let full = "", sep = false;
    for (let round = 0; round < 6; round++) {
      const { content, stop } = await streamRound(
        { mode: "chat", tier: opts.modelTier === "quick" ? "quick" : "default", context, messages: msgs, tools },
        opts.signal,
        (d) => { if (sep && full) { full += "\n\n"; } sep = false; full += d; if (opts.onText) opts.onText({ text: full }); }
      );
      if (!content.length) break;
      msgs.push({ role: "assistant", content });
      const uses = content.filter((b) => b.type === "tool_use");
      if (stop !== "tool_use" || !uses.length) break;
      const results = [];
      let waitForThem = false;
      for (const u of uses) {
        let out;
        try { out = byName[u.name] ? await byName[u.name].execute(u.input || {}) : { error: "unknown tool" }; }
        catch (e) { out = { error: String((e && e.message) || e) }; }
        if (out && typeof out.instruction === "string" && /^End your reply/.test(out.instruction)) waitForThem = true;
        results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out === undefined ? null : out) });
      }
      if (waitForThem) break; // choices or a question are on screen: AMY waits for their answer
      msgs.push({ role: "user", content: results });
      sep = true;
    }
    return { text: full.trim() };
  }
  sample.json = async function (prompt, opts) {
    const res = await post({ mode: "json", tier: "quick", prompt: String(prompt) }, opts && opts.signal);
    const { text } = await res.json();
    const t = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    // Models sometimes put raw line breaks inside JSON strings; escape them before parsing.
    const repair = (x) => { let o = "", inS = false, bs = false; for (const ch of x) { if (inS) { if (bs) { o += ch; bs = false; } else if (ch === "\\") { o += ch; bs = true; } else if (ch === '"') { inS = false; o += ch; } else if (ch === "\n") o += "\\n"; else if (ch === "\r") { /* drop */ } else if (ch === "\t") o += "\\t"; else o += ch; } else { if (ch === '"') inS = true; o += ch; } } return o; };
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    const body = a >= 0 && b > a ? t.slice(a, b + 1) : t;
    for (const c of [t, body, repair(body)]) { try { return JSON.parse(c); } catch (e) { /* try the next form */ } }
    throw err("bad_json");
  };

  /* ---------- Visitor id and storage ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  let guest = store.get("amy-guest");
  if (!guest) { guest = "g_" + Math.random().toString(36).slice(2) + Date.now().toString(36); store.set("amy-guest", guest); }
  const user = { id: async () => guest };

  const db = {
    doc(path) {
      const key = "amy-db:" + path;
      return {
        async get() { const v = store.get(key); let d = null; try { d = v ? JSON.parse(v) : null; } catch (e) { d = null; } return { exists: !!d, data: () => d }; },
        async set(obj) {
          if (path.startsWith("requests/")) {
            const items = (obj && obj.items) || [];
            const item = items[items.length - 1];
            const r = await fetch("/api/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ item, guest }) });
            if (!r.ok) throw err("request_failed");
          }
          store.set(key, JSON.stringify(obj));
        },
        async delete() { store.del(key); },
      };
    },
  };

  /* ---------- Speech ---------- */
  let tts = null;
  if ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
    const pick = () => {
      const vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
      const pref = [/samantha/i, /ava/i, /allison/i, /aria/i, /jenny/i, /google uk english female/i, /google us english/i, /female/i, /zira/i];
      for (const p of pref) { const v = vs.find((x) => p.test(x.name)); if (v) return v; }
      return vs[0] || null;
    };
    tts = {
      speak(text, o) {
        return new Promise((resolve, reject) => {
          const u = new SpeechSynthesisUtterance(String(text));
          const v = pick(); if (v) u.voice = v;
          u.rate = Math.max(0.6, Math.min(1.2, (o && o.rate) || 0.95));
          u.pitch = 1.05;
          u.onend = () => resolve();
          u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? resolve() : reject(err("tts")));
          speechSynthesis.speak(u);
        });
      },
      stop() { speechSynthesis.cancel(); },
    };
  }

  let dictation = null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const h = { partial: [], final: [], state: [] };
    const emit = (k, v) => h[k].forEach((f) => { try { f(v); } catch (e) { /* ignore */ } });
    let rec = null;
    dictation = {
      onPartial(f) { h.partial.push(f); }, onFinal(f) { h.final.push(f); }, onState(f) { h.state.push(f); },
      async start() {
        rec = new SR();
        rec.lang = navigator.language || "en-US"; rec.interimResults = true; rec.continuous = false;
        rec.onstart = () => emit("state", { state: "listening" });
        rec.onend = () => { emit("state", { state: "idle" }); rec = null; };
        rec.onerror = () => emit("state", { state: "idle" });
        rec.onresult = (e) => {
          let interim = "", fin = "";
          for (let i = e.resultIndex; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript) : (interim += e.results[i][0].transcript));
          if (interim) emit("partial", { text: interim });
          if (fin) emit("final", { text: fin.trim() });
        };
        rec.start();
      },
      async stop() { if (rec) rec.stop(); },
    };
  }

  const caps = { sample, db, user, tts, dictation };
  window.claude = { use: async (name) => { if (!caps[name]) throw err("unavailable"); return caps[name]; } };
})();
