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
  @media (max-width: 760px) { #reading .rd-tiles { grid-template-columns: repeat(2, 1fr); } #reading .rd-cards { grid-template-columns: 1fr; } #reading .rd-amy { padding: 16px; flex-direction: column; gap: 10px; } #reading .rd-amy img { width: 44px; height: 44px; } #reading .rd-mark span { display: none; } }
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
    };
  }

  function fallback(f) {
    return {
      title: "A soul that came here to grow",
      reading: `You arrived on a ${f.weekday} under a ${f.phase}, with the Sun in ${f.sun}${f.moon ? " and the Moon in " + f.moon : ""}${f.rising ? ", " + f.rising + " rising" : ""}. In astrology that is a blend of what you shine, what you need, and how you meet the world.\n\n` +
        (f.lifePath ? `Numerology calls your Life Path ${f.lifePath} ${f.lpTitle}: a gift for ${f.lpGift}, and a lesson around ${f.lpShadow}. ` : "") +
        `Read together, they describe someone who feels more than they show.\n\nThere is much more in your chart than a first look can hold.`,
    };
  }

  async function writeReading(f) {
    const prompt = `You are AMY, a warm, feminine spiritual guide on a website. Write a free first reading for a visitor from these facts only. Never invent other placements.
Facts: Western Sun ${f.sun}; Vedic Sun ${f.vedicSun}; ${f.moon ? `Moon ${f.moon} in the nakshatra ${f.nakshatra}; ` : "birth time unknown, so no Moon sign or rising; "}${f.rising ? `${f.rising} rising; ` : ""}born on a ${f.weekday} under a ${f.phase}; ${f.lifePath ? `numerology Life Path ${f.lifePath} (${f.lpTitle}: gift ${f.lpGift}; shadow ${f.lpShadow})` : ""}.${f.name ? ` Their name is ${f.name}.` : ""}
Write three short paragraphs, about 120 words in total, speaking to them as "you". Attribute traditions ("In astrology…", "Vedic astrology says…", "Numerology calls…"). Weave the pieces into one picture of who they are: their gift, what they may struggle with, and what their soul seems to be learning. Make it feel personal and true, tender, a little mysterious. No predictions, no em dashes, no lists. End with one sentence saying there is much more in their chart that a full reading can open.
Return JSON: {"title": "an evocative title of at most six words", "reading": "the three paragraphs separated by blank lines"}`;
    try {
      const sample = await window.claude.use("sample");
      const out = await sample.json(prompt, { modelTier: "quick" });
      if (out && typeof out.reading === "string" && out.reading.length > 60) return { title: String(out.title || "Your reading").slice(0, 80), reading: out.reading };
    } catch (e) { /* use the written fallback */ }
    return fallback(f);
  }

  function bookingForm(offer, f) {
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
      fd.type = offer.type; fd.offer = offer.title; fd.price = offer.price;
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
      ["Vedic Moon", f.moon || "Add your birth time", f.nakshatra ? "Birth star: " + f.nakshatra : "for your Moon"],
      ["Rising", f.rising || "Add your birth time", f.rising ? "how you meet the world" : "for your rising sign"],
      ["Life Path", f.lifePath || "", f.lpTitle],
    ];
    root.innerHTML = `<div class="rd-wrap">
      <div class="rd-top"><div class="rd-mark">AMY<span>ASK ME YOUR…</span></div><button class="rd-link" data-a="talk">Talk with AMY instead</button></div>
      <div class="rd-eyebrow">Your free reading</div>
      <h1 class="rd-title">${f.name ? esc(f.name) + ", this" : "This"} is the soul your sky describes</h1>
      <p class="rd-sub">Born on a ${esc(f.weekday)} under a ${esc(f.phase)}.</p>
      <div class="rd-tiles">${tiles.map(([a, b, c]) => `<div class="rd-tile"><span>${esc(a)}</span><b>${esc(b)}</b><i>${esc(c)}</i></div>`).join("")}</div>
      <div class="rd-amy"><img src="portrait.jpg" alt=""><div><h2 class="rd-h">Reading your chart…</h2><div class="rd-text"><p class="rd-wait">AMY is reading your sky and your numbers.</p></div></div></div>
      <div class="rd-offers"><div class="rd-eyebrow">Go deeper</div><h3>Your chart has more to say</h3><p>Choose how you'd like to continue. Every session is confirmed personally before anything is charged.</p>
        <div class="rd-cards">${OFFERS.map((o, i) => `<div class="rd-card${i === 0 ? " best" : ""}" data-id="${o.id}"><span class="tag">${esc(o.tag)}</span><h4>${esc(o.title)}</h4><div class="price">${esc(o.price)}</div><div class="len">${esc(o.length)}</div><p>${esc(o.text)}</p><button class="rd-btn" data-a="offer">${esc(o.button)}</button><div class="rd-slot"></div></div>`).join("")}</div>
      </div>
      <div class="rd-free"><button class="rd-btn" data-a="talk">Keep talking with AMY, free</button></div>
      <p class="rd-fine">Readings are offered for reflection and entertainment. AMY is an AI guide; our pastor and readers are real people.</p>
    </div>`;
    root.hidden = false; root.scrollTop = 0;
    document.body.classList.add("in-reading");

    let closed = false;
    const close = (then) => { if (closed) return; closed = true; root.hidden = true; document.body.classList.remove("in-reading"); Promise.resolve(onTalk && onTalk()).then(() => then && then()); };
    root.querySelectorAll("[data-a=talk]").forEach((b) => (b.onclick = () => close()));
    root.querySelectorAll(".rd-card").forEach((card) => {
      const offer = OFFERS.find((o) => o.id === card.dataset.id);
      card.querySelector("[data-a=offer]").onclick = () => {
        if (offer.id === "candle") { close(); setTimeout(() => { location.hash = "candles"; }, 700); return; }
        const slot = card.querySelector(".rd-slot");
        if (!slot.firstChild) { slot.appendChild(bookingForm(offer, f)); slot.querySelector("input[name=contact]").focus(); }
      };
    });

    const rd = await writeReading(f);
    if (closed) return;
    root.querySelector(".rd-h").textContent = rd.title;
    root.querySelector(".rd-text").innerHTML = rd.reading.split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join("");
    try { if (typeof S !== "undefined") { S.freeReading = rd.reading; if (typeof save === "function") save(); } } catch (e) { /* ignore */ }
  }

  window.AMYReading = { show, OFFERS };
})();
