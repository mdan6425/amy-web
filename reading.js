/* AMY · The free reading.
   After someone sees their birth sky, they get a short personal reading,
   then three ways to go deeper (each with a price and a Book button),
   or they can simply keep talking with AMY.
   Prices and wording for the three offers live in OFFERS below. */
(function () {
  "use strict";

  const OFFERS = [
    { id: "reading", kind: "session", type: "Reader", tag: "Most chosen", title: "Your full soul reading", price: "$45", length: "30 minutes, by video or phone",
      text: "One of our readers goes deep into your sky, your numbers and your soul type, and answers the questions you bring.",
      button: "Book my reading" },
    { id: "pastor", kind: "session", type: "Pastor", tag: "Spiritual care", title: "A private session with our pastor", price: "$60", length: "45 minutes, by video or phone",
      text: "Prayer, counsel and a blessing for whatever you are carrying. Spiritual care, not therapy, medical or legal advice.",
      button: "Book with the pastor" },
    { id: "candle", kind: "candle", tag: "Candle work", title: "A candle for your intention", price: "from $25", length: "Prepared and dressed for you, with a seven-day ritual",
      text: "Choose the candle that matches what you are calling in: love, work and money, protection, peace at home, or clarity.",
      button: "Choose my candle" },
  ];

  const css = `
  #reading { position: fixed; inset: 0; z-index: 60; overflow-y: auto; background: radial-gradient(ellipse at 50% 0%, rgba(44,20,33,.82), rgba(16,8,13,.97) 65%); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); color: var(--ink, #f3e6d0); }
  body.in-reading #portal { visibility: hidden; }
  #reading[hidden] { display: none; }
  #reading .rd-wrap { max-width: 980px; margin: 0 auto; padding: 28px 20px 60px; }
  #reading .rd-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 26px; }
  #reading .rd-mark { font: 400 26px/1 var(--display, serif); letter-spacing: .28em; }
  #reading .rd-mark span { font-size: 11px; letter-spacing: .3em; color: var(--gold, #d6a85c); margin-left: 14px; }
  #reading .rd-link { background: none; border: 0; color: var(--mist, #cbb9a6); text-decoration: underline; font: inherit; cursor: pointer; }
  #reading .rd-eyebrow { font: 400 12px/1 var(--display, serif); letter-spacing: .3em; text-transform: uppercase; color: var(--gold, #d6a85c); }
  #reading h1 { font: 400 clamp(30px, 5vw, 46px)/1.1 var(--display, serif); margin: 12px 0 8px; }
  #reading .rd-sub { color: var(--mist, #cbb9a6); margin: 0 0 26px; }
  #reading .rd-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
  #reading .rd-tile { border: 1px solid rgba(214,168,92,.35); border-radius: 16px; padding: 14px 16px; background: rgba(30,14,22,.6); }
  #reading .rd-tile span { display: block; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--mist, #cbb9a6); }
  #reading .rd-tile b { display: block; font: 400 22px/1.2 var(--display, serif); margin: 6px 0 2px; color: #f6ead6; }
  #reading .rd-tile i { font-style: normal; font-size: 13px; color: var(--mist, #cbb9a6); }
  #reading .rd-amy { display: flex; gap: 16px; align-items: flex-start; border: 1px solid rgba(214,168,92,.5); border-radius: 20px; padding: 20px 22px; background: rgba(34,16,26,.78); margin-bottom: 34px; }
  #reading .rd-amy img { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; flex: none; border: 1px solid var(--gold, #d6a85c); }
  #reading .rd-amy h2 { font: 400 22px/1.2 var(--display, serif); margin: 0 0 8px; color: var(--gold, #d6a85c); }
  #reading .rd-amy p { margin: 0 0 10px; line-height: 1.6; font-size: 17px; }
  #reading .rd-amy .rd-wait { color: var(--mist, #cbb9a6); font-style: italic; }
  #reading .rd-offers h3 { font: 400 26px/1.2 var(--display, serif); margin: 8px 0 6px; }
  #reading .rd-offers > p { color: var(--mist, #cbb9a6); margin: 0 0 18px; }
  #reading .rd-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  #reading .rd-card { position: relative; display: flex; flex-direction: column; border: 1px solid rgba(214,168,92,.35); border-radius: 18px; padding: 18px; background: rgba(30,14,22,.72); }
  #reading .rd-card.best { border-color: var(--gold, #d6a85c); box-shadow: 0 0 0 1px rgba(214,168,92,.35), 0 12px 40px rgba(214,168,92,.12); }
  #reading .rd-card .tag { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--gold, #d6a85c); }
  #reading .rd-card h4 { font: 400 21px/1.25 var(--display, serif); margin: 8px 0 4px; }
  #reading .rd-card .price { font: 400 26px/1 var(--display, serif); margin: 6px 0 2px; color: #f6ead6; }
  #reading .rd-card .len { font-size: 13px; color: var(--mist, #cbb9a6); margin-bottom: 10px; }
  #reading .rd-card p { font-size: 15px; line-height: 1.5; margin: 0 0 16px; flex: 1; }
  #reading .rd-btn { display: block; width: 100%; padding: 13px 16px; border-radius: 99px; border: 1px solid var(--gold, #d6a85c); background: transparent; color: var(--gold, #d6a85c); font: 400 16px/1 var(--display, serif); letter-spacing: .04em; cursor: pointer; }
  #reading .rd-card.best .rd-btn, #reading .rd-btn.solid { background: var(--gold, #d6a85c); color: #1b0d14; }
  #reading .rd-free { text-align: center; margin-top: 26px; }
  #reading .rd-free .rd-btn { display: inline-block; width: auto; padding: 13px 28px; }
  #reading .rd-fine { text-align: center; font-size: 13px; color: var(--mist, #cbb9a6); margin-top: 18px; }
  #reading .rd-book { margin-top: 12px; display: grid; gap: 10px; }
  #reading .rd-book input, #reading .rd-book textarea { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(214,168,92,.35); background: rgba(16,8,13,.7); color: inherit; font: inherit; }
  #reading .rd-book .ok { color: #cfe8c8; } #reading .rd-book .err { color: #f2b8b0; font-size: 14px; }
  #reading .rd-traits { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 22px; }
  #reading .rd-trait { border: 1px solid var(--gold, #d6a85c); color: #f6e7c8; border-radius: 99px; padding: 6px 14px; font-size: 14px; background: rgba(214,168,92,.08); }
  #reading .rd-sec { margin: 34px 0 0; }
  #reading .rd-sec h3 { font: 400 26px/1.2 var(--display, serif); margin: 8px 0 6px; }
  #reading .rd-sec > p { color: var(--mist, #cbb9a6); margin: 0 0 16px; }
  #reading .rd-ints { display: flex; flex-wrap: wrap; gap: 10px; }
  #reading .rd-int { border: 1px solid rgba(214,168,92,.55); background: rgba(30,14,22,.7); color: #f3e6d0; border-radius: 99px; padding: 11px 18px; font: 400 16px/1 var(--display, serif); cursor: pointer; }
  #reading .rd-int:hover, #reading .rd-int.on { background: var(--gold, #d6a85c); color: #1b0d14; }
  #reading .rd-own { display: flex; gap: 8px; margin-top: 12px; max-width: 560px; }
  #reading .rd-own input { flex: 1; padding: 11px 14px; border-radius: 99px; border: 1px solid rgba(214,168,92,.35); background: rgba(16,8,13,.7); color: inherit; font: inherit; }
  #reading .rd-own .rd-btn { width: auto; padding: 11px 18px; }
  #reading .rd-answer { margin-top: 18px; }
  #reading .rd-next { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; align-items: stretch; margin-top: 18px; }
  #reading .rd-more { background: none; border: 0; color: var(--mist, #cbb9a6); text-decoration: underline; cursor: pointer; font: inherit; margin-top: 14px; }
  #reading .rd-all[hidden] { display: none; }
  #reading .rd-all { margin-top: 16px; }
  @media (max-width: 760px) { #reading .rd-tiles { grid-template-columns: repeat(2, 1fr); } #reading .rd-cards, #reading .rd-next { grid-template-columns: 1fr; } #reading .rd-amy { padding: 16px; flex-direction: column; gap: 10px; } #reading .rd-amy img { width: 44px; height: 44px; } #reading .rd-mark span { display: none; } }
  `;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n) => { try { return AMYLib.Numbers.meaningOf(n); } catch (e) { return null; } };
  const label = (n) => { try { return AMYLib.Numbers.numberLabel(n); } catch (e) { return String(n); } };

  function facts(r) {
    const lp = r.numbers && r.numbers.lifePath;
    const m = lp != null ? num(lp) : null;
    return {
      name: (typeof S !== "undefined" && S.p && S.p.firstName) || "",
      sun: r.sun.tropical, vedicSun: r.sun.sidereal,
      moon: r.timeKnown ? r.moon.rashi : null, nakshatra: r.timeKnown ? r.moon.nakshatra : null,
      rising: r.rising ? r.rising.sign : null,
      weekday: r.weekday, phase: /moon$/i.test(r.moonPhase.name) ? r.moonPhase.name : r.moonPhase.name + " Moon",
      lifePath: lp != null ? label(lp) : null, lpTitle: m ? m.title : "", lpGift: m ? m.gift : "", lpShadow: m ? m.shadow : "",
      westernMoon: r.moon.tropical || null, phaseName: r.moonPhase.name, illum: Math.round(r.moonPhase.illumination * 100),
      birthday: r.numbers && r.numbers.birthday != null ? label(r.numbers.birthday) : null, awakening: r.numbers && r.numbers.awakeningAges && r.numbers.awakeningAges[0],
      planets: (r.planets || []).filter((p) => !["Sun", "Moon"].includes(p.planet)).map((p) => `${p.planet} in ${p.sign}${house(r, p.sign) ? ` (${ord(house(r, p.sign))} house)` : ""}`).join(", "),
      sunHouse: house(r, r.sun.tropical), retro: (r.retrogrades || []).join(", "), hour: r.planetaryHour ? r.planetaryHour.ruler : null, dayRuler: r.weekdayRuler,
    };
  }

  const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const house = (r, sign) => (!r.rising ? null : ((SIGNS.indexOf(sign) - SIGNS.indexOf(r.rising.sign) + 12) % 12) + 1);
  const ord = (n) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
  const factLine = (f) => [
    `Western Sun ${f.sun}${f.sunHouse ? ` in the ${ord(f.sunHouse)} house` : ""}`, `Vedic Sun ${f.vedicSun}`,
    f.westernMoon ? `Western Moon ${f.westernMoon}` : null, f.moon ? `Vedic Moon ${f.moon} in the nakshatra ${f.nakshatra}` : null,
    `born under a ${f.phaseName} (${f.illum}% lit)`, f.rising ? `${f.rising} rising` : "birth time unknown, so no rising sign",
    f.planets ? `planets: ${f.planets}` : null, f.retro ? `retrograde: ${f.retro}` : null,
    `born on a ${f.weekday}, the ${f.dayRuler}'s day${f.hour ? `, in the hour of ${f.hour}` : ""}`,
    f.lifePath ? `numerology Life Path ${f.lifePath}, ${f.lpTitle} (gift: ${f.lpGift}; shadow: ${f.lpShadow})` : null,
    f.birthday ? `birthday number ${f.birthday}` : null, f.awakening ? `awakening age ${f.awakening}` : null, f.name ? `name ${f.name}` : null,
  ].filter(Boolean).join("; ");

  const INTENTIONS = [
    { id: "love", area: "love", label: "Love and relationships", offer: "candle", candle: "Love and Renewal" },
    { id: "money", area: "money", label: "Work and money", offer: "reading" },
    { id: "peace", area: "peace", label: "Healing and peace", offer: "pastor" },
    { id: "purpose", area: "purpose", label: "Purpose and direction", offer: "reading" },
    { id: "protection", area: "protection", label: "Protection", offer: "candle", candle: "Saint Michael" },
    { id: "family", area: "family", label: "Family and home", offer: "pastor" },
    { id: "exploring", area: "purpose", label: "I'm just exploring", offer: "reading" },
  ];

  function parsePortrait(text) {
    const lines = String(text || "").split("\n").map((l) => l.replace(/^[#*\s"]+|[*"]+$/g, "").trim());
    const nonEmpty = lines.filter(Boolean);
    const title = nonEmpty[0] || "";
    const traits = (nonEmpty[1] || "").split(/\s*[·•|,]\s*/).filter(Boolean).slice(0, 4);
    const body = nonEmpty.slice(2).join("\n\n");
    return { title, traits, body };
  }

  async function streamAMY(msg, onText) {
    const sample = await window.claude.use("sample");
    const out = await sample([{ role: "user", content: msg }], { modelTier: "default", onText: (u) => onText && onText(u && u.text) });
    return String((out && out.text) || "").trim();
  }

  function fallback(f) {
    return {
      title: "A soul that came here to grow",
      reading: `You arrived on a ${f.weekday} under a ${f.phase}, with the Sun in ${f.sun}${f.moon ? " and the Moon in " + f.moon : ""}${f.rising ? ", " + f.rising + " rising" : ""}. In astrology that is a blend of what you shine, what you need, and how you meet the world.\n\n` +
        (f.lifePath ? `Numerology calls your Life Path ${f.lifePath} ${f.lpTitle}: a gift for ${f.lpGift}, and a lesson around ${f.lpShadow}. ` : "") +
        `Read together, they describe someone who feels more than they show.\n\nThere is much more in your chart than a first look can hold.`,
    };
  }

  function bookingForm(offer, f, intent) {
    const box = document.createElement("form");
    box.className = "rd-book";
    box.innerHTML = `<input name="name" placeholder="Your name" autocomplete="name">
      <input name="contact" placeholder="Email or phone, so we can confirm" autocomplete="email" required>
      <input name="times" placeholder="Good days and times for you (optional)">
      <textarea name="note" rows="2" placeholder="Anything you'd like them to know (optional)"></textarea>
      <button class="rd-btn solid" type="submit">Request this ${offer.id === "pastor" ? "session" : "reading"}</button>
      <div class="err" role="status"></div>`;
    box.onsubmit = async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(box));
      if (!String(fd.contact || "").trim()) { box.querySelector(".err").textContent = "Add an email or phone number so we can confirm your time."; return; }
      fd.type = offer.type; fd.offer = offer.title; fd.price = offer.price; if (intent) fd.intention = intent.text || intent.label;
      fd.sky = `${f.sun} Sun${f.moon ? ", " + f.moon + " Moon" : ""}${f.rising ? ", " + f.rising + " rising" : ""}${f.lifePath ? ", Life Path " + f.lifePath : ""}`;
      box.querySelector("button").disabled = true;
      let err = null;
      try { err = typeof submitRequest === "function" ? await submitRequest(offer.kind, fd) : "Booking is not available here yet."; } catch (x) { err = "Your request couldn't be sent just now. Please try again in a moment."; }
      if (err) { box.querySelector(".err").textContent = err; box.querySelector("button").disabled = false; return; }
      box.innerHTML = `<p class="ok">Thank you. Your request is in, and we'll write to you to confirm a time and payment. Nothing is charged until you confirm.</p>`;
    };
    return box;
  }

  async function show(r, onTalk) {
    if (!document.getElementById("rd-style")) { const st = document.createElement("style"); st.id = "rd-style"; st.textContent = css; document.head.appendChild(st); }
    let root = document.getElementById("reading");
    if (!root) { root = document.createElement("div"); root.id = "reading"; document.body.appendChild(root); }
    const f = facts(r);
    const tiles = [
      ["Sun", f.sun, `Vedic: ${f.vedicSun}`],
      ["Moon", f.westernMoon || f.moon || "Add your birth time", f.moon ? `Vedic: ${f.moon} · ${f.nakshatra}` : f.phaseName],
      ["Rising", f.rising || "Add your birth time", f.rising ? "how you meet the world" : "for your rising sign"],
      ["Life Path", f.lifePath || "", f.lpTitle],
    ];
    const card = (o, extra) => `<div class="rd-card best" data-id="${o.id}"><span class="tag">${esc(extra && extra.tag || o.tag)}</span><h4>${esc(extra && extra.title || o.title)}</h4><div class="price">${esc(o.price)}</div><div class="len">${esc(o.length)}</div><p>${esc(extra && extra.text || o.text)}</p><button class="rd-btn" data-a="offer">${esc(o.button)}</button><div class="rd-slot"></div></div>`;
    root.innerHTML = `<div class="rd-wrap">
      <div class="rd-top"><div class="rd-mark">AMY<span>ASK ME YOUR…</span></div><button class="rd-link" data-a="talk">Talk with AMY instead</button></div>
      <div class="rd-eyebrow">The universe, speaking you</div>
      <h1 class="rd-title">Listening to your sky…</h1>
      <div class="rd-traits"></div>
      <div class="rd-tiles">${tiles.map(([a, b, c]) => `<div class="rd-tile"><span>${esc(a)}</span><b>${esc(b)}</b><i>${esc(c)}</i></div>`).join("")}</div>
      <div class="rd-amy"><img src="portrait.jpg" alt=""><div><h2 class="rd-h">Your soul portrait</h2><div class="rd-text"><p class="rd-wait">AMY is reading how your Sun, Moon, rising and numbers speak to each other.</p></div></div></div>
      <div class="rd-sec rd-intent"><div class="rd-eyebrow">Now you speak to the universe</div><h3>What are you calling into your life right now?</h3>
        <p>Choose what matters most, and I'll show you what your sky says about it.</p>
        <div class="rd-ints">${INTENTIONS.map((x) => `<button class="rd-int" data-i="${x.id}">${esc(x.label)}</button>`).join("")}</div>
        <form class="rd-own"><input name="own" placeholder="Or say it in your own words" maxlength="160"><button class="rd-btn solid" type="submit">Ask the sky</button></form>
        <div class="rd-answer" hidden><div class="rd-amy"><img src="portrait.jpg" alt=""><div><h2 class="rd-ah">The sky answers</h2><div class="rd-atext"><p class="rd-wait">Reading your chart for this…</p></div></div></div>
          <div class="rd-eyebrow">A next step for this</div><div class="rd-next"></div>
          <button class="rd-more" type="button">See every way to go deeper</button>
          <div class="rd-all" hidden><div class="rd-cards">${OFFERS.map((o) => card(o).replace(' best"', '"')).join("")}</div></div>
        </div>
      </div>
      <div class="rd-free"><button class="rd-btn" data-a="talk">Keep talking with AMY, free</button></div>
      <p class="rd-fine">Readings are offered for reflection and entertainment. AMY is an AI guide; our pastor and readers are real people.</p>
    </div>`;
    root.hidden = false; root.scrollTop = 0;
    document.body.classList.add("in-reading");

    let closed = false, chosen = null, portrait = null;
    const paras = (t) => String(t || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")}</p>`).join("");
    const close = () => {
      if (closed) return; closed = true; root.hidden = true; document.body.classList.remove("in-reading");
      try { if (typeof S !== "undefined") { if (portrait) S.freeReading = `${portrait.title}. ${portrait.body}`; if (chosen) S.freeReading = (S.freeReading || "") + ` They chose the intention: ${chosen.label}.`; if (typeof save === "function") save(); } } catch (e) { /* ignore */ }
      return Promise.resolve(onTalk && onTalk());
    };
    root.querySelectorAll("[data-a=talk]").forEach((b) => (b.onclick = () => close()));
    const wireOffers = (scope) => scope.querySelectorAll(".rd-card").forEach((c) => {
      const offer = OFFERS.find((o) => o.id === c.dataset.id), btn = c.querySelector("[data-a=offer]");
      if (!offer || !btn || btn.dataset.wired) return; btn.dataset.wired = "1";
      btn.onclick = () => {
        if (offer.id === "candle") { close().then(() => setTimeout(() => { location.hash = "candles"; }, 500)); return; }
        const slot = c.querySelector(".rd-slot");
        if (!slot.firstChild) { slot.appendChild(bookingForm(offer, f, chosen)); slot.querySelector("input[name=contact]").focus(); }
      };
    });
    root.querySelector(".rd-more").onclick = () => { const a = root.querySelector(".rd-all"); a.hidden = !a.hidden; wireOffers(a); };

    async function answer(intent) {
      chosen = intent;
      root.querySelectorAll(".rd-int").forEach((b) => b.classList.toggle("on", b.dataset.i === intent.id));
      const box = root.querySelector(".rd-answer"); box.hidden = false;
      const at = root.querySelector(".rd-atext"); at.innerHTML = `<p class="rd-wait">Reading your chart for ${esc(intent.label.toLowerCase())}…</p>`;
      root.querySelector(".rd-ah").textContent = intent.id === "exploring" ? "The sky answers your curiosity" : `The sky answers: ${intent.label.toLowerCase()}`;
      const o = OFFERS.find((x) => x.id === intent.offer) || OFFERS[0];
      const tailored = o.id === "candle" ? { tag: "For this intention", title: `A ${intent.candle} candle`, text: `Prepared and dressed for ${intent.label.toLowerCase()}, with a seven-day ritual AMY walks you through.` }
        : o.id === "pastor" ? { tag: "For this intention", text: `Prayer, counsel and a blessing for ${intent.label.toLowerCase()}. Spiritual care, not therapy, medical or legal advice.` }
        : { tag: "For this intention", title: intent.id === "exploring" ? "Your full soul reading" : `A soul reading on ${intent.label.toLowerCase()}`, text: `One of our readers goes deep into what your sky, your numbers and your soul type say about ${intent.id === "exploring" ? "who you are" : intent.label.toLowerCase()}.` };
      root.querySelector(".rd-next").innerHTML = card(o, tailored) + `<div class="rd-card"><span class="tag">Free</span><h4>Keep going with AMY</h4><p>Talk it through with AMY, try the practice tonight, and come back tomorrow for your daily check-in.</p><button class="rd-btn" data-a="talk">Talk with AMY</button></div>`;
      root.querySelector(".rd-next [data-a=talk]").onclick = () => close();
      wireOffers(root.querySelector(".rd-next"));
      try { if (typeof S !== "undefined") { S.intention = { area: intent.area, mode: intent.id === "protection" ? "protect" : "call", text: intent.text || intent.label }; if (typeof setDiscovery === "function") setDiscovery("intention", (intent.text || intent.label).slice(0, 40)); } } catch (e) { /* ignore */ }
      const msg = `[The visitor has just seen their soul portrait${portrait && portrait.title ? ` ("${portrait.title}")` : ""} and now names an intention: "${intent.text || intent.label}". From these chart facts only: ${factLine(f)}. Write the sky's answer in two short paragraphs, about 100 words: which parts of their chart speak to this intention (for love look to Venus, the Moon and the 7th house; for work and money the Sun's house, the 10th and 2nd houses, Jupiter, Saturn and the Life Path; for healing the Moon and the birth star; for purpose the Sun, the rising sign, the Life Path and the awakening age; for protection Mars and Saturn; for family the Moon and the 4th house) and what they suggest, attributing each tradition. Then give one simple free practice they can do tonight for this intention, in one or two sentences. No question at the end, no products, no tools.]`;
      let text = "";
      try { text = await streamAMY(msg, (t) => { if (t && chosen === intent) at.innerHTML = paras(t); }); } catch (e) { text = ""; }
      if (chosen === intent) at.innerHTML = paras(text || `Your ${f.sun} Sun and ${f.lifePath ? "Life Path " + f.lifePath : "your chart"} both speak to this. Tonight, light a candle or simply sit quietly for one minute, say your intention out loud once, and notice what you feel.`);
    }
    root.querySelectorAll(".rd-int").forEach((b) => (b.onclick = () => answer(INTENTIONS.find((x) => x.id === b.dataset.i))));
    root.querySelector(".rd-own").onsubmit = (e) => { e.preventDefault(); const v = String(new FormData(e.target).get("own") || "").trim(); if (v) answer({ id: "own", area: "purpose", label: v, text: v, offer: "reading" }); };

    // The universe speaks: the soul portrait.
    const msg = `[The visitor has just seen their birth sky. Write their soul portrait from these chart facts only, never inventing other placements: ${factLine(f)}. Format exactly: first line, an archetype name of two to four words beginning with "The" (for example The Radiant Builder). Second line, three short traits separated by " · ". Then a blank line and two short paragraphs, about 120 words in total, on how their Sun, Moon, rising sign and numbers play together: the gifts they likely carry, an inner tension they may recognise, and what their soul seems to be learning. This is reflective, not a diagnosis. Attribute each tradition, speak to them as you, make it feel personal and tender. No question at the end and no tools.]`;
    const paint = (t) => { if (closed) return; const p = parsePortrait(t); if (p.title) root.querySelector(".rd-title").textContent = p.title; if (p.traits.length) root.querySelector(".rd-traits").innerHTML = p.traits.map((x) => `<span class="rd-trait">${esc(x)}</span>`).join(""); if (p.body) root.querySelector(".rd-text").innerHTML = paras(p.body); };
    let text = "";
    try { text = await streamAMY(msg, paint); } catch (e) { text = ""; }
    portrait = parsePortrait(text);
    if (!portrait.title || !portrait.body) { const fb = fallback(f); portrait = { title: fb.title, traits: [], body: fb.reading }; }
    if (closed) return;
    root.querySelector(".rd-title").textContent = portrait.title;
    root.querySelector(".rd-text").innerHTML = paras(portrait.body);
    try { if (typeof S !== "undefined") { S.freeReading = `${portrait.title}. ${portrait.body}`; if (typeof save === "function") save(); } } catch (e) { /* ignore */ }
  }

  window.AMYReading = { show, OFFERS };
})();
