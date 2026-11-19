// Four animated pixel-art stages.
import { drawText } from './font.js';

export const STAGE_NAMES = {
  dojo: 'SUNSET DOJO',
  rooftop: 'NEON ROOFTOP',
  coral: 'CORAL ARENA',
  cosmic: 'COSMIC TEMPLE',
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20261119);

const STARS = Array.from({ length: 90 }, () => ({
  x: Math.floor(rnd() * 480),
  y: Math.floor(rnd() * 170),
  s: rnd() < 0.15 ? 2 : 1,
  p: rnd() * Math.PI * 2,
}));

const PETALS = Array.from({ length: 22 }, () => ({
  x: rnd() * 500, y: rnd() * 260, sp: 0.25 + rnd() * 0.5, ph: rnd() * 6.28, size: 1 + Math.floor(rnd() * 2),
}));

const BUBBLES = Array.from({ length: 26 }, () => ({
  x: rnd() * 480, y: rnd() * 270, sp: 8 + rnd() * 18, r: 1 + rnd() * 2.5, ph: rnd() * 6.28,
}));

const RAIN = Array.from({ length: 44 }, () => ({
  x: rnd() * 500, y: rnd() * 270, sp: 120 + rnd() * 120, len: 4 + rnd() * 7,
}));

const BUILDINGS = (() => {
  const arr = [];
  let x = -10;
  while (x < 490) {
    const w = 28 + Math.floor(rnd() * 40);
    const h = 55 + Math.floor(rnd() * 100);
    const windows = [];
    for (let wy = 12; wy < h - 8; wy += 10) {
      for (let wx = 5; wx < w - 6; wx += 8) {
        if (rnd() < 0.42) windows.push({ x: wx, y: wy, c: rnd() < 0.2 ? '#5ff0ff' : rnd() < 0.5 ? '#ffd75e' : '#ff8a6b', p: rnd() * 6.28 });
      }
    }
    arr.push({ x, w, h, windows });
    x += w + 2 + Math.floor(rnd() * 6);
  }
  return arr;
})();

const CORAL = Array.from({ length: 18 }, (_, i) => ({
  x: 8 + i * 28 + rnd() * 10,
  h: 18 + rnd() * 42,
  type: rnd() < 0.4 ? 'fan' : rnd() < 0.6 ? 'tube' : 'branch',
  hue: rnd(),
}));

const NEBULA = Array.from({ length: 7 }, () => ({
  x: rnd() * 480, y: rnd() * 200, rx: 40 + rnd() * 70, ry: 16 + rnd() * 30,
  c: rnd() < 0.5 ? 'rgba(120,60,200,0.10)' : 'rgba(220,90,160,0.08)',
}));

const MOTE = Array.from({ length: 24 }, () => ({
  x: rnd() * 480, y: 60 + rnd() * 180, sp: 4 + rnd() * 10, ph: rnd() * 6.28, s: rnd() < 0.3 ? 2 : 1,
}));

function grad(ctx, key, stops) {
  if (!ctx.__gradCache) ctx.__gradCache = {};
  if (!ctx.__gradCache[key]) {
    const g = ctx.createLinearGradient(0, 0, 0, 270);
    for (const [p, c] of stops) g.addColorStop(p, c);
    ctx.__gradCache[key] = g;
  }
  return ctx.__gradCache[key];
}

// ---------------------------------------------------------------- dojo

function drawDojo(ctx, t) {
  ctx.fillStyle = grad(ctx, 'dojo', [[0, '#2b1244'], [0.45, '#7a2a5e'], [0.72, '#e0603f'], [1, '#ffb05e']]);
  ctx.fillRect(0, 0, 480, 270);

  // sun
  ctx.fillStyle = 'rgba(255,220,140,0.14)';
  ctx.beginPath(); ctx.arc(356, 112, 56, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(356, 112, 30, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath(); ctx.arc(348, 118, 24, 0, 6.3); ctx.fill();

  // clouds
  const cloud = (x, y, w) => {
    ctx.fillStyle = 'rgba(255,190,160,0.35)';
    ctx.fillRect(x, y, w, 4);
    ctx.fillRect(x + 8, y - 4, w - 20, 4);
    ctx.fillRect(x + 16, y - 7, w - 38, 4);
  };
  cloud(20 + ((t * 3) % 40), 60, 110);
  cloud(250 - ((t * 2) % 30), 44, 90);
  cloud(150 + ((t * 2.4) % 50), 88, 130);

  // mountains
  ctx.fillStyle = '#5b2a55';
  ctx.beginPath();
  ctx.moveTo(0, 200); ctx.lineTo(70, 128); ctx.lineTo(130, 188); ctx.lineTo(210, 116);
  ctx.lineTo(300, 196); ctx.lineTo(370, 140); ctx.lineTo(450, 198); ctx.lineTo(480, 170);
  ctx.lineTo(480, 240); ctx.lineTo(0, 240); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7b3559';
  ctx.beginPath();
  ctx.moveTo(0, 216); ctx.lineTo(90, 176); ctx.lineTo(180, 214); ctx.lineTo(280, 172);
  ctx.lineTo(390, 218); ctx.lineTo(480, 192); ctx.lineTo(480, 250); ctx.lineTo(0, 250); ctx.closePath(); ctx.fill();

  // dojo
  ctx.fillStyle = '#33182c';
  ctx.fillRect(28, 148, 180, 84);
  ctx.fillStyle = '#4b2036';
  ctx.fillRect(36, 156, 164, 76);
  // roof
  ctx.fillStyle = '#241020';
  ctx.beginPath();
  ctx.moveTo(14, 152); ctx.lineTo(60, 118); ctx.lineTo(190, 118); ctx.lineTo(222, 152);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a1a2c';
  ctx.fillRect(52, 124, 128, 8);
  // pillars
  ctx.fillStyle = '#5a2a3a';
  ctx.fillRect(48, 160, 8, 72);
  ctx.fillRect(180, 160, 8, 72);
  // glowing doorway
  ctx.fillStyle = '#ffb05e';
  ctx.fillRect(96, 174, 44, 58);
  ctx.fillStyle = '#ffd79a';
  ctx.fillRect(102, 182, 32, 50);
  ctx.fillStyle = '#7b3559';
  ctx.fillRect(116, 182, 4, 50);
  // window slats
  ctx.fillStyle = '#ffd79a';
  ctx.fillRect(156, 172, 20, 18);
  ctx.fillStyle = '#7b3559';
  for (let i = 0; i < 3; i++) ctx.fillRect(156, 176 + i * 5, 20, 1);

  // torii at right
  ctx.fillStyle = '#8f2f3c';
  ctx.fillRect(404, 150, 10, 86);
  ctx.fillRect(452, 150, 10, 86);
  ctx.fillRect(394, 146, 78, 7);
  ctx.fillRect(402, 158, 62, 5);

  // lanterns
  const lantern = (x, y) => {
    ctx.fillStyle = '#2a1424';
    ctx.fillRect(x, 0, 1, y - 12);
    ctx.fillStyle = '#ff6b4a';
    ctx.fillRect(x - 5, y - 12, 11, 12);
    ctx.fillStyle = '#ffb05e';
    ctx.fillRect(x - 3, y - 10, 7, 8);
    ctx.fillStyle = '#2a1424';
    ctx.fillRect(x - 6, y - 14, 13, 2);
    ctx.fillRect(x - 6, y, 13, 2);
  };
  lantern(70, 54);
  lantern(418, 48);

  // floor
  ctx.fillStyle = '#3a1a24';
  ctx.fillRect(0, 232, 480, 38);
  ctx.fillStyle = '#4b2330';
  ctx.fillRect(0, 232, 480, 6);
  ctx.fillStyle = '#2a1018';
  for (let i = 0; i < 8; i++) ctx.fillRect(i * 64, 238, 1, 32);
  ctx.fillStyle = 'rgba(255,160,90,0.16)';
  ctx.fillRect(0, 238, 480, 2);

  // petals
  for (const p of PETALS) {
    const y = (p.y + t * 12 * p.sp) % 280;
    const x = p.x + Math.sin(t * 0.8 + p.ph) * 14;
    ctx.fillStyle = p.size > 1 ? '#ffb3c7' : '#ff8fa8';
    ctx.fillRect(Math.round(x), Math.round(y), p.size + 1, p.size);
  }
}

// ---------------------------------------------------------------- rooftop

function drawRooftop(ctx, t) {
  ctx.fillStyle = grad(ctx, 'roof', [[0, '#070716'], [0.5, '#141033'], [0.8, '#291a4a'], [1, '#3a2255']]);
  ctx.fillRect(0, 0, 480, 270);

  // stars
  for (const s of STARS) {
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.p);
    ctx.globalAlpha = 0.3 + tw * 0.7;
    ctx.fillStyle = s.s > 1 ? '#c9f4ff' : '#dfe8ff';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;

  // moon
  ctx.fillStyle = 'rgba(200,220,255,0.12)';
  ctx.beginPath(); ctx.arc(392, 52, 34, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#e8ecff';
  ctx.beginPath(); ctx.arc(392, 52, 22, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#c8cfe8';
  ctx.beginPath(); ctx.arc(384, 46, 5, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(398, 58, 3, 0, 6.3); ctx.fill();

  // skyline
  for (const b of BUILDINGS) {
    const by = 210 - b.h;
    ctx.fillStyle = '#100d26';
    ctx.fillRect(b.x, by, b.w, b.h + 30);
    ctx.fillStyle = '#1a1736';
    ctx.fillRect(b.x + 2, by + 2, b.w - 4, 2);
    for (const w of b.windows) {
      const flicker = Math.sin(t * 1.5 + w.p) > -0.9 ? 1 : 0.15;
      ctx.globalAlpha = flicker * 0.8;
      ctx.fillStyle = w.c;
      ctx.fillRect(b.x + w.x, by + w.y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // neon signs
  const neon = (x, y, w, h, c, label, flick) => {
    const on = Math.sin(t * 7 + flick) > -0.8 ? 1 : 0.25;
    ctx.globalAlpha = on * 0.18;
    ctx.fillStyle = c;
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.globalAlpha = on;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w, y, 1, h);
    if (label) drawText(ctx, label, x + 3, y + 4, { scale: 1, color: c, alpha: on });
    ctx.globalAlpha = 1;
  };
  neon(58, 96, 26, 40, '#ff4f9a', 'BAR', 1.2);
  neon(112, 76, 22, 56, '#5ff0ff', 'HOT', 2.6);
  neon(372, 118, 40, 26, '#ffd75e', '24H', 0.7);

  // hanging cables
  ctx.strokeStyle = 'rgba(10,8,20,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 70); ctx.quadraticCurveTo(120, 96, 250, 76); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(240, 84); ctx.quadraticCurveTo(360, 108, 480, 82); ctx.stroke();

  // rooftop
  ctx.fillStyle = '#1c1830';
  ctx.fillRect(0, 232, 480, 38);
  ctx.fillStyle = '#2e2748';
  ctx.fillRect(0, 232, 480, 5);
  ctx.fillStyle = '#131020';
  for (let i = 0; i < 12; i++) ctx.fillRect(i * 40, 237, 1, 33);
  ctx.fillStyle = 'rgba(95,240,255,0.14)';
  ctx.fillRect(0, 237, 480, 1);
  // railing
  ctx.fillStyle = '#3b3556';
  ctx.fillRect(0, 220, 480, 2);
  for (let i = 10; i < 480; i += 30) ctx.fillRect(i, 206, 2, 16);
  ctx.fillRect(0, 205, 480, 2);
  // vents
  ctx.fillStyle = '#2a2440';
  ctx.fillRect(36, 214, 44, 18);
  ctx.fillStyle = '#413a60';
  ctx.fillRect(40, 218, 36, 3);
  ctx.fillRect(40, 224, 36, 3);

  // rain
  for (const r of RAIN) {
    const y = (r.y + t * r.sp) % 280;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#9fb8e8';
    ctx.fillRect(Math.round(r.x), Math.round(y), 1, r.len);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- coral

function drawCoral(ctx, t) {
  ctx.fillStyle = grad(ctx, 'coral', [[0, '#0a4f6b'], [0.45, '#0a3d55'], [0.78, '#06283c'], [1, '#041a28']]);
  ctx.fillRect(0, 0, 480, 270);

  // light rays
  for (let i = 0; i < 5; i++) {
    const x = 30 + i * 100 + Math.sin(t * 0.2 + i) * 10;
    ctx.globalAlpha = 0.05 + 0.02 * Math.sin(t * 0.7 + i);
    ctx.fillStyle = '#bff6ff';
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 34, 0); ctx.lineTo(x + 110, 240); ctx.lineTo(x + 40, 240);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // distant rocks
  ctx.fillStyle = '#083449';
  ctx.beginPath();
  ctx.moveTo(0, 220); ctx.lineTo(40, 168); ctx.lineTo(100, 210); ctx.lineTo(160, 176);
  ctx.lineTo(230, 218); ctx.lineTo(320, 180); ctx.lineTo(400, 216); ctx.lineTo(480, 190);
  ctx.lineTo(480, 245); ctx.lineTo(0, 245); ctx.closePath(); ctx.fill();

  // coral
  for (const c of CORAL) {
    const sway = Math.sin(t * 0.8 + c.x) * 3;
    const base = 232;
    if (c.type === 'fan') {
      ctx.fillStyle = c.hue < 0.5 ? '#ff6b8a' : '#b06bff';
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(c.x, base - c.h * 0.6, c.h * 0.45, Math.PI, 0);
      ctx.lineTo(c.x + c.h * 0.45, base);
      ctx.lineTo(c.x - c.h * 0.45, base);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (c.type === 'tube') {
      ctx.fillStyle = c.hue < 0.5 ? '#ffb05e' : '#ff8fa3';
      for (let i = 0; i < 3; i++) {
        const x = c.x + i * 6 + sway * 0.4;
        ctx.fillRect(x, base - c.h + i * 6, 4, c.h - i * 6);
        ctx.fillStyle = '#2a1424';
        ctx.fillRect(x, base - c.h + i * 6, 4, 2);
        ctx.fillStyle = c.hue < 0.5 ? '#ffb05e' : '#ff8fa3';
      }
    } else {
      ctx.strokeStyle = c.hue < 0.5 ? '#7ee0c0' : '#ff7ab8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c.x, base);
      ctx.quadraticCurveTo(c.x + sway, base - c.h * 0.6, c.x + sway * 1.5, base - c.h);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x + sway * 0.4, base - c.h * 0.55);
      ctx.quadraticCurveTo(c.x - 8 + sway, base - c.h * 0.8, c.x - 10 + sway, base - c.h * 0.95);
      ctx.stroke();
    }
  }

  // sandy floor
  ctx.fillStyle = '#c8a878';
  ctx.fillRect(0, 232, 480, 38);
  ctx.fillStyle = '#e0c698';
  ctx.fillRect(0, 232, 480, 5);
  ctx.fillStyle = '#a88858';
  for (let i = 0; i < 24; i++) {
    const x = (i * 53 + 17) % 480;
    ctx.fillRect(x, 242 + (i % 3) * 7, 3, 1);
  }
  // shells
  ctx.fillStyle = '#ff9fb8';
  ctx.fillRect(60, 238, 7, 3);
  ctx.fillStyle = '#ffd0e0';
  ctx.fillRect(62, 236, 3, 3);
  ctx.fillStyle = '#fff3c4';
  ctx.fillRect(392, 244, 6, 2);

  // caustics
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#bff6ff';
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 80 + Math.sin(t * 0.6 + i) * 16;
    ctx.fillRect(x, 240, 26, 2);
    ctx.fillRect(x + 8, 246, 18, 1);
  }
  ctx.globalAlpha = 1;

  // bubbles
  for (const b of BUBBLES) {
    const y = 270 - ((b.y + t * b.sp) % 285);
    const x = b.x + Math.sin(t + b.ph) * 6;
    ctx.strokeStyle = 'rgba(190,245,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, b.r, 0, 6.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(Math.round(x - b.r * 0.4), Math.round(y - b.r * 0.4), 1, 1);
  }
}

// ---------------------------------------------------------------- cosmic

function drawCosmic(ctx, t) {
  ctx.fillStyle = grad(ctx, 'cosmic', [[0, '#0b0620'], [0.45, '#1c0a38'], [0.78, '#2a0f44'], [1, '#12081f']]);
  ctx.fillRect(0, 0, 480, 270);

  // nebula
  for (const n of NEBULA) {
    ctx.fillStyle = n.c;
    ctx.beginPath();
    ctx.ellipse(n.x + Math.sin(t * 0.05 + n.y) * 4, n.y, n.rx, n.ry, 0, 0, 6.3);
    ctx.fill();
  }

  // stars
  for (const s of STARS) {
    const tw = 0.4 + 0.6 * Math.sin(t * 1.6 + s.p);
    ctx.globalAlpha = 0.25 + tw * 0.75;
    ctx.fillStyle = s.s > 1 ? '#ffe36e' : '#dfe8ff';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;

  // ringed planet
  ctx.fillStyle = 'rgba(180,120,255,0.18)';
  ctx.beginPath(); ctx.arc(86, 74, 30, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#9a6bd8';
  ctx.beginPath(); ctx.arc(86, 74, 18, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#c9a0ff';
  ctx.beginPath(); ctx.arc(80, 68, 6, 0, 6.3); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,150,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(86, 74, 32, 8, -0.3, 0, 6.3); ctx.stroke();

  // temple pillars
  const pillar = (x, w, h) => {
    ctx.fillStyle = '#241536';
    ctx.fillRect(x, 232 - h, w, h);
    ctx.fillStyle = '#3a2450';
    ctx.fillRect(x + 4, 232 - h + 8, w - 8, h - 8);
    ctx.fillStyle = '#4e3268';
    ctx.fillRect(x - 4, 232 - h, w + 8, 8);
    ctx.fillRect(x - 4, 224, w + 8, 8);
    // runes
    ctx.fillStyle = 'rgba(255,227,110,0.5)';
    ctx.fillRect(x + w / 2 - 2, 232 - h + 20, 4, 4);
    ctx.fillRect(x + w / 2 - 2, 232 - h + 34, 4, 4);
    ctx.fillRect(x + w / 2 - 2, 232 - h + 48, 4, 4);
  };
  pillar(30, 26, 150);
  pillar(424, 26, 150);

  // floating rocks
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 58 + Math.sin(t * 0.3 + i) * 6;
    const y = 100 + Math.sin(t * 0.5 + i * 2) * 6 + i * 8;
    ctx.fillStyle = '#2c1b40';
    ctx.fillRect(x, y, 10 + (i % 3) * 4, 5);
    ctx.fillStyle = '#45305e';
    ctx.fillRect(x + 2, y - 2, 6, 3);
  }

  // golden beams
  ctx.globalAlpha = 0.06 + 0.03 * Math.sin(t);
  ctx.fillStyle = '#ffe36e';
  ctx.beginPath();
  ctx.moveTo(200, 0); ctx.lineTo(280, 0); ctx.lineTo(330, 232); ctx.lineTo(150, 232);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;

  // platform
  ctx.fillStyle = '#1a1028';
  ctx.fillRect(0, 232, 480, 38);
  ctx.fillStyle = '#4a3260';
  ctx.fillRect(0, 232, 480, 5);
  ctx.fillStyle = '#2e1d42';
  ctx.fillRect(0, 237, 480, 33);
  // runes on floor
  ctx.fillStyle = 'rgba(255,227,110,0.55)';
  for (let i = 0; i < 8; i++) {
    const x = 24 + i * 62;
    ctx.fillRect(x, 250, 10, 2);
    ctx.fillRect(x + 4, 246, 2, 10);
  }
  ctx.fillStyle = 'rgba(255,227,110,0.18)';
  ctx.fillRect(0, 244, 480, 1);

  // motes
  for (const m of MOTE) {
    const y = m.y - ((t * m.sp) % 220);
    const x = m.x + Math.sin(t * 0.8 + m.ph) * 8;
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + m.ph);
    ctx.fillStyle = '#ffe36e';
    ctx.fillRect(Math.round(x), Math.round(y), m.s, m.s);
  }
  ctx.globalAlpha = 1;
}

const STAGE_FN = { dojo: drawDojo, rooftop: drawRooftop, coral: drawCoral, cosmic: drawCosmic };

export function drawStage(ctx, id, t) {
  (STAGE_FN[id] || drawDojo)(ctx, t);
}
