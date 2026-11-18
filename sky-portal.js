/* AMY birth-sky portal.
   The first thing a new visitor sees: the sky, and AMY small in the corner asking when they arrived.
   Each answer turns the sky to their birth: the day, then the place, then the minute. AMY grows as she learns,
   until the conversation takes over and their sky stays behind it.
   Loaded after app.js and uses its globals (S, L, caps, save, setDiscovery, cityPicker, speak, ...). */
"use strict";

/* ================= Sky renderer ================= */
const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

function bvColor(bv) {
  // Blue-white to warm gold, kept soft so the palette stays candlelit.
  const t = clamp((bv + 0.3) / 2.0, 0, 1);
  const r = Math.round(lerp(190, 255, Math.min(1, t * 1.6)));
  const g = Math.round(lerp(210, 196, t));
  const b = Math.round(lerp(255, 150, t));
  return `${r},${g},${b}`;
}
const GLYPH = { Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄" };
const SIGN_GLYPH = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

class SkyCanvas {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext("2d");
    this.view = { lst: 0, lat: 35, dome: 0, lines: 0, labels: 0, horizon: 0, bodies: 0, ecl: 0, dim: 1 };
    this.anim = null; this.drift = 0.35; this.bodies = []; this.moonAngle = 0; this.asc = null;
    this.focus = null; this.ready = false; this.paused = false; this.last = performance.now();
    this.resize(); addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => { this.paused = document.hidden; if (!this.paused) { this.last = performance.now(); requestAnimationFrame((t) => this.frame(t)); } });
    requestAnimationFrame((t) => this.frame(t));
  }
  async load(url) {
    const d = await (await fetch(url)).json();
    const P = (ra, dec) => { const a = ra * D2R, b = dec * D2R; return [Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b)]; };
    this.stars = d.stars.map(([ra, dec, mag, bv], i) => ({ p: P(ra, dec), mag, col: bvColor(bv), size: Math.max(0.45, (6.0 - mag) * 0.62), tw: (i * 9301 + 49297) % 233280 / 233280 }));
    this.named = d.named.map(([ra, dec, name, mag]) => ({ p: P(ra, dec), name, mag }));
    this.lines = d.lines.map((seg) => seg.map(([ra, dec]) => P(ra, dec)));
    this.mw = d.mw.map((rings) => rings.map((ring) => ring.map(([ra, dec]) => P(ra, dec))));
    this.ecliptic = [];
    const eps = 23.44 * D2R;
    for (let l = 0; l <= 360; l += 4) {
      const L = l * D2R; const ra = Math.atan2(Math.sin(L) * Math.cos(eps), Math.cos(L)) / D2R; const dec = Math.asin(Math.sin(L) * Math.sin(eps)) / D2R;
      this.ecliptic.push({ l, p: P(ra, dec) });
    }
    this.ready = true;
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = innerWidth; this.h = innerHeight; this.dpr = dpr;
    this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
    this.c.style.width = this.w + "px"; this.c.style.height = this.h + "px";
  }
  layout() {
    const w = this.w, h = this.h, narrow = w < 760;
    const imm = { cx: w / 2, cy: h / 2, R: Math.hypot(w, h) * 0.55 };
    const dome = narrow ? (() => { const R = Math.min(w * 0.4, h * 0.22); return { cx: w / 2, cy: 96 + R, R }; })() : (w > 1100 ? (() => { const left = 410, right = w - 300; return { cx: (left + right) / 2, cy: h * 0.47, R: Math.min(h * 0.41, (right - left) / 2 - 34) }; })() : { cx: w * 0.5, cy: h * 0.47, R: Math.min(h * 0.41, w * 0.29) });
    const t = this.view.dome;
    return { cx: lerp(imm.cx, dome.cx, t), cy: lerp(imm.cy, dome.cy, t), R: lerp(imm.R, dome.R, t) };
  }
  /** Animate view properties. lst may wrap with extra full turns, so a jump in years reads as time spinning. */
  animateTo(target, ms = 3000, turns = 0) {
    if (REDUCED) ms = Math.min(ms, 400);
    const from = { ...this.view }, to = { ...from, ...target };
    if ("lst" in target) { const dl = ((target.lst - from.lst) % 360 + 540) % 360 - 180; to.lst = from.lst + dl + 360 * turns; }
    return new Promise((res) => { this.anim = { from, to, start: performance.now(), ms, res }; });
  }
  setBodies(sb) { this.bodies = sb.bodies.map((b) => { const a = b.ra * D2R, d = b.dec * D2R; return { ...b, p: [Math.sin(a), Math.cos(a), Math.sin(d), Math.cos(d)] }; }); this.moonAngle = sb.moonPhaseAngle; }
  setAsc(lon, sign) {
    if (lon == null) { this.asc = null; return; }
    const eps = 23.44 * D2R, L = lon * D2R;
    const ra = Math.atan2(Math.sin(L) * Math.cos(eps), Math.cos(L)), dec = Math.asin(Math.sin(L) * Math.sin(eps));
    this.asc = { p: [Math.sin(ra), Math.cos(ra), Math.sin(dec), Math.cos(dec)], sign };
  }
  // Horizon coordinates for a precomputed [sinRA, cosRA, sinDec, cosDec].
  hz(p, sL, cL, sP, cP) {
    const sinH = sL * p[1] - cL * p[0], cosH = cL * p[1] + sL * p[0]; // H = LST - RA
    const sinAlt = p[2] * sP + p[3] * cP * cosH;
    const x = -p[3] * sinH;                       // east
    const y = p[2] * cP - p[3] * cosH * sP;       // north
    return { sinAlt, x, y };
  }
  proj(q, L) {
    // Stereographic from the zenith: horizon at radius R; east on the left, as when lying on your back facing north-up.
    const zen = Math.acos(clamp(q.sinAlt, -1, 1));
    const r = L.R * Math.tan(Math.min(zen, 150 * D2R) / 2);
    const n = Math.hypot(q.x, q.y) || 1;
    return [L.cx - r * q.x / n, L.cy - r * q.y / n];
  }
  bodyAlt(name) {
    const b = this.bodies.find((x) => x.name === name); if (!b) return null;
    const v = this.view, sL = Math.sin(v.lst * D2R), cL = Math.cos(v.lst * D2R), sP = Math.sin(v.lat * D2R), cP = Math.cos(v.lat * D2R);
    return Math.asin(clamp(this.hz(b.p, sL, cL, sP, cP).sinAlt, -1, 1)) / D2R;
  }
  frame(now) {
    if (this.paused) return;
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    if (this.anim) {
      const a = this.anim, t = clamp((now - a.start) / a.ms, 0, 1), e = ease(t);
      for (const k in a.to) this.view[k] = lerp(a.from[k], a.to[k], e);
      if (t >= 1) { this.anim = null; a.res(); }
    } else if (!REDUCED) this.view.lst += this.drift * dt;
    if (this.ready) this.draw(now / 1000);
    requestAnimationFrame((t) => this.frame(t));
  }
  draw(time) {
    const { ctx, dpr, w, h } = this, v = this.view, L = this.layout();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sL = Math.sin(v.lst * D2R), cL = Math.cos(v.lst * D2R), sP = Math.sin(v.lat * D2R), cP = Math.cos(v.lat * D2R);
    const sunAlt = this.bodyAlt("Sun") ?? -30;
    const day = this.bodies.length ? clamp((sunAlt + 12) / 18, 0, 1) * v.bodies : 0;

    // Night, the ground beyond the horizon, and the dome.
    ctx.fillStyle = "#0b0507"; ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(L.cx, L.cy, L.R * 0.1, L.cx, L.cy, L.R * 1.05);
    g.addColorStop(0, `rgba(${Math.round(lerp(26, 46, day))},${Math.round(lerp(12, 38, day))},${Math.round(lerp(22, 66, day))},1)`);
    g.addColorStop(1, `rgba(${Math.round(lerp(34, 84, day))},${Math.round(lerp(14, 42, day))},${Math.round(lerp(24, 54, day))},1)`);
    ctx.save(); ctx.beginPath(); ctx.arc(L.cx, L.cy, L.R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ctx.clip();

    const starFade = 1 - 0.82 * day;
    // Milky Way
    ctx.globalAlpha = 0.9 * starFade;
    this.mw.forEach((rings, lvl) => {
      ctx.beginPath();
      for (const ring of rings) {
        let first = true;
        for (const p of ring) { const q = this.hz(p, sL, cL, sP, cP); const [x, y] = this.proj(q, L); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }
        ctx.closePath();
      }
      ctx.fillStyle = `rgba(243,226,214,${0.022 + lvl * 0.008})`; ctx.fill("evenodd");
    });
    ctx.globalAlpha = 1;

    // Constellation figures
    if (v.lines > 0.01) {
      ctx.strokeStyle = `rgba(214,168,92,${0.34 * v.lines * starFade})`; ctx.lineWidth = 0.8; ctx.beginPath();
      for (const seg of this.lines) {
        let prev = null;
        for (const p of seg) {
          const q = this.hz(p, sL, cL, sP, cP); const pt = this.proj(q, L);
          if (prev && (q.sinAlt > -0.05 || prev.q.sinAlt > -0.05)) { ctx.moveTo(prev.pt[0], prev.pt[1]); ctx.lineTo(pt[0], pt[1]); }
          prev = { q, pt };
        }
      }
      ctx.stroke();
    }
    // Ecliptic, the Sun's road, with the twelve signs.
    if (v.ecl > 0.01) {
      ctx.setLineDash([3, 6]); ctx.strokeStyle = `rgba(214,168,92,${0.5 * v.ecl})`; ctx.lineWidth = 1; ctx.beginPath();
      let prev = null;
      for (const e of this.ecliptic) { const q = this.hz(e.p, sL, cL, sP, cP); const pt = this.proj(q, L); if (prev && (q.sinAlt > -0.1 || prev.sinAlt > -0.1)) { ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt[0], pt[1]); } prev = { x: pt[0], y: pt[1], sinAlt: q.sinAlt }; }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.font = "15px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = `rgba(214,168,92,${0.75 * v.ecl})`;
      for (const e of this.ecliptic) if (e.l % 30 === 16) { const q = this.hz(e.p, sL, cL, sP, cP); if (q.sinAlt > 0.02) { const [x, y] = this.proj(q, L); ctx.fillText(SIGN_GLYPH[Math.floor(e.l / 30)] + "︎", x, y - 10); } }
    }
    // Stars
    for (const s of this.stars) {
      const q = this.hz(s.p, sL, cL, sP, cP); if (q.sinAlt < -0.01) continue;
      const [x, y] = this.proj(q, L);
      const tw = s.mag < 3 && !REDUCED ? 0.82 + 0.18 * Math.sin(time * (1.3 + s.tw * 2.4) + s.tw * 40) : 1;
      const ext = clamp(q.sinAlt * 6, 0.25, 1); // a little extinction near the horizon
      const a = clamp(1.15 - s.mag * 0.16, 0.18, 1) * tw * ext * starFade;
      const r = s.size * (L.R / 420) ** 0.35;
      if (s.mag < 1.6) { ctx.fillStyle = `rgba(${s.col},${a * 0.18})`; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 7); ctx.fill(); }
      ctx.fillStyle = `rgba(${s.col},${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    // Bright star names
    if (v.labels > 0.01) {
      ctx.font = "11px Newsreader, Georgia, serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = `rgba(185,162,157,${0.75 * v.labels * starFade})`;
      for (const s of this.named) { if (s.mag > 1.6) continue; const q = this.hz(s.p, sL, cL, sP, cP); if (q.sinAlt < 0.06) continue; const [x, y] = this.proj(q, L); ctx.fillText(s.name, x + 6, y + 1); }
    }
    // Sun, Moon and planets
    if (v.bodies > 0.01 && this.bodies.length) {
      const pos = {};
      for (const b of this.bodies) { const q = this.hz(b.p, sL, cL, sP, cP); pos[b.name] = { q, pt: this.proj(q, L) }; }
      for (const b of this.bodies) {
        const { q, pt } = pos[b.name]; if (q.sinAlt < -0.02) continue;
        const [x, y] = pt; ctx.globalAlpha = v.bodies;
        if (b.name === "Sun") {
          const gg = ctx.createRadialGradient(x, y, 0, x, y, 46); gg.addColorStop(0, "rgba(255,240,200,.95)"); gg.addColorStop(0.18, "rgba(246,196,94,.75)"); gg.addColorStop(1, "rgba(246,196,94,0)");
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, 46, 0, 7); ctx.fill();
        } else if (b.name === "Moon") {
          this.drawMoon(x, y, 9, pos.Sun ? pos.Sun.pt : null);
        } else {
          const r = clamp(3.4 - (b.mag ?? 1) * 0.5, 1.8, 4.2);
          ctx.fillStyle = "rgba(255,236,200,.35)"; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, 7); ctx.fill();
          ctx.fillStyle = "#fff1d6"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // Labels placed so they never sit on top of each other or the rising label
      if (v.bodies > 0.6) {
        ctx.globalAlpha = v.bodies;
        const boxes = [];
        const inside = (px, py) => Math.hypot(px - L.cx, py - L.cy) < L.R - 2;
        const hit = (r) => !inside(r.x, r.y) || !inside(r.x + r.w, r.y) || !inside(r.x, r.y + r.h) || !inside(r.x + r.w, r.y + r.h) || boxes.some((o) => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y);
        if (this.asc && v.horizon > 0.01) {
          const q = this.hz(this.asc.p, sL, cL, sP, cP); const [ax, ay] = this.proj(q, L);
          ctx.font = "12px Marcellus, serif"; const lw = ctx.measureText(`${this.asc.sign} rising`).width;
          boxes.push(ax - 12 - lw < 6 ? { x: ax + 8, y: ay + 9, w: lw + 4, h: 18 } : { x: ax - 14 - lw, y: ay + 7, w: lw + 4, h: 18 });
          boxes.push({ x: ax - 6, y: ay - 6, w: 12, h: 12 });
        }
        const vis = this.bodies.filter((b) => pos[b.name].q.sinAlt >= -0.02);
        for (const b of vis) { const [x, y] = pos[b.name].pt; boxes.push({ x: x - 7, y: y - 7, w: 14, h: 14 }); }
        const order = [...vis].sort((a, b) => (a.name === "Sun" ? -2 : a.name === "Moon" ? -1 : 0) - (b.name === "Sun" ? -2 : b.name === "Moon" ? -1 : 0));
        ctx.font = "13px Marcellus, serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "rgba(214,168,92,.95)";
        for (const b of order) {
          const [x, y] = pos[b.name].pt; const w = ctx.measureText(b.name).width, d = b.name === "Sun" ? 14 : 12;
          const cands = [[d, -10], [d, 10], [-d - w, -10], [-d - w, 10], [-w / 2, -22], [-w / 2, 22], [d, -26], [d, 26], [-d - w, -26], [-d - w, 26]];
          let pick = cands[0];
          for (const c of cands) { const r = { x: x + c[0] - 2, y: y + c[1] - 8, w: w + 4, h: 16 }; if (!hit(r)) { pick = c; break; } }
          boxes.push({ x: x + pick[0] - 2, y: y + pick[1] - 8, w: w + 4, h: 16 });
          ctx.fillText(b.name, x + pick[0], y + pick[1]);
        }
        ctx.globalAlpha = 1;
      }
      // Focus ring
      const f = this.focus && pos[this.focus];
      if (f && f.q.sinAlt > -0.02) this.ring(f.pt[0], f.pt[1], time);
    }
    ctx.restore();

    // Horizon, cardinal points, and the rising point
    if (v.horizon > 0.01) {
      ctx.globalAlpha = v.horizon;
      ctx.strokeStyle = "rgba(214,168,92,.55)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(L.cx, L.cy, L.R, 0, 7); ctx.stroke();
      ctx.strokeStyle = "rgba(214,168,92,.12)"; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(L.cx, L.cy, L.R + 6, 0, 7); ctx.stroke();
      ctx.font = "13px Marcellus, serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "rgba(243,232,215,.8)";
      const off = L.R + 20;
      [["N", 0, -1], ["S", 0, 1], ["E", -1, 0], ["W", 1, 0]].forEach(([t, dx, dy]) => ctx.fillText(t, L.cx + dx * off, L.cy + dy * off));
      if (this.asc) {
        const q = this.hz(this.asc.p, sL, cL, sP, cP); const [x, y] = this.proj(q, L);
        ctx.fillStyle = "#f6c45e"; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
        if (this.focus === "east") this.ring(x, y, time);
        ctx.font = "12px Marcellus, serif"; ctx.fillStyle = "rgba(246,196,94,.95)";
        const lw = ctx.measureText(`${this.asc.sign} rising`).width;
        if (x - 12 - lw < 6) { ctx.textAlign = "left"; ctx.fillText(`${this.asc.sign} rising`, x + 10, y + 18); } else { ctx.textAlign = "right"; ctx.fillText(`${this.asc.sign} rising`, x - 12, y + 16); }
      }
      ctx.globalAlpha = 1;
    }
    if (v.dim < 1) { ctx.fillStyle = `rgba(11,5,7,${1 - v.dim})`; ctx.fillRect(0, 0, w, h); }
  }
  ring(x, y, time) {
    const { ctx } = this, p = REDUCED ? 0.5 : (Math.sin(time * 2.2) + 1) / 2;
    ctx.strokeStyle = `rgba(246,196,94,${0.5 + 0.4 * p})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 20 + p * 6, 0, 7); ctx.stroke();
  }
  drawMoon(x, y, r, sunPt) {
    const { ctx } = this;
    const phase = ((this.moonAngle % 360) + 360) % 360; // 0 new, 180 full
    const k = Math.cos(phase * D2R); // terminator ellipse: 1 at new, -1 at full
    let rot = 0;
    if (sunPt) rot = Math.atan2(sunPt[1] - y, sunPt[0] - x); // lit side faces the Sun
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const halo = ctx.createRadialGradient(0, 0, r, 0, 0, r * 3.4); halo.addColorStop(0, "rgba(243,232,215,.22)"); halo.addColorStop(1, "rgba(243,232,215,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, r * 3.4, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(60,40,44,.9)"; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.fillStyle = "#f3e8d7"; ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);            // lit half faces +x (toward the Sun)
    ctx.ellipse(0, 0, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0);
    ctx.fill(); ctx.restore();
  }
}

/* ================= What AMY says ================= */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SIGN = {
  Aries: "the first fire: courage, initiative, the one who goes first",
  Taurus: "the garden: steadiness, the senses, loyalty, building what lasts",
  Gemini: "the messenger: curiosity, words, a mind always in conversation",
  Cancer: "the home: feeling, memory, family, a protective shell around a tender heart",
  Leo: "the heart of the Sun: warmth, creativity, generosity, the need to shine and be seen",
  Virgo: "the healer's hands: service, discernment, devotion to getting it right",
  Libra: "the scales: beauty, fairness, partnership, the search for balance",
  Scorpio: "the deep water: intensity, loyalty, transformation, seeing what others hide",
  Sagittarius: "the arrow: faith, truth, travel, the hunger for meaning",
  Capricorn: "the mountain: discipline, ambition, the long climb that becomes a legacy",
  Aquarius: "the water bearer: vision, freedom, friendship, the future",
  Pisces: "the ocean: compassion, dreams, the thin veil between this world and the next",
};
const WEEKDAY_TEXT = {
  Sun: "Sunday belongs to the Sun. Tradition says Sunday souls carry light: vitality, presence, a quiet authority.",
  Moon: "Monday belongs to the Moon. Tradition says Monday souls feel things first, with intuition, memory and care.",
  Mars: "Tuesday belongs to Mars. Tradition says Tuesday souls are protectors and starters, given courage.",
  Mercury: "Wednesday belongs to Mercury, the messenger. Tradition says Wednesday souls carry words, ideas and bridges between people.",
  Jupiter: "Thursday belongs to Jupiter, the great teacher. Tradition says Thursday souls carry faith and wisdom.",
  Venus: "Friday belongs to Venus. Tradition says Friday souls are here for love, beauty and harmony.",
  Saturn: "Saturday belongs to Saturn, the keeper of time. Tradition says Saturday souls are patient and enduring, here to master something over a lifetime.",
};
const PLANET_WORD = { Sun: "light and leadership", Moon: "feeling and intuition", Mars: "courage and action", Mercury: "words and understanding", Jupiter: "wisdom, faith and good fortune", Venus: "love and beauty", Saturn: "patience and mastery" };
const PHASE_TEXT = {
  "New Moon": "You were born at the New Moon, the dark start of the cycle. Yours is a soul of beginnings, here to start something that has not existed before.",
  "Waxing Crescent": "A young crescent, the first light pushing out of the dark. Crescent souls carry the courage to grow past where they came from.",
  "First Quarter": "A half Moon, growing. First Quarter souls are builders who meet resistance and push through it. Challenge sharpens you.",
  "Waxing Gibbous": "A Moon nearly full and still growing. These souls are refiners and seekers, always asking what more is possible.",
  "Full Moon": "The Full Moon, the sky fully lit. Full Moon souls are here to be seen and to see others clearly. Relationships are your mirror.",
  "Waning Gibbous": "Just past full, the light beginning to be given away. These souls are natural teachers who share what they have learned.",
  "Last Quarter": "A half Moon, fading. Last Quarter souls are here to turn and release old ways, often the one in a family who breaks a pattern.",
  "Waning Crescent": "The last sliver before the dark, the balsamic Moon. Souls born here are often old souls finishing a long cycle: wise, mystical, a little out of time.",
};
const RETRO_TEXT = {
  Mercury: "your mind works inward first. You think before you speak, you revisit, and you see what others missed",
  Venus: "love is something you remember more than learn. Old loves and old values come back to be healed",
  Mars: "your fire burns inward. You fight best after you have faced yourself",
  Jupiter: "your faith is found inside rather than handed to you",
  Saturn: "you carry lessons from before. You set your own rules and master them alone",
};
const NAK_TEXT = {
  Ashwini: "the horse's head, ruled by the divine healers. Swift beginnings and the gift of healing",
  Bharani: "the womb, ruled by Yama. You carry life through its great transformations",
  Krittika: "the blade of flame, ruled by Agni. Purifying fire and sharp truth",
  Rohini: "the chariot, the Moon's favorite star. Beauty, growth, magnetism and fertile ground",
  Mrigashira: "the deer's head, ruled by Soma. The gentle seeker, always searching",
  Ardra: "the teardrop, ruled by Rudra. Storms that clear the air and renewal through tears",
  Punarvasu: "the quiver, ruled by Aditi, mother of the gods. The return of the light, always finding home",
  Pushya: "the flower that nourishes, ruled by Brihaspati. The most auspicious of the birth stars: devotion and care",
  Ashlesha: "the coiled serpent. Mystic insight, deep perception and the power of the kundalini",
  Magha: "the throne, ruled by the ancestors. Lineage, dignity and the strength of those who came before you",
  "Purva Phalguni": "the front of the bed, ruled by Bhaga. Pleasure, rest, love and creativity",
  "Uttara Phalguni": "the back of the bed, ruled by Aryaman. Loyal partnership, kindness and keeping your word",
  Hasta: "the hand, ruled by Savitar. Skill in the hands, craft and a healing touch",
  Chitra: "the bright jewel, ruled by the divine architect. Beauty, design and making things shine",
  Swati: "the young shoot in the wind, ruled by Vayu. Independence, movement and grace in change",
  Vishakha: "the arch of triumph, ruled by Indra and Agni. Determination and the goal reached",
  Anuradha: "the lotus, ruled by Mitra. Friendship, devotion and blossoming far from home",
  Jyeshtha: "the eldest, ruled by Indra. The protector who carries responsibility for others",
  Mula: "the root, ruled by Nirriti. Getting to the root of things and finding truth",
  "Purva Ashadha": "the fan, ruled by the waters. Invincibility and purification",
  "Uttara Ashadha": "the elephant's tusk, ruled by the universal gods. The final victory and unshakable integrity",
  Shravana: "the ear, ruled by Vishnu. Listening, learning and sacred hearing",
  Dhanishta: "the drum, ruled by the Vasus. Rhythm, music and abundance",
  Shatabhisha: "the hundred healers, ruled by Varuna. Healing, mystery and the power of solitude",
  "Purva Bhadrapada": "the front of the funeral cot. Fiery transformation, intensity, a soul burning through to the truth",
  "Uttara Bhadrapada": "the serpent of the deep. Depth, calm wisdom and the stillness of the ocean floor",
  Revati: "the fish, ruled by Pushan, the shepherd. Safe journeys, completion and guiding others home",
};
const NUM = (n) => AMYLib.Numbers.meaningOf(n);
const numText = (n) => { const m = NUM(n); return `${m.title}, ${m.gift}`; };
const fmtTime = (iso, zone) => { try { return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: zone }).format(new Date(iso)); } catch (e) { return ""; } };
const fmtDate = (s) => { const [y, m, d] = s.split("-").map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };
const andList = (a) => (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);
const article = (w) => (/^[AEIOU]/.test(w) ? "an" : "a");
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
const reducePlain = (n) => { while (n > 9) n = String(n).split("").reduce((s, d) => s + +d, 0); return n; };

/* ================= Portal flow ================= */
const AMYPortal = (() => {
  let sky = null, defaultLng = -(new Date().getTimezoneOffset() / 60) * 15, defaultLat = 35;
  const P = { reading: null, place: null, time: null, date: null, name: null, facts: [] };
  const el = (id) => document.getElementById(id);

  function shouldShow() {
    try { if (sessionStorage.getItem("amy_portal_skip")) return false; } catch (e) { /* ignore */ }
    // A first visit opens under the stars: the sky, the signs, who they were. Anyone can step straight into conversation instead.
    return !S.p.birthDate && !(S.messages || []).some((m) => m.role === "user");
  }
  async function ensureSky() {
    if (sky) return sky;
    sky = new SkyCanvas(el("sky"));
    try { await sky.load("sky.json"); } catch (e) { console.warn("[amy] sky data failed", e); }
    return sky;
  }
  /** Their own sky behind everything, once known. */
  async function background() {
    const s = await ensureSky();
    document.body.classList.add("has-sky");
    const r = S.birth;
    if (r && S.p.birthPlace) {
      const bp = S.p.birthPlace;
      s.setBodies(L.Birth.skyBodies(new Date(r.instant), bp.lat, bp.lng));
      s.view = { ...s.view, lst: L.Birth.skyBodies(new Date(r.instant), bp.lat, bp.lng).gast + bp.lng, lat: bp.lat, bodies: 0.3, lines: 0.5, labels: 0, horizon: 0, ecl: 0, dome: 0, dim: 0.42 };
    } else {
      s.setBodies(L.Birth.skyBodies(new Date(), defaultLat, defaultLng));
      s.view = { ...s.view, lst: L.Birth.skyBodies(new Date(), defaultLat, defaultLng).gast + defaultLng, lat: defaultLat, bodies: 0.3, dome: 0, dim: 0.42 };
    }
    s.drift = 0.12;
  }

  /* ---- AMY in the corner ---- */
  function level(n) { const d = el("amyDock"); d.className = "amy-dock lvl" + n; }
  function say(text, opts = {}) {
    const line = el("amyLine");
    line.classList.remove("in"); void line.offsetWidth;
    line.textContent = text; line.classList.add("in");
    if (S.voiceOn && caps.tts && !opts.silent) speak(text);
  }
  function showCard(c) {
    const box = el("amyReveal");
    if (!c) { box.innerHTML = ""; box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = c.html || `<div class="eyebrow">${esc(c.eyebrow)}</div><div class="rv-big">${esc(c.big)}</div>${c.sub ? `<div class="rv-sub">${esc(c.sub)}</div>` : ""}`;
    box.classList.remove("in"); void box.offsetWidth; box.classList.add("in");
  }
  function addFact(label, value) {
    P.facts.push([label, value]);
    const r = P.reading, fresh = [];
    const D = (k, v) => { try { setDiscovery(k, v); fresh.push(k); } catch (e) { /* ignore */ } };
    if (label === "Born on") D("birth_day", `${r.weekday} (${r.weekdayRuler})`);
    else if (label === "Moon at birth") D("birth_moon", value);
    else if (label === "Sun") D("sun_sign", value);
    else if (label === "Rising") D("rising_sign", value);
    else if (label === "Vedic Sun") { D("vedic_sun", `${r.sun.sidereal} (${r.sun.siderealWestern})`); if (r.timeKnown) D("rashi", r.moon.rashi); }
    else if (label === "Birth star") D("nakshatra", r.timeKnown ? `${r.moon.nakshatra}, pada ${r.moon.pada}` : value);
    else if (label === "Birthday number") D("birthday_number", value);
    else if (label === "Awakening") D("awakening", value);
    else if (label === "Saturn return") D("saturn_return", value);
    else if (label === "Name") { /* set in onName */ fresh.push("name_number", "soul_urge"); }
    renderPuzzle(fresh);
  }
  function renderPuzzle(fresh = []) {
    P.added = [...new Set([...(P.added || []), ...fresh])];
  }
  function persistPinnacle(r) {
    const age = ageOn(r.date), pin = (r.numbers.pinnacles || []).find((x) => age >= x.fromAge && (x.toAge == null || age < x.toAge));
    if (pin) try { setDiscovery("pinnacle", `${AMYLib.Numbers.numberLabel(pin.number)} ${AMYLib.Numbers.meaningOf(pin.number).title}, from ${pin.fromAge}`); } catch (e) { /* ignore */ }
  }
  function ask(nodes) { const a = el("amyAsk"); a.innerHTML = ""; (Array.isArray(nodes) ? nodes : [nodes]).forEach((n) => a.appendChild(n)); const first = a.querySelector("input"); if (first && innerWidth > 760) setTimeout(() => first.focus(), 60); }
  function button(label, onClick, solid) { const b = document.createElement("button"); b.type = "button"; b.className = "btn" + (solid ? " solid" : ""); b.textContent = label; b.onclick = onClick; return b; }
  const nextButton = (label = "Continue") => new Promise((res) => ask(button(label, () => res(), true)));

  /** Play a sequence of reveals: each sets the sky, shows a card, AMY speaks, then waits for Continue. */
  async function reveal(items) {
    for (const it of items) {
      if (!it) continue;
      if (it.sky) await it.sky();
      sky.focus = it.focus || null;
      showCard(it.card);
      say(it.text);
      if (it.fact) addFact(it.fact[0], it.fact[1]);
      await nextButton(it.next || "Continue");
    }
    sky.focus = null;
  }

  /* ---- Steps ---- */
  async function open(skyFirst) {
    await ensureSky();
    document.body.classList.add("has-sky", "in-portal");
    el("portal").hidden = false; el("app").hidden = true;
    sky.setBodies(L.Birth.skyBodies(new Date(), defaultLat, defaultLng));
    sky.view = { ...sky.view, lst: L.Birth.skyBodies(new Date(), defaultLat, defaultLng).gast + defaultLng, lat: defaultLat, bodies: 0, lines: 0, labels: 0, horizon: 0, ecl: 0, dome: 0, dim: 1 };
    sky.drift = 0.35;
    el("portalFace").src = portraitURL || "portrait.jpg";
    level(1);
    showCard(null);
    P.question = null; P.facts = [];
    renderPuzzle();
    P.added = [];
    say("Every soul arrives under a sky that will never look exactly that way again. Let me show you yours, and what the old traditions say it means about who you are.", { silent: true });
    if (S.p.birthDate) { const d = S.p.birthDate; P.date = d; setTimeout(() => onDate(d), 0); return; }
    askDate();
  }

  function askQuestion() {
    const form = document.createElement("form"); form.className = "ask-col";
    form.innerHTML = `<label class="sr" for="pQ">Your question for AMY</label><textarea id="pQ" rows="2" maxlength="600" placeholder="Ask me your…" required></textarea>
      <div class="ask-row"><button class="btn solid">Ask AMY</button><button type="button" class="linkbtn" id="pSkyFirst">Just show me my sky</button></div>
      <div class="ask-row starters-row"></div>`;
    const ta = form.querySelector("textarea");
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    [["Love", "I want to ask about love."], ["Money and work", "I want to ask about money and my work."], ["My purpose", "What is my purpose?"], ["Something I'm carrying", "There is something I am carrying and I need guidance."]].forEach(([l, q]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = l; b.onclick = () => { ta.value = q; form.requestSubmit(); }; form.querySelector(".starters-row").appendChild(b);
    });
    form.onsubmit = (e) => { e.preventDefault(); const q = ta.value.trim(); if (q.length > 1) onQuestion(q); };
    form.querySelector("#pSkyFirst").onclick = () => { P.question = null; say("Every soul arrives under a sky that will never look exactly that way again. Let me show you yours.", { silent: true }); askDate(); };
    ask(form);
  }

  function exitToChat(text) {
    el("portal").hidden = true; el("app").hidden = false; document.body.classList.remove("in-portal");
    background(); showConversation();
    if (text) send(text);
  }

  async function onQuestion(q) {
    // Safety first: a crisis or a child goes straight to AMY's full care, never into a reading.
    let flags = []; try { flags = L.screen(q); } catch (e) { /* ignore */ }
    if (flags.includes("self_harm") || flags.includes("violence")) return exitToChat(q);
    if (flags.includes("minor")) { S.p.isAdult = false; save(); return exitToChat(q); }
    P.question = q;
    ask([]);
    showCard({ eyebrow: "You asked", big: q.length > 90 ? q.slice(0, 88) + "…" : q });
    el("amyReveal").classList.add("quote");
    say("…", { silent: true });
    const fallback = "That matters, and I want to give you a real answer, not a guess. May I see the sky you were born under first? Your birth date, place and time tell me a great deal about how you move through something like this.";
    let ack = fallback;
    await capsReady;
    if (caps.sample) {
      try {
        const prompt = `You are AMY, a warm spiritual guide. Someone just asked you: "${q.replace(/"/g, "'")}"\nReply in two short sentences. First, acknowledge what they asked with warmth and specificity, without answering it and without predicting anything. Second, ask whether you may first see the sky they were born under (their birth date, place and time) so you can give them an informed answer rather than a guess. Speak to them as "you". No em dashes. No lists.`;
        const res = await Promise.race([caps.sample([{ role: "user", content: prompt }], { cache: false, modelTier: "default" }), sleep(8000).then(() => null)]);
        const t = res && res.text && res.text.trim();
        if (t && t.length > 30 && t.length < 500) ack = t.replace(/\u2014/g, ", ");
      } catch (e) { /* fallback */ }
    }
    say(ack);
    ask([button("Yes, show me", () => { el("amyReveal").classList.remove("quote"); showCard(null); askDate(); }, true), button("Just answer me", () => exitToChat(q))]);
  }

  function askDate() {
    const form = document.createElement("form"); form.className = "ask-row";
    const today = new Date().toISOString().slice(0, 10);
    form.innerHTML = `<label class="ask-label" for="pDate">When were you born?</label><input id="pDate" type="date" min="1900-01-01" max="${today}" required><button class="btn solid">Show me</button><p class="err" hidden></p>`;
    form.onsubmit = (e) => {
      e.preventDefault();
      const v = form.querySelector("input").value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v > today || v < "1900-01-01") { const er = form.querySelector(".err"); er.textContent = "Choose your birth date."; er.hidden = false; return; }
      onDate(v);
    };
    ask(form);
  }

  function ageOn(date) { const [y, m, d] = date.split("-").map(Number); const n = new Date(); let a = n.getFullYear() - y; if (n.getMonth() + 1 < m || (n.getMonth() + 1 === m && n.getDate() < d)) a--; return a; }

  async function onDate(date) {
    P.date = date;
    const age = ageOn(date);
    S.p.isAdult = age >= 18;
    if (!S.p.isAdult) return minorPath(date);
    S.p.birthDate = date; save();
    const r = L.Birth.birthReading({ date, fallbackZone: BROWSER_TZ });
    P.reading = r;
    ask([]);
    say("Hold on. Let me take you back.", { silent: true });
    // The night of their birth, spun back through every year since.
    const night = eveningWithMoon(date, BROWSER_TZ, defaultLat, defaultLng);
    const sb = L.Birth.skyBodies(night, defaultLat, defaultLng);
    sky.setBodies(sb);
    const years = Math.max(1, new Date().getFullYear() - +date.slice(0, 4));
    await sky.animateTo({ lst: sb.gast + defaultLng, bodies: 1, lines: 0.25 }, 3600 + Math.min(2400, years * 40), Math.min(6, 2 + Math.floor(years / 12)));
    level(2);
    const ph = r.moonPhase;
    await reveal([
      { card: { eyebrow: "Tradition of planetary days · The day you arrived", big: `${r.weekday}, ${fmtDate(date)}`, sub: `${r.weekdayRuler}'s day` }, text: WEEKDAY_TEXT[r.weekdayRuler], fact: ["Born on", `${r.weekday}, ${r.weekdayRuler}'s day`] },
      { focus: sky.bodyAlt("Moon") > 0 ? "Moon" : null, card: { eyebrow: "Astronomy · The Moon that night", big: ph.name, sub: `${Math.max(0, Math.round(ph.ageDays))} days into the cycle · ${Math.round(ph.illumination * 100)}% lit` }, text: "In astrology the Moon's phase at birth is read as a temperament. " + PHASE_TEXT[ph.name], fact: ["Moon at birth", ph.name] },
      { card: { eyebrow: "Western astrology (tropical) · The Sun", big: r.sun.cusp ? `Between ${r.sun.tropical} and the next sign` : r.sun.tropical, sub: "in the Western zodiac" },
        text: (r.sun.cusp ? "The Sun was changing signs the day you were born, so the hour will settle it. " : "") + `In the Western zodiac the Sun stood in ${r.sun.tropical}, which astrologers associate with ${SIGN[r.sun.tropical]}. The older Vedic zodiac counts it a little differently; I'll show you that too.`,
        fact: ["Sun", r.sun.tropical] },
    ]);
    if (S.p.birthPlace) return onPlace(S.p.birthPlace);
    askPlace();
  }

  /** The first dark hour of the birth night when the Moon is up, so AMY can point to her; otherwise 11 pm. */
  function eveningWithMoon(date, zone, lat, lng) {
    const alt = (sb, name) => {
      const b = sb.bodies.find((x) => x.name === name), H = (sb.gast + lng - b.ra) * D2R, d = b.dec * D2R, f = lat * D2R;
      return Math.asin(Math.sin(d) * Math.sin(f) + Math.cos(d) * Math.cos(f) * Math.cos(H)) / D2R;
    };
    const base = luxonLike(date, "18:00", zone).getTime();
    for (let h = 0; h <= 11; h++) {
      const t = new Date(base + h * 3600e3), sb = L.Birth.skyBodies(t, lat, lng);
      if (alt(sb, "Sun") < -10 && alt(sb, "Moon") > 12) return t;
    }
    return new Date(base + 5 * 3600e3);
  }
  function caption(place, r) {
    const c = el("skyCaption"); if (!c) return;
    const lat = `${Math.abs(place.lat).toFixed(2)}°${place.lat >= 0 ? "N" : "S"}`, lng = `${Math.abs(place.lng).toFixed(2)}°${place.lng >= 0 ? "E" : "W"}`;
    const when = r ? (r.timeKnown ? `${fmtDate(P.date)}, ${fmtTime(r.instant, place.tz)} local time` : `${fmtDate(P.date)}, time unknown: shown at noon, rising sign not shown`) : `${fmtDate(P.date)}, evening`;
    c.innerHTML = `<b>${esc(place.name)}</b> · ${lat} ${lng} · ${esc(when)}<br>Real star positions (Hipparcos catalog). Sun, Moon and planets computed and checked against Swiss Ephemeris. Signs: Western tropical and Vedic sidereal (Lahiri), labeled on each card.`;
    c.hidden = false;
  }
  function luxonLike(date, time, zone) {
    // Local wall time in an IANA zone to a Date, via the library's tested conversion.
    try { return new Date(L.Birth.birthReading({ date, time, place: { lat: 0, lng: 0, tz: zone } }).instant); } catch (e) { return new Date(date + "T" + time + ":00"); }
  }

  function askPlace() {
    const wrap = document.createElement("div"); wrap.className = "ask-col";
    wrap.innerHTML = `<div class="ask-label">Where on Earth did you arrive?</div>`;
    wrap.appendChild(cityPicker((c) => onPlace(c)));
    say("Now, where on Earth did you arrive? The city you were born in sets your horizon.", { silent: true });
    ask(wrap);
  }

  async function onPlace(place) {
    P.place = place; S.p.birthPlace = place; save();
    ask([]);
    const r = L.Birth.birthReading({ date: P.date, place });
    P.reading = r;
    const night = eveningWithMoon(P.date, place.tz, place.lat, place.lng);
    const sb = L.Birth.skyBodies(night, place.lat, place.lng);
    sky.setBodies(sb);
    say(`Turning the sky over ${place.name}.`, { silent: true });
    await sky.animateTo({ lst: sb.gast + place.lng, lat: place.lat, dome: 1, horizon: 1, lines: 0.6, labels: 1 }, 3200, 1);
    caption(place, null);
    sky.drift = 0.05;
    level(3);
    const up = sb.bodies.filter((b) => b.name !== "Sun" && sky.bodyAlt(b.name) > 0).map((b) => (b.name === "Moon" ? "the Moon" : b.name));
    const rise = r.sunrise ? fmtTime(r.sunrise, place.tz) : null, set = r.sunset ? fmtTime(r.sunset, place.tz) : null;
    await reveal([
      { card: { eyebrow: "Over " + place.name, big: "The night you were born", sub: rise && set ? `Sunrise ${rise} · sunset ${set}` : place.country },
        text: `This is the sky over ${place.name} on the night of ${fmtDate(P.date)}, at ${fmtTime(night.toISOString(), place.tz)}. North is at the top, and east, where everything rises, is on the left.` + (up.length ? ` ${andList(up).replace(/^the/, "The")} ${up.length > 1 ? "were" : "was"} up that night.` : ""),
        fact: ["Born in", place.name] },
    ]);
    if (S.p.birthTime) return onTime(S.p.birthTime);
    askTime();
  }

  function askTime() {
    const form = document.createElement("form"); form.className = "ask-row";
    form.innerHTML = `<label class="ask-label" for="pTime">What time were you born?</label><input id="pTime" type="time" required><button class="btn solid">Turn the sky</button>`;
    form.onsubmit = (e) => { e.preventDefault(); const v = form.querySelector("input").value; if (/^\d{2}:\d{2}$/.test(v)) onTime(v); };
    form.appendChild(button("I don't know", () => onTime(null)));
    say("And the time? Even a guess helps. The hour decides your rising sign and exactly where your Moon sat.", { silent: true });
    ask(form);
  }

  async function onTime(time) {
    P.time = time; S.p.birthTime = time; save();
    ask([]);
    const place = P.place;
    const r = L.Birth.birthReading({ date: P.date, time, place });
    P.reading = r; S.birth = r; save();
    const inst = new Date(r.instant);
    const sb = L.Birth.skyBodies(inst, place.lat, place.lng);
    sky.setBodies(sb);
    sky.setAsc(r.rising ? r.rising.lon : null, r.rising ? r.rising.sign : null);
    say(time ? "Here is the exact moment." : "Then I'll show you the day as the Sun crossed it.", { silent: true });
    await sky.animateTo({ lst: sb.gast + place.lng, ecl: 1 }, 2600, 0);
    caption(place, r);
    level(4);
    const items = [];
    const sunUp = (r.sunAltitude ?? -1) > 0;
    if (time) {
      let t = sunUp ? "You were born in daylight. The stars were still there behind the Sun, exactly where you see them now." : "You were born in the dark, under these stars.";
      if (r.planetaryHour) t += ` In the old tradition of planetary hours, it was the hour of ${r.planetaryHour.ruler}, associated with ${PLANET_WORD[r.planetaryHour.ruler]}.`;
      if (r.vedicWeekday) t += ` In the Vedic reckoning the day begins at sunrise, so by that count you were born on ${r.vedicWeekday}, before the Sun rose on ${r.weekday}.`;
      items.push({ card: { eyebrow: "Astronomy · The moment", big: `${fmtTime(r.instant, place.tz)}, ${r.weekday}`, sub: r.planetaryHour ? `Hour of ${r.planetaryHour.ruler}` : "" }, text: t, fact: r.planetaryHour ? ["Hour of", r.planetaryHour.ruler] : null });
      if (r.rising) items.push({ focus: "east", card: { eyebrow: "Western astrology · Rising on the eastern horizon", big: `${r.rising.sign} rising`, sub: `${Math.floor(r.rising.degree)}° ${r.rising.sign}` }, text: `At that minute ${r.rising.sign} was rising in the east. In Western astrology the rising sign describes how the world first meets you; ${r.rising.sign} is associated with ${SIGN[r.rising.sign]}.`, fact: ["Rising", r.rising.sign] });
      else if (r.dstIssue) items.push({ card: { eyebrow: "Rising sign", big: "Hidden by the clock", sub: "Daylight saving" }, text: "That time fell in a daylight saving change, so the clock can't tell me the exact minute. I'll leave your rising sign open rather than guess." });
    } else {
      items.push({ card: { eyebrow: "Without the hour", big: "The day still speaks", sub: "Your rising sign waits for the hour" }, text: "That's alright. Your Sun and your birth day don't need the hour. If you ever find your birth certificate, I can turn this sky to the exact minute and show you what was rising." });
    }
    // Three lights: Western Sun, Vedic Sun, the Moon and her birth star.
    const moonTxt = r.timeKnown || r.moon.rashiRange[0] === r.moon.rashiRange[1] ? `${r.moon.rashi} (${r.moon.rashiWestern})` : `${r.moon.rashiRange[0]} or ${r.moon.rashiRange[1]}`;
    const nakTxt = r.timeKnown ? r.moon.nakshatra : (r.moon.nakshatraRange[0] === r.moon.nakshatraRange[1] ? r.moon.nakshatraRange[0] : `${r.moon.nakshatraRange[0]} or ${r.moon.nakshatraRange[1]}`);
    const triad = `<div class="eyebrow">Three lights · Western tropical and Vedic sidereal (Lahiri)</div><div class="triad">
      <div><span>Western Sun</span><b>${esc(r.sun.tropical)}</b></div>
      <div><span>Vedic Sun</span><b>${esc(r.sun.sidereal)}</b><i>${esc(r.sun.siderealWestern)}</i></div>
      <div><span>Moon</span><b>${esc(r.timeKnown || r.moon.rashiRange[0] === r.moon.rashiRange[1] ? r.moon.rashi : r.moon.rashiRange.join(" or "))}</b><i>${esc(nakTxt)}</i></div></div>`;
    items.push({ focus: "Moon", card: { html: triad }, text: await triadText(r, moonTxt, nakTxt), fact: ["Vedic Sun", r.sun.sidereal], next: "Continue" });
    if (r.timeKnown || r.moon.nakshatraRange[0] === r.moon.nakshatraRange[1]) {
      const nk = r.moon.nakshatra;
      items.push({ focus: "Moon", card: { eyebrow: "Vedic astrology · Your birth star", big: nk, sub: r.timeKnown ? `Pada ${r.moon.pada}` : "Nakshatra of the Moon" }, text: `In Vedic astrology the Moon moves through twenty seven birth stars, the nakshatras. Yours is ${nk}: tradition describes it as ${NAK_TEXT[nk]}.` + (r.moon.nearBoundary ? " Your Moon sat right at a border, so a few minutes either way could tip it. Trust what resonates." : ""), fact: ["Birth star", nk] });
    }
    await reveal(items);
    persist(r);
    returnToChat(r);
  }

  async function triadText(r, moonTxt, nakTxt) {
    const fallback = `Western astrology places your Sun in ${r.sun.tropical}, associated with ${SIGN[r.sun.tropical]}. The Vedic zodiac, which is measured against the stars themselves, places it in ${r.sun.sidereal} (${r.sun.siderealWestern}), associated with ${SIGN[r.sun.siderealWestern]}.` +
      (r.sun.tropical === r.sun.siderealWestern ? " Here the two systems agree." : " The two systems differ by about 24 degrees, which is why many people have two Sun signs.") +
      ` Vedic astrologers give the Moon special weight; yours sat in ${moonTxt}.`;
    if (!caps.sample) return fallback;
    try {
      const prompt = `You are AMY, a warm spiritual guide who believes in astrology and speaks simply. In 3 short sentences, tell this person what their three lights mean together. Western (tropical) Sun: ${r.sun.tropical}. Vedic (sidereal) Sun: ${r.sun.sidereal} (${r.sun.siderealWestern}). Moon: ${moonTxt}, nakshatra ${nakTxt}. Say what each tradition associates with these placements, attributing every claim ("In Western astrology…", "Vedic astrologers read…"), and never state anything as a fact about the person. End without a question. Speak to them as "you". No em dashes, no lists, no guarantees, no mention of AI.`;
      const res = await Promise.race([caps.sample([{ role: "user", content: prompt }], { cache: false, modelTier: "default" }), sleep(9000).then(() => null)]);
      const t = res && res.text && res.text.trim();
      return t && t.length > 40 ? t.replace(/—/g, ", ") : fallback;
    } catch (e) { return fallback; }
  }

  function persist(r) {
    // Only the sky cluster this experience showed. Numbers and the rest unfold later, one at a time, in conversation.
    const D = (k, v, note) => { try { setDiscovery(k, v, note); } catch (e) { /* ignore */ } };
    D("birth_day", `${r.weekday} (${r.weekdayRuler})`);
    D("birth_moon", r.moonPhase.name);
    D("sun_sign", r.sun.tropical);
    D("vedic_sun", `${r.sun.sidereal} (${r.sun.siderealWestern})`);
    if (r.timeKnown) { D("moon_sign", r.moon.tropical); D("rashi", r.moon.rashi); D("nakshatra", `${r.moon.nakshatra}, pada ${r.moon.pada}`); }
    if (r.rising) D("rising_sign", r.rising.sign);
    S.birth = r; save();
  }


  function askName() {
    const form = document.createElement("form"); form.className = "ask-row";
    form.innerHTML = `<label class="ask-label" for="pName">The name you were given at birth</label><input id="pName" autocomplete="name" placeholder="First, middle and last" maxlength="80" required><button class="btn solid">Continue</button>`;
    form.onsubmit = (e) => { e.preventDefault(); const v = form.querySelector("input").value.trim(); if (v.length > 1) onName(v); };
    form.appendChild(button("Skip", () => handoff()));
    showCard(null);
    say("One more thing, and then I'd like to simply talk with you. Your name carries a vibration too. What name were you given at birth?", { silent: true });
    ask(form);
  }

  async function onName(full) {
    P.name = full;
    S.p.fullName = full; S.p.firstName = S.p.firstName || full.split(/\s+/)[0]; save();
    ask([]);
    const ex = L.Sky.nameNumber(full), su = L.Sky.soulUrge(full);
    try { setDiscovery("name_number", AMYLib.Numbers.numberLabel(ex)); setDiscovery("soul_urge", AMYLib.Numbers.numberLabel(su)); } catch (e) { /* ignore */ }
    await reveal([{ card: { eyebrow: "Your name", big: `Expression ${AMYLib.Numbers.numberLabel(ex)} · Soul urge ${AMYLib.Numbers.numberLabel(su)}`, sub: full },
      text: `${S.p.firstName}, the letters of your full name add to ${AMYLib.Numbers.numberLabel(ex)}, ${numText(ex)}. The vowels alone, the heart of the name, add to ${AMYLib.Numbers.numberLabel(su)}, ${numText(su)}.` + ([ex, su].some((x) => AMYLib.Numbers.MASTERS.has(x)) ? " A master number in your name is a calling, not just a trait." : ""), fact: ["Name", `${ex} · ${su}`], next: "Talk with AMY" }]);
    handoff();
  }

  async function handoff() {
    ask([]); showCard(null);
    level(5);
    const r = S.birth || P.reading, nm = S.p.firstName;
    const lines = [];
    if (r) {
      lines.push(`Sun in ${r.sun.tropical}`, `Vedic Sun in ${r.sun.sidereal}`);
      if (r.timeKnown) lines.push(`Moon in ${r.moon.rashi}, ${r.moon.nakshatra}`);
      if (r.rising) lines.push(`${r.rising.sign} rising`);
      lines.push(`born on a ${r.weekday}${r.planetaryHour ? " in the hour of " + r.planetaryHour.ruler : ""}`, `awakening number ${r.numbers.awakening}`);
    }
    say(P.question ? `Thank you${nm ? ", " + nm : ""}. Now I can answer you properly.` : `That's the sky you came through${nm ? ", " + nm : ""}. Now I'd like to meet the soul who chose it.`);
    await Promise.all([sky.animateTo({ dome: 0, horizon: 0, labels: 0, ecl: 0, lines: 0.5, dim: 0.42 }, 2200), sleep(1600)]);
    sky.drift = 0.12; sky.focus = null;
    S.messages.push({ id: uid(), role: "notice", kind: "ai" }); S.lastNotice = Date.now();
    const skyLine = lines.length ? `**Your sky:** ${lines.join(" · ")}.` : "";
    if (P.question) {
      if (skyLine) S.messages.push({ id: uid(), role: "amy", parts: [], text: skyLine });
      S.messages.push({ id: uid(), role: "user", text: P.question });
    } else {
      S.messages.push({ id: uid(), role: "amy", parts: [],
        text: (skyLine ? skyLine + "\n\n" : "") + `That's the sky you came through${nm ? ", " + nm : ""}. Now I'd like to meet the soul who chose it.\n\nWhen you were small, where did you feel most at home?` });
    }
    save();
    el("portal").hidden = true; el("app").hidden = false;
    document.body.classList.remove("in-portal");
    showConversation(); renderThread();
    if (P.question) { S.firstAnswer = true; try { await reply(); } finally { S.firstAnswer = false; save(); } }
    const ci = el("chatInput"); if (ci && innerWidth > 760) ci.focus();
  }

  /** Back to the conversation, where AMY asks what fits and returns to the person's own subject. */
  async function returnToChat(r) {
    ask([]); showCard(null); say("Let's go back to our conversation.", { silent: true });
    await sky.animateTo({ dome: 0, horizon: 0, labels: 0, ecl: 0, lines: 0.5, dim: 0.42, bodies: 0.3 }, 1600);
    sky.drift = 0.12; sky.focus = null; el("skyCaption").hidden = true;
    const bits = [`Western Sun ${r.sun.tropical}`, `Vedic Sun ${r.sun.sidereal} (${r.sun.siderealWestern})`];
    if (r.timeKnown) bits.push(`Moon ${r.moon.rashi}, ${r.moon.nakshatra}`);
    if (r.rising) bits.push(`${r.rising.sign} rising`);
    bits.push(`born on a ${r.weekday}`, /moon$/i.test(r.moonPhase.name) ? r.moonPhase.name : `${r.moonPhase.name} Moon`);
    if (!S.lastNotice || Date.now() - S.lastNotice > 3 * 3600 * 1000) { S.messages.push({ id: uid(), role: "notice", kind: "ai" }); S.lastNotice = Date.now(); }
    S.messages.push({ id: uid(), role: "amy", parts: [], text: `**Your birth sky:** ${bits.join(" · ")}.` });
    S.afterDiscovery = `the birth sky (${bits.join("; ")}).`;
    save();
    el("portal").hidden = true; el("app").hidden = false; document.body.classList.remove("in-portal");
    showConversation(); renderThread();
    (P.added || []).forEach((k) => toastStar(k));
    await reply();
  }

  async function minorPath(date) {
    // AMY is for adults: no readings or stored birth details for under 18s.
    S.p.birthDate = null; save();
    ask([]);
    say("Thank you for telling me. The readings here are made for adults, so I'll keep this simple: the sky the night you were born was beautiful, and it is still turning for you.");
    await nextButton("Talk with AMY");
    el("portal").hidden = true; el("app").hidden = false; document.body.classList.remove("in-portal");
    background();
  }

  function skip() {
    try { sessionStorage.setItem("amy_portal_skip", "1"); } catch (e) { /* ignore */ }
    el("portal").hidden = true; el("app").hidden = false; document.body.classList.remove("in-portal");
    background();
  }

  return { shouldShow, open, skip, background, inProgress: () => !!P.date && !el("portal").hidden, sky: () => sky };
})();
window.AMYPortal = AMYPortal;
