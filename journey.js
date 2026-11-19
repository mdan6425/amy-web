/* AMY · Journey cards for the birth sky.
   Visual cards that make the sky speak about the person: the Moon they were
   born under, the Moon over their city, the birth moment, the three lights,
   their numbers, and the world they arrived in. sky-portal.js calls these
   when they exist and falls back to its simpler cards when they do not. */
(function () {
  "use strict";
  const D2R = Math.PI / 180;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const GLYPH = Object.fromEntries(Object.entries({ Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓" }).map(([k, v]) => [k, v + "\uFE0E"]));
  const ELEMENT = { Aries: "Fire", Leo: "Fire", Sagittarius: "Fire", Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth", Gemini: "Air", Libra: "Air", Aquarius: "Air", Cancer: "Water", Scorpio: "Water", Pisces: "Water" };
  const KEYS = {
    Aries: ["courage", "drive", "first steps"], Taurus: ["steadiness", "senses", "loyalty"], Gemini: ["curiosity", "words", "quick mind"],
    Cancer: ["tenderness", "memory", "protection"], Leo: ["warmth", "heart", "the need to shine"], Virgo: ["devotion", "detail", "healing hands"],
    Libra: ["harmony", "beauty", "partnership"], Scorpio: ["depth", "loyalty", "rebirth"], Sagittarius: ["faith", "freedom", "truth"],
    Capricorn: ["discipline", "ambition", "legacy"], Aquarius: ["vision", "independence", "friendship"], Pisces: ["compassion", "dreams", "intuition"],
  };
  const MOON_SIGN = {
    Aries: "feelings arrive fast and honest, and you need room to act on them",
    Taurus: "you feel safest with comfort, touch and things that last",
    Gemini: "you understand your feelings by talking them through",
    Cancer: "you feel everything deeply and need a true home to come back to",
    Leo: "you need to be seen and loved warmly, and you love back generously",
    Virgo: "you calm yourself by caring for others and putting things right",
    Libra: "you need peace, fairness and partnership to feel whole, and conflict unsettles you more than you show",
    Scorpio: "your feelings run deep and private, and trust is earned slowly",
    Sagittarius: "you need freedom and meaning, and you lift yourself with hope",
    Capricorn: "you hold your feelings carefully and show love through what you build",
    Aquarius: "you feel things from a little distance and need friendship more than drama",
    Pisces: "you absorb the moods around you and need quiet to find your own again",
  };
  const HOUSE = {
    1: "the house of self: you are meant to be seen as yourself", 2: "the house of value: money, worth and what you can build with your hands",
    3: "the house of words: learning, writing, siblings and your neighbourhood", 4: "the house of home: roots, family and your private world",
    5: "the house of joy: creativity, romance, children and play", 6: "the house of service: work, health and daily devotion",
    7: "the house of partnership: marriage and the people who mirror you", 8: "the house of depth: shared resources, intimacy and rebirth",
    9: "the house of faith: travel, teaching and the search for meaning", 10: "the house of calling: career, reputation and public life",
    11: "the house of community: friendship, networks and hopes for the future", 12: "the house of the hidden: spirit, solitude and what is healed in private",
  };
  const RETRO = {
    Mercury: "Mercury was retrograde, which astrologers link to a mind that thinks twice, rewrites and sees what others miss",
    Venus: "Venus was retrograde, which astrologers link to love that is examined deeply before it is given",
    Mars: "Mars was retrograde, which astrologers link to strength that is held inside and released with care",
    Jupiter: "Jupiter was retrograde, which astrologers link to a private, inward kind of faith",
    Saturn: "Saturn was retrograde, which astrologers link to an inner sense of responsibility that starts young",
  };
  const PHASE_SHORT = {
    "New Moon": "a soul of beginnings", "Waxing Crescent": "the courage to grow past where you came from", "First Quarter": "a builder who pushes through resistance",
    "Waxing Gibbous": "a refiner, always asking what more is possible", "Full Moon": "here to be seen, with relationships as your mirror",
    "Waning Gibbous": "a natural teacher who shares what life taught", "Last Quarter": "the one who turns and breaks old patterns", "Waning Crescent": "an old soul, here to complete and release",
  };

  const css = `
  .jy-moon { display: grid; grid-template-columns: 96px 1fr; gap: 14px; align-items: center; }
  .jy-moon svg { width: 96px; height: 96px; filter: drop-shadow(0 0 14px rgba(240,220,180,.35)); }
  .jy-big { font: 400 26px/1.15 var(--display, serif); color: #f6ead6; margin: 2px 0 4px; }
  .jy-sub { font-size: 14px; color: var(--mist, #cbb9a6); }
  .jy-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .jy-chip { font-size: 12px; border: 1px solid rgba(214,168,92,.45); color: #f1dfbf; border-radius: 99px; padding: 4px 10px; background: rgba(214,168,92,.07); }
  .jy-arc { width: 100%; height: auto; display: block; margin-top: 8px; }
  .jy-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 10px; }
  .jy-stat { border: 1px solid rgba(214,168,92,.28); border-radius: 10px; padding: 7px 9px; }
  .jy-stat b { display: block; font: 400 15px/1.2 var(--display, serif); color: #f6ead6; }
  .jy-stat span { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--mist, #cbb9a6); }
  .jy-lights { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .jy-light { border: 1px solid rgba(214,168,92,.35); border-radius: 14px; padding: 10px 8px; text-align: center; background: rgba(30,14,22,.5); }
  .jy-light .g { font-size: 30px; line-height: 1; color: var(--gold, #d6a85c); }
  .jy-light .k { font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--mist, #cbb9a6); margin-top: 6px; }
  .jy-light .s { font: 400 20px/1.2 var(--display, serif); color: #f6ead6; }
  .jy-light .e { font-size: 11px; color: var(--gold, #d6a85c); }
  .jy-light .w { font-size: 12px; color: #e9d8bd; margin-top: 4px; line-height: 1.35; }
  .jy-light .v { font-size: 11px; color: var(--mist, #cbb9a6); margin-top: 4px; }
  .jy-nums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .jy-num { border: 1px solid rgba(214,168,92,.35); border-radius: 14px; padding: 10px 8px; text-align: center; }
  .jy-num b { display: block; font: 400 34px/1 var(--display, serif); color: var(--gold, #d6a85c); }
  .jy-num span { display: block; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--mist, #cbb9a6); margin-top: 6px; }
  .jy-num i { display: block; font-style: normal; font-size: 13px; color: #f1dfbf; margin-top: 2px; }
  .jy-world { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 6px; }
  .jy-world li { border-left: 2px solid var(--gold, #d6a85c); padding: 2px 0 2px 10px; font-size: 14px; line-height: 1.4; }
  .jy-world li b { color: var(--gold, #d6a85c); font-weight: 400; margin-right: 6px; }
  .jy-src { font-size: 11px; color: var(--mist, #cbb9a6); margin-top: 6px; }
  @media (max-width: 520px) { .jy-moon { grid-template-columns: 72px 1fr; } .jy-moon svg { width: 72px; height: 72px; } .jy-light .s { font-size: 17px; } .jy-num b { font-size: 28px; } }
  `;
  function ensureStyle() { if (document.getElementById("jy-style")) return; const s = document.createElement("style"); s.id = "jy-style"; s.textContent = css; document.head.appendChild(s); }

  /* ---------- small astronomy helpers ---------- */
  function altAz(body, gast, lat, lng) {
    const H = (gast + lng - body.ra) * D2R, d = body.dec * D2R, f = lat * D2R;
    const alt = Math.asin(Math.sin(d) * Math.sin(f) + Math.cos(d) * Math.cos(f) * Math.cos(H)) / D2R;
    const az = (Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(f) - Math.tan(d) * Math.cos(f)) / D2R + 180 + 360) % 360;
    return { alt, az };
  }
  const COMPASS = ["north", "north-northeast", "northeast", "east-northeast", "east", "east-southeast", "southeast", "south-southeast", "south", "south-southwest", "southwest", "west-southwest", "west", "west-northwest", "northwest", "north-northwest"];
  const dir = (az) => COMPASS[Math.round(az / 22.5) % 16];
  const fmt = (d, zone) => { try { return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: zone }).format(d); } catch (e) { return ""; } };
  function localMidnight(date, zone) { try { return new Date(AMYLib.Birth.birthReading({ date, time: "00:00", place: { lat: 0, lng: 0, tz: zone } }).instant); } catch (e) { return new Date(date + "T00:00:00"); } }

  /** Sun and Moon across the birth day at a place: paths, rises and sets. */
  function dayPaths(date, place) {
    const start = localMidnight(date, place.tz).getTime(), step = 15 * 60e3, pts = { Sun: [], Moon: [] }, events = { Moon: {}, Sun: {} };
    let prev = null;
    for (let i = 0; i <= 96; i++) {
      const t = new Date(start + i * step), sb = AMYLib.Birth.skyBodies(t, place.lat, place.lng);
      const cur = {};
      for (const n of ["Sun", "Moon"]) {
        const b = sb.bodies.find((x) => x.name === n), p = altAz(b, sb.gast, place.lat, place.lng);
        pts[n].push({ t, ...p }); cur[n] = p;
        if (prev) {
          const h = n === "Sun" ? -0.83 : 0.125;
          if (prev[n].alt < h && p.alt >= h && !events[n].rise) events[n].rise = { t, az: p.az };
          if (prev[n].alt >= h && p.alt < h && !events[n].set) events[n].set = { t, az: p.az };
        }
      }
      prev = cur;
    }
    return { pts, events };
  }

  /* ---------- drawings ---------- */
  function moonSVG(angle, size = 96) {
    const r = 44, c = 50, k = (1 - Math.cos(angle * D2R)) / 2, waxing = angle % 360 < 180;
    const rx = Math.abs(Math.cos(angle * D2R)) * r;
    const outer = waxing ? 1 : 0, inner = waxing ? (k < 0.5 ? 0 : 1) : (k < 0.5 ? 1 : 0);
    const lit = k > 0.985 ? `<circle cx="${c}" cy="${c}" r="${r}" fill="url(#jyLit)"/>` : k < 0.015 ? "" :
      `<path d="M ${c} ${c - r} A ${r} ${r} 0 0 ${outer} ${c} ${c + r} A ${rx.toFixed(2)} ${r} 0 0 ${inner} ${c} ${c - r} Z" fill="url(#jyLit)"/>`;
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><defs><radialGradient id="jyLit" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#fff8e6"/><stop offset="1" stop-color="#e8d6b0"/></radialGradient></defs>
      <circle cx="${c}" cy="${c}" r="${r}" fill="#2a1a22" stroke="rgba(214,168,92,.35)"/>${lit}</svg>`;
  }

  function arcSVG(paths, zone, moment) {
    const W = 560, H = 170, x = (az) => ((az - 0 + 360) % 360) / 360 * W, y = (alt) => H - 30 - Math.max(-12, alt) / 90 * (H - 50);
    const line = (arr, col, dash) => {
      let d = "", pen = false, last = null;
      for (const p of arr) { const px = x(p.az), py = y(p.alt); if (last !== null && Math.abs(px - last) > W / 2) pen = false; d += (pen ? " L " : " M ") + px.toFixed(1) + " " + py.toFixed(1); pen = true; last = px; }
      return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" ${dash ? 'stroke-dasharray="4 4"' : ""} opacity=".9"/>`;
    };
    const ground = y(0), lab = [["N", 0], ["E", 90], ["S", 180], ["W", 270], ["N", 359.9]];
    let marks = "";
    if (moment) for (const [n, col] of [["Sun", "#f3c36b"], ["Moon", "#f4ead8"]]) { const p = moment[n]; if (p) marks += `<circle cx="${x(p.az)}" cy="${y(p.alt)}" r="${n === "Sun" ? 7 : 6}" fill="${col}"/><text x="${x(p.az) + 9}" y="${y(p.alt) - 8}" fill="${col}" font-size="16">${n}${p.alt < 0 ? " (below)" : ""}</text>`; }
    return `<svg class="jy-arc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Paths of the Sun and Moon across the sky that day">
      <rect x="0" y="${ground}" width="${W}" height="${H - ground}" fill="rgba(10,4,8,.55)"/><line x1="0" y1="${ground}" x2="${W}" y2="${ground}" stroke="rgba(214,168,92,.5)"/>
      ${line(paths.pts.Sun, "#f3c36b", false)}${line(paths.pts.Moon, "#f4ead8", true)}${marks}
      ${lab.map(([t, a]) => `<text x="${Math.min(W - 10, Math.max(2, x(a) - 4))}" y="${H - 10}" fill="rgba(240,225,200,.7)" font-size="15">${t}</text>`).join("")}
      <text x="8" y="18" fill="#f3c36b" font-size="15">— Sun</text><text x="70" y="18" fill="#f4ead8" font-size="15">- - Moon</text></svg>`;
  }

  /* ---------- cards ---------- */
  function moonCard(r) {
    ensureStyle();
    const ph = r.moonPhase, range = r.moon.tropicalRange && r.moon.tropicalRange[0] !== r.moon.tropicalRange[1] ? r.moon.tropicalRange : null, sign = r.moon.tropical || (r.moon.tropicalRange && r.moon.tropicalRange[0]), signTxt = range ? range.join(" or ") : sign;
    const html = `<div class="eyebrow">Astronomy and astrology · The Moon you were born under</div>
      <div class="jy-moon">${moonSVG(ph.angle)}<div><div class="jy-big">${esc(ph.name)}</div><div class="jy-sub">${Math.round(ph.illumination * 100)}% lit · ${Math.max(0, Math.round(ph.ageDays))} days into her cycle</div>
      <div class="jy-chips"><span class="jy-chip">Moon in ${esc(signTxt)}</span>${r.tithi ? `<span class="jy-chip">Vedic lunar day: ${esc(r.tithi.name)}</span>` : ""}</div></div></div>`;
    const signLine = range ? `Your Moon was moving from ${range[0]} into ${range[1]} that day; your birth time will settle it.` : `The Moon itself stood in ${sign}, and astrologers say that with a ${sign} Moon ${MOON_SIGN[sign]}.`;
    const text = `In astrology the Moon is your inner life, the way you feel and what you need to feel safe. You were born under a ${ph.name.toLowerCase()}, ${PHASE_SHORT[ph.name] || "a soul in motion"}. ${signLine}`;
    return { card: { html }, text, fact: ["Moon at birth", ph.name] };
  }

  function moonOverCity(date, place) {
    ensureStyle();
    let paths; try { paths = dayPaths(date, place); } catch (e) { return null; }
    const m = paths.events.Moon, rise = m.rise ? `rose at ${fmt(m.rise.t, place.tz)} in the ${dir(m.rise.az)}` : null, set = m.set ? `set at ${fmt(m.set.t, place.tz)} in the ${dir(m.set.az)}` : null;
    const peak = paths.pts.Moon.reduce((a, b) => (b.alt > a.alt ? b : a));
    const html = `<div class="eyebrow">Over ${esc(place.name)} · The Sun and Moon that day</div><div class="jy-big">The Moon's path over ${esc(place.name)}</div>
      <div class="jy-sub">${[rise && "Moonrise " + fmt(m.rise.t, place.tz), set && "moonset " + fmt(m.set.t, place.tz), peak.alt > 0 && `highest ${Math.round(peak.alt)}° at ${fmt(peak.t, place.tz)}`].filter(Boolean).join(" · ")}</div>
      ${arcSVG(paths, place.tz, null)}`;
    const parts = [rise, set].filter(Boolean);
    const text = `On ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(date + "T12:00:00"))}, the Moon over ${place.name} ${parts.length ? parts.join(" and ") : "stayed close to the horizon"}. ` +
      (peak.alt > 0 ? `She climbed to ${Math.round(peak.alt)} degrees above the ${dir(peak.az)} at ${fmt(peak.t, place.tz)}. ` : "") + `This is the arc she drew over the city you were born in.`;
    return { card: { html }, text, paths };
  }

  function momentCard(r, place) {
    ensureStyle();
    const sb = AMYLib.Birth.skyBodies(new Date(r.instant), place.lat, place.lng);
    const pos = {}; for (const n of ["Sun", "Moon"]) pos[n] = altAz(sb.bodies.find((b) => b.name === n), sb.gast, place.lat, place.lng);
    const ascIdx = r.rising ? SIGNS.indexOf(r.rising.sign) : -1, house = (sign) => (ascIdx < 0 ? null : ((SIGNS.indexOf(sign) - ascIdx + 12) % 12) + 1);
    const sunHouse = house(r.sun.tropical), moonHouse = r.moon.tropical ? house(r.moon.tropical) : null;
    const above = (r.above || []).filter((n) => n !== "Sun" && n !== "Moon");
    const sunUp = pos.Sun.alt > 0;
    const stats = [
      [sunUp ? `${Math.round(pos.Sun.alt)}° up in the ${dir(pos.Sun.az)}` : `${Math.round(-pos.Sun.alt)}° below the horizon`, "The Sun"],
      [pos.Moon.alt > 0 ? `${Math.round(pos.Moon.alt)}° up in the ${dir(pos.Moon.az)}` : "below the horizon", "The Moon"],
      r.rising ? [`${r.rising.sign} ${GLYPH[r.rising.sign]}`, "Rising"] : null,
      sunHouse ? [`${ordinal(sunHouse)} house`, "Your Sun"] : null,
      [`${(r.above || []).length} of 7`, "Planets overhead"],
      (r.retrogrades || []).length ? [(r.retrogrades || []).join(", "), "Retrograde"] : null,
    ].filter(Boolean);
    const paths = (() => { try { return dayPaths(r.date, place); } catch (e) { return null; } })();
    const html = `<div class="eyebrow">Astronomy · The moment</div><div class="jy-big">${esc(fmt(new Date(r.instant), place.tz))}, ${esc(r.weekday)}</div>
      <div class="jy-sub">${r.planetaryHour ? `Hour of ${esc(r.planetaryHour.ruler)} on the day of the ${esc(r.weekdayRuler)}` : ""}</div>
      ${paths ? arcSVG(paths, place.tz, pos) : ""}
      <div class="jy-stats">${stats.map(([b, s]) => `<div class="jy-stat"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join("")}</div>`;
    let text = sunUp ? (pos.Sun.alt > 45 ? `You were born with the Sun high, ${Math.round(pos.Sun.alt)} degrees up in the ${dir(pos.Sun.az)}. ` : `You were born in daylight, the Sun ${Math.round(pos.Sun.alt)} degrees up in the ${dir(pos.Sun.az)}. `) : `You were born in the dark, the Sun hidden below the ${dir(pos.Sun.az)} horizon. `;
    if (sunHouse) text += `In astrology that puts your Sun in the ${ordinal(sunHouse)} house, ${HOUSE[sunHouse]}. `;
    if (r.planetaryHour) text += `It was the hour of ${r.planetaryHour.ruler} on the ${r.weekdayRuler}'s own day. `;
    const rt = (r.retrogrades || []).find((n) => RETRO[n]); if (rt) text += RETRO[rt] + ".";
    return { card: { html }, text: text.trim(), fact: r.planetaryHour ? ["Hour of", r.planetaryHour.ruler] : null, sunHouse, moonHouse };
  }

  function lightsCard(r) {
    ensureStyle();
    const moonSign = r.moon.tropical || (r.moon.tropicalRange ? r.moon.tropicalRange[0] : null);
    const tile = (glyph, label, sign, vedic) => sign ? `<div class="jy-light"><div class="g">${glyph}</div><div class="k">${label}</div><div class="s">${esc(sign)} ${GLYPH[sign] || ""}</div><div class="e">${ELEMENT[sign] || ""}</div><div class="w">${(KEYS[sign] || []).map(esc).join(" · ")}</div>${vedic ? `<div class="v">${esc(vedic)}</div>` : ""}</div>` : `<div class="jy-light"><div class="g">${glyph}</div><div class="k">${label}</div><div class="s">Unknown</div><div class="w">Add your birth time</div></div>`;
    const html = `<div class="eyebrow">Your three lights · Western astrology, with the Vedic view beneath</div><div class="jy-lights">
      ${tile("☉", "Sun · who you are", r.sun.tropical, `Vedic: ${r.sun.sidereal}`)}
      ${tile("☾", "Moon · what you need", moonSign, r.timeKnown ? `Vedic: ${r.moon.rashi} · ${r.moon.nakshatra}` : "")}
      ${tile("↑", "Rising · how you meet the world", r.rising ? r.rising.sign : null, "")}</div>`;
    const els = [ELEMENT[r.sun.tropical], moonSign && ELEMENT[moonSign], r.rising && ELEMENT[r.rising.sign]].filter(Boolean);
    const blend = new Set(els).size === 1 ? `All three share ${els[0]}, so that element runs strong in you.` : `${andList([...new Set(els)])} meet in you, which is why you can feel like more than one person.`;
    const text = `Your Sun in ${r.sun.tropical} is ${KEYS[r.sun.tropical][0]} and ${KEYS[r.sun.tropical][1]}.` + (moonSign ? ` Your Moon in ${moonSign} needs ${KEYS[moonSign][0]}.` : "") + (r.rising ? ` ${r.rising.sign} rising is how the world first meets you: ${KEYS[r.rising.sign][0]}.` : "") + ` ${blend}`;
    return { card: { html }, text, fact: ["Sun", r.sun.tropical] };
  }

  function numbersCard(r) {
    ensureStyle();
    const N = r.numbers || {}, M = (n) => { try { return AMYLib.Numbers.meaningOf(n); } catch (e) { return { title: "" }; } }, label = (n) => { try { return AMYLib.Numbers.numberLabel(n); } catch (e) { return String(n); } };
    if (N.lifePath == null) return null;
    const lp = M(N.lifePath), bd = N.birthday != null ? M(N.birthday) : null;
    const html = `<div class="eyebrow">Numerology · The numbers in your birth date</div><div class="jy-nums">
      <div class="jy-num"><b>${esc(label(N.lifePath))}</b><span>Life Path</span><i>${esc(lp.title)}</i></div>
      ${bd ? `<div class="jy-num"><b>${esc(label(N.birthday))}</b><span>Birthday</span><i>${esc(bd.title)}</i></div>` : ""}
      ${N.awakeningAges && N.awakeningAges.length ? `<div class="jy-num"><b>${N.awakeningAges[0]}</b><span>Awakening age</span><i>a turning point</i></div>` : ""}</div>`;
    const text = `Numerology reads your birth date as a path. Life Path ${label(N.lifePath)} is ${lp.title}: the gift is ${lp.gift}, and the lesson is ${lp.shadow}.` + (bd ? ` Your birthday number, ${label(N.birthday)}, adds ${bd.title.toLowerCase().replace(/^the /, "the ")}.` : "") + (N.awakeningAges && N.awakeningAges.length ? ` It marks ${N.awakeningAges[0]} as an age of awakening.` : "");
    return { card: { html }, text, fact: ["Life Path", label(N.lifePath)] };
  }

  async function worldCard(date) {
    ensureStyle();
    const [y, m, d] = date.split("-").map(Number);
    let items = [];
    try {
      const res = await fetch(`/api/world?y=${y}&m=${m}&d=${d}`);
      if (res.ok) items = ((await res.json()).events || []).slice(0, 4);
    } catch (e) { /* not available here */ }
    if (!items.length) return null;
    const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(date + "T12:00:00"));
    const html = `<div class="eyebrow">History · The world you arrived in</div><div class="jy-big">${esc(month)} ${y}</div>
      <ul class="jy-world">${items.map((e) => `<li><b>${esc(e.date)}</b>${esc(e.text)}</li>`).join("")}</ul><div class="jy-src">From Wikipedia's record of ${y}</div>`;
    const text = `Every soul lands in a particular moment of the world. This was the world turning around you the month you arrived, the news your family may have been talking about while they waited for you.`;
    return { card: { html }, text };
  }

  function ordinal(n) { return n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"); }
  function andList(a) { return a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }

  window.AMYJourney = { moonCard, moonOverCity, momentCard, lightsCard, numbersCard, worldCard, HOUSE, KEYS, ELEMENT, GLYPH, MOON_SIGN, ordinal };
})();
