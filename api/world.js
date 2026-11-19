// "The world you arrived in": a few real events from the visitor's birth month,
// taken from Wikipedia's page for that year.
export const config = { runtime: "edge" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const json = (status, obj, cache) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": cache || "no-store" } });

function clean(t) {
  let s = t;
  for (let k = 0; k < 3; k++) s = s.replace(/\{\{[^{}]*\}\}/g, "");
  s = s.replace(/<ref[^>]*\/>/g, "").replace(/<ref[\s\S]*?<\/ref>/g, "").replace(/<[^>]+>/g, "");
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1").replace(/\[https?:[^\s\]]+\s([^\]]+)\]/g, "$1");
  s = s.replace(/'''?/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return s.replace(/^[\s–—:-]+/, "").trim();
}

export default async function handler(req) {
  const u = new URL(req.url);
  const y = parseInt(u.searchParams.get("y"), 10), m = parseInt(u.searchParams.get("m"), 10), d = parseInt(u.searchParams.get("d"), 10) || 15;
  if (!(y >= 1900 && y <= 2030) || !(m >= 1 && m <= 12)) return json(400, { error: "bad_date" });
  const month = MONTHS[m - 1];
  let raw;
  try {
    const r = await fetch(`https://en.wikipedia.org/w/index.php?title=${y}&action=raw`, { headers: { "user-agent": "AMY/1.0 (amy-web; spiritual companion site)" } });
    if (!r.ok) return json(502, { error: "source" });
    raw = await r.text();
  } catch (e) { return json(502, { error: "source" }); }

  // The month's part of the Events section.
  const ev = raw.indexOf("== Events ==") >= 0 ? raw.slice(raw.indexOf("== Events ==")) : raw;
  const head = ev.search(new RegExp(`^===\\s*${month}\\s*===\\s*$`, "m"));
  if (head < 0) return json(200, { events: [] }, "public, max-age=86400");
  const rest = ev.slice(head).split("\n").slice(1);
  const lines = [];
  for (const line of rest) { if (/^==/.test(line)) break; lines.push(line); }

  const out = [];
  let current = null;
  for (const line of lines) {
    const top = line.match(/^\*\s*(.+)$/), sub = line.match(/^\*\*\s*(.+)$/);
    if (sub && current) { const t = clean(sub[1]); if (t.length > 20) out.push({ day: current.day, date: current.date, text: t }); continue; }
    if (!top || /^\*\*/.test(line)) continue;
    const body = top[1];
    const dm = body.match(/^\[\[(\w+ \d{1,2})\]\]\s*(?:[–—-]|&ndash;)?\s*(.*)$/) || body.match(/^(\w+ \d{1,2})\s*[–—-]\s*(.*)$/);
    if (!dm || !dm[1].startsWith(month)) { current = null; continue; }
    const day = parseInt(dm[1].split(" ")[1], 10);
    current = { day, date: dm[1] };
    const t = clean(dm[2] || "");
    if (t.length > 20) out.push({ day, date: dm[1], text: t });
  }
  // Prefer events closest to the birthday, gentler ones first, one per date, then show them in date order.
  const grim = /\b(kill|killed|killing|execut|massacre|bomb|murder|shot|die|dies|died|death|deaths|dead|crash|terror|hostage|attack|genocide|rape|suicide|tsunami|earthquake|flood|famine|disaster)/i;
  const seen = new Set();
  const pick = out.map((e) => ({ ...e, dist: Math.abs(e.day - d) + (grim.test(e.text) ? 40 : 0) })).sort((a, b) => a.dist - b.dist)
    .filter((e) => (seen.has(e.date) ? false : (seen.add(e.date), true))).slice(0, 4).sort((a, b) => a.day - b.day)
    .map((e) => ({ date: e.date, text: e.text.length > 220 ? e.text.slice(0, 217).replace(/\s+\S*$/, "") + "…" : e.text }));
  return json(200, { events: pick }, "public, max-age=604800");
}
