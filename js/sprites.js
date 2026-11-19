// Procedural pixel-art sprites for all 11 fighters.
// Everything is drawn with crisp rectangles / pixel ellipses at a low internal resolution.

const OUT = '#1b1626';

const PAL = {
  lemur: { fur: '#9aa4b5', fur2: '#c9d2de', dark: '#6b7386', belly: '#f6ecd9', face: '#fbf6ea', ear: '#f3a6b6', eye: '#ffd23f', out: '#272231' },
  octo: { body: '#a05cff', dark: '#7436d6', light: '#c99bff', blush: '#ff7ab8', pupil: '#2a1738', out: '#241534', spot: '#8a45e8' },
  octoJr: { body: '#c47cff', dark: '#9a4ee0', light: '#e3c1ff', blush: '#ff8ecb', pupil: '#301b45', out: '#2a1838', spot: '#ad63f0' },
  squid: { body: '#ff4f6d', dark: '#c92a4f', light: '#ff8fa3', belly: '#ffd0d9', pupil: '#2a1018', out: '#2b111c', fin: '#ff7b93' },
  lobster: { body: '#e8402f', dark: '#a8241c', light: '#ff7a5c', belly: '#ffc2a8', out: '#2c1113', claw: '#f2553d' },
  crab: { body: '#ffc93c', dark: '#e0952a', light: '#ffe38a', belly: '#fff3c4', out: '#3a2a10', claw: '#ffd75e' },
  robot: { body: '#8fa3c9', dark: '#5a6d94', light: '#c3d2ec', metal: '#6d7fa6', accent: '#ff9f43', eye: '#5ff0ff', out: '#1a2030' },
  ray: { body: '#5d7fbf', dark: '#3f5a91', light: '#9fc0ef', belly: '#e8f0ff', out: '#1c2438', spot: '#7f9fd8', sting: '#e8eefc' },
  lizard: { body: '#6fc24a', dark: '#4a8f30', light: '#a5e37f', belly: '#f2e6a8', out: '#22301a', crest: '#ff9f43', eye: '#ffe14d', pupil: '#1c2414', tongue: '#ff6b8a' },
  star: { body: '#ff9a3c', dark: '#d96b1e', light: '#ffc07a', out: '#38200f', face: '#ffe0b8', blush: '#ff6b8a' },
  turtle: { body: '#4f9d5d', dark: '#2f6d3e', shell: '#3c6b47', shellDark: '#27492f', gold: '#ffd85e', goldDark: '#c99a22', belly: '#c8b06a', out: '#1b2a1c', eye: '#ffe36e' },
};

function px(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function ell(ctx, cx, cy, rx, ry, c) {
  cx = Math.round(cx); cy = Math.round(cy);
  rx = Math.max(1, Math.round(rx)); ry = Math.max(1, Math.round(ry));
  ctx.fillStyle = c;
  for (let dy = -ry; dy <= ry; dy++) {
    const k = 1 - (dy * dy) / (ry * ry);
    const w = Math.floor(rx * Math.sqrt(Math.max(0, k)));
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

function ellO(ctx, cx, cy, rx, ry, c, out = OUT) {
  ell(ctx, cx, cy, rx + 1.2, ry + 1.2, out);
  ell(ctx, cx, cy, rx, ry, c);
}

function polyline(ctx, pts, w0, w1, c, out = OUT) {
  const n = pts.length - 1;
  if (n < 1) return;
  for (let pass = 0; pass < 2; pass++) {
    const grow = pass === 0 ? 2 : 0;
    const col = pass === 0 ? out : c;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const t0 = i / n, t1 = (i + 1) / n;
      const wa = w0 + (w1 - w0) * t0 + grow;
      const wb = w0 + (w1 - w0) * t1 + grow;
      const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 1.5));
      for (let s = 0; s <= steps; s++) {
        const q = s / steps;
        const x = x1 + (x2 - x1) * q;
        const y = y1 + (y2 - y1) * q;
        const w = wa + (wb - wa) * q;
        px(ctx, x - w / 2, y - w / 2, w, w, col);
      }
    }
  }
}

function tri(ctx, x1, y1, x2, y2, x3, y3, c, out = OUT, lw = 2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fillStyle = c;
  ctx.fill();
  if (out) {
    ctx.strokeStyle = out;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function starPath(ctx, cx, cy, R, r, points, rot, c, out, lw = 2.5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const ang = rot + (i * Math.PI) / points;
    const rad = i % 2 ? r : R;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = c;
  ctx.fill();
  ctx.strokeStyle = out;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function tentaclePts(x0, y0, x1, y1, t, phase, sway, n = 6) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const q = i / n;
    const x = x0 + (x1 - x0) * q + Math.sin(t * 0.08 + phase + q * 2.6) * sway * q;
    const y = y0 + (y1 - y0) * q;
    pts.push([x, y]);
  }
  return pts;
}

// ---------------------------------------------------------------- poses

export function poseOf(f) {
  const t = f.animT || 0;
  const p = {
    t,
    bob: Math.sin(t * 0.09) * 1.2,
    walk: 0,
    crouch: f.crouching ? 1 : 0,
    air: !f.onGround,
    block: f.blocking ? 1 : 0,
    hurt: (f.hitstun || 0) > 0 ? 1 : 0,
    punch: 0, kick: 0, cast: 0,
    win: f.state === 'win',
    ko: f.state === 'ko',
  };
  if (f.state === 'walk' && f.onGround) p.walk = Math.sin(t * 0.3);
  if (f.attack) {
    const a = f.attack, d = a.data, q = a.frame;
    let ext;
    if (q < d.startup) ext = 0.35 * (q / Math.max(1, d.startup));
    else if (q < d.startup + d.active) ext = 1;
    else ext = Math.max(0, 1 - (q - d.startup - d.active) / Math.max(1, d.recovery));
    if (a.name === 'punch') p.punch = ext;
    else if (a.name === 'kick') p.kick = ext;
    else p.cast = ext;
  }
  if (!f.onGround) p.bob = -1.5;
  if (p.win) p.bob = -2 - Math.abs(Math.sin(t * 0.13)) * 2.5;
  if (p.hurt) p.bob += 1;
  return p;
}

// ---------------------------------------------------------------- lemur

function drawLemur(ctx, p) {
  const C = PAL.lemur;
  const sw = p.walk * 3.5;
  const armF = p.punch;
  const hurt = p.hurt;

  // ringed tail curling up behind
  const tail = [];
  for (let i = 0; i < 11; i++) {
    const a = 0.1 - i * 0.35;
    const r = 24 - i * 1.45;
    const x = -28 + Math.cos(a) * r * 0.85 + Math.sin(p.t * 0.06) * 1.1;
    const y = -52 + Math.sin(a) * r * 0.95 + Math.cos(p.t * 0.05 + i * 0.25) * 1.1;
    tail.push([x, y]);
  }
  for (let i = 0; i < tail.length; i++) {
    const [x, y] = tail[i];
    const r = 5.2 - i * 0.24;
    ellO(ctx, x, y, r, r, i % 2 ? C.fur2 : C.fur, C.out);
  }

  // legs
  const lf = p.kick > 0 ? p.kick : 0;
  const footA = [-8 + sw, -3];
  const footB = [8 - sw + lf * 12, -3 - lf * 8];
  polyline(ctx, [[-5, -20], [-8 + sw * 0.6, -11], footA], 6, 5, C.fur, C.out);
  polyline(ctx, [[5, -20], [8 - sw * 0.6 + lf * 5, -11 - lf * 3], footB], 6, 5, C.fur2, C.out);
  ellO(ctx, footA[0] - 2, -2, 4.5, 3, C.fur2, C.out);
  ellO(ctx, footB[0] + 2, -2 - lf * 8, 4.5, 3, C.fur, C.out);

  // torso
  ellO(ctx, 0, -34, 12, 16, C.fur, C.out);
  ell(ctx, 1, -32, 7, 11, C.belly);

  // back arm
  const backHand = p.block ? [-11, -42] : p.cast > 0 ? [-9, -58] : [-15, -30 + sw * 1.2];
  polyline(ctx, [[-10, -44], [-13, -37], backHand], 4.5, 3.5, C.dark, C.out);
  ellO(ctx, backHand[0], backHand[1], 3.6, 3.6, C.fur, C.out);

  // front arm
  let hand;
  if (p.block) hand = [14, -44];
  else if (p.cast > 0) hand = [9, -58];
  else if (armF > 0) hand = [10 + armF * 21, -42 - armF * 5];
  else if (p.win) hand = [13, -60];
  else hand = [15, -30 - sw * 1.2];
  polyline(ctx, [[10, -44], [12 + (hand[0] - 10) * 0.5, -40 + (hand[1] + 40) * 0.3], hand], 4.5, 3.5, C.fur2, C.out);
  ellO(ctx, hand[0], hand[1], 4, 4, C.fur, C.out);
  if (p.block) {
    // crossed guard
    polyline(ctx, [[10, -44], [17, -40]], 4, 3, C.fur, C.out);
    px(ctx, 12, -46, 8, 1, '#8ff7ff');
  }

  // ears
  ellO(ctx, -13, -73, 6.5, 6.5, C.fur, C.out);
  ell(ctx, -13, -73, 3, 3, C.ear);
  ellO(ctx, 13, -73, 6.5, 6.5, C.fur, C.out);
  ell(ctx, 13, -73, 3, 3, C.ear);

  // head
  const hx = hurt ? -2 : 0;
  const hy = -63 + (hurt ? 1 : 0);
  ellO(ctx, hx, hy, 14, 12, C.fur, C.out);
  ell(ctx, hx + 1, hy + 1, 9.5, 8.5, C.face);
  // eye patches
  ell(ctx, hx - 4, hy - 2, 3.4, 4, C.out);
  ell(ctx, hx + 5, hy - 2, 3.4, 4, C.out);
  if (p.hurt || p.ko) {
    px(ctx, hx - 6, hy - 3, 4, 1, C.fur2);
    px(ctx, hx + 3, hy - 3, 4, 1, C.fur2);
  } else {
    px(ctx, hx - 5, hy - 3, 3, 3, C.eye);
    px(ctx, hx + 4, hy - 3, 3, 3, C.eye);
    px(ctx, hx - 4, hy - 2, 1, 2, C.out);
    px(ctx, hx + 5, hy - 2, 1, 2, C.out);
  }
  // nose + mouth
  px(ctx, hx, hy + 5, 2, 2, C.out);
  px(ctx, hx - 2, hy + 8, 5, 1, C.out);
  px(ctx, hx - 3, hy + 7, 1, 1, C.out);
  px(ctx, hx + 4, hy + 7, 1, 1, C.out);
  // head stripe
  px(ctx, hx - 8, hy - 10, 6, 2, C.dark);
}

// ---------------------------------------------------------------- octopus

function drawOctopus(ctx, p, baby = false) {
  const C = baby ? PAL.octoJr : PAL.octo;
  const armF = p.punch;
  const eyes = baby ? 6.4 : 5.4;
  const bodyR = baby ? 20 : 19;

  // back tentacles
  const n = baby ? 6 : 7;
  for (let i = 0; i < n; i++) {
    const spread = i - (n - 1) / 2;
    const x0 = spread * 3.2;
    const x1 = spread * 7.4;
    const pts = tentaclePts(x0, -30, x1, 0, p.t, i * 0.9, 3.4);
    polyline(ctx, pts, 7, 4.2, i % 2 ? C.dark : C.body, C.out);
  }

  // mantle
  ellO(ctx, 0, -55, bodyR, 22, C.body, C.out);
  ell(ctx, -6, -60, 10, 12, C.light);
  // spots
  const spots = baby ? [[-9, -70], [8, -72], [13, -63], [-13, -60], [4, -78]] : [[-10, -72], [9, -70], [14, -62], [-14, -58], [2, -80]];
  for (const [sx, sy] of spots) ell(ctx, sx, sy, 2, 2, C.spot);

  // face
  ellO(ctx, -7, -58, eyes, eyes + 1, '#ffffff', C.out);
  ellO(ctx, 7, -58, eyes, eyes + 1, '#ffffff', C.out);
  ell(ctx, -6, -57, baby ? 3.2 : 2.6, baby ? 3.6 : 3, C.pupil);
  ell(ctx, 8, -57, baby ? 3.2 : 2.6, baby ? 3.6 : 3, C.pupil);
  px(ctx, -8, -60, 2, 2, '#ffffff');
  px(ctx, 6, -60, 2, 2, '#ffffff');
  ell(ctx, -14, -48, 3, 2, C.blush);
  ell(ctx, 14, -48, 3, 2, C.blush);
  // smile
  px(ctx, -2, -46, 5, 1, C.out);
  px(ctx, -4, -47, 2, 1, C.out);
  px(ctx, 3, -47, 2, 1, C.out);

  // arms
  for (const side of [-1, 1]) {
    const front = side === 1;
    let end;
    if (p.win) end = [side * 22, -74];
    else if (p.cast > 0) end = [side * (16 + p.cast * 4), -76];
    else if (front && armF > 0) end = [14 + armF * 24, -50];
    else if (front && p.block) end = [22, -46];
    else end = [side * 26, -26];
    const pts = tentaclePts(side * 15, -48, end[0], end[1], p.t, side * 1.7, 2.6);
    polyline(ctx, pts, 6, 4, front ? C.body : C.dark, C.out);
    ellO(ctx, end[0], end[1], 3.4, 3.4, front ? C.light : C.dark, C.out);
    // suckers
    for (let i = 2; i < pts.length - 1; i += 2) {
      const [sx, sy] = pts[i];
      px(ctx, sx - 1, sy, 2, 2, C.blush);
    }
  }

  if (baby) {
    // tiny bow
    tri(ctx, 0, -78, -6, -82, -6, -75, C.blush, C.out, 1.5);
    tri(ctx, 0, -78, 6, -82, 6, -75, C.blush, C.out, 1.5);
    px(ctx, -1, -79, 3, 3, '#ffd0ea');
    // sparkles
    px(ctx, -19, -74, 2, 2, '#fff2b0');
    px(ctx, 18, -82, 2, 2, '#fff2b0');
  }
}

// ---------------------------------------------------------------- squid

function drawSquid(ctx, p) {
  const C = PAL.squid;
  const armF = p.punch;

  // tentacles behind
  for (let i = 0; i < 6; i++) {
    const spread = i - 2.5;
    const pts = tentaclePts(spread * 3.4, -32, spread * 6.2, 0, p.t, i * 0.8, 3);
    polyline(ctx, pts, 6, 3.4, i % 2 ? C.dark : C.body, C.out);
  }

  // fins
  tri(ctx, -12, -74, -30, -86, -12, -86, C.fin, C.out);
  tri(ctx, 12, -74, 30, -86, 12, -86, C.fin, C.out);
  tri(ctx, -13, -62, -27, -55, -11, -56, C.fin, C.out);
  tri(ctx, 13, -62, 27, -55, 11, -56, C.fin, C.out);

  // mantle
  ellO(ctx, 0, -60, 16, 26, C.body, C.out);
  tri(ctx, 0, -98, 13, -76, -13, -76, C.body, C.out);
  ell(ctx, -5, -66, 8, 14, C.light);
  // belly
  ell(ctx, 1, -45, 8, 9, C.belly);

  // spots
  for (const [sx, sy] of [[-8, -82], [6, -86], [9, -70], [-11, -64], [3, -76]]) {
    ell(ctx, sx, sy, 1.8, 1.8, C.dark);
  }

  // eyes
  ellO(ctx, -7, -58, 5.4, 5.8, '#ffffff', C.out);
  ellO(ctx, 7, -58, 5.4, 5.8, '#ffffff', C.out);
  ell(ctx, -6, -57, 2.6, 3, C.pupil);
  ell(ctx, 8, -57, 2.6, 3, C.pupil);
  px(ctx, -8, -60, 2, 2, '#ffffff');
  px(ctx, 6, -60, 2, 2, '#ffffff');
  // angry brows
  px(ctx, -12, -64, 6, 2, C.out);
  px(ctx, 6, -64, 6, 2, C.out);
  // mouth
  px(ctx, -3, -47, 7, 1, C.out);
  px(ctx, -5, -48, 2, 1, C.out);
  px(ctx, 4, -48, 2, 1, C.out);

  // feeding arms
  for (const side of [-1, 1]) {
    const front = side === 1;
    let end;
    if (p.win) end = [side * 22, -92];
    else if (p.cast > 0) end = [side * 18, -90];
    else if (front && armF > 0) end = [14 + armF * 26, -54];
    else if (front && p.block) end = [22, -50];
    else end = [side * 24, -30];
    const pts = tentaclePts(side * 13, -46, end[0], end[1], p.t, side * 2.1, 2.4);
    polyline(ctx, pts, 5.5, 3.6, front ? C.body : C.dark, C.out);
    // club tip
    ellO(ctx, end[0], end[1], 4.2, 3.2, front ? C.light : C.dark, C.out);
    px(ctx, end[0] - 2, end[1] - 1, 1, 1, C.out);
    px(ctx, end[0] + 1, end[1] - 1, 1, 1, C.out);
  }
}

// ---------------------------------------------------------------- lobster

function drawClaw(ctx, x, y, size, open, color, out) {
  const o = open * 2.5;
  // palm
  ellO(ctx, x, y, size * 0.6, size * 0.5, color, out);
  // upper pincer
  tri(ctx, x - size * 0.1, y - size * 0.28, x + size * 1.0, y - size * 0.75 - o, x + size * 1.02, y - size * 0.2, color, out, 2.2);
  // lower pincer
  tri(ctx, x - size * 0.1, y + size * 0.25, x + size * 0.95, y + size * 0.55 + o, x + size * 0.95, y + size * 0.15, color, out, 2.2);
  // highlights
  px(ctx, x - size * 0.25, y - size * 0.2, 2, 2, '#ffb49e');
}

function drawLobster(ctx, p) {
  const C = PAL.lobster;
  const sw = p.walk * 2.5;
  const armF = p.punch;

  // tail fan
  ellO(ctx, -18, -22, 10, 6, C.dark, C.out);
  tri(ctx, -18, -20, -30, -10, -22, -28, C.body, C.out);
  tri(ctx, -20, -24, -32, -26, -22, -32, C.body, C.out);
  tri(ctx, -18, -28, -26, -38, -14, -32, C.body, C.out);

  // little legs
  for (let i = 0; i < 3; i++) {
    const y = -28 + i * 5;
    polyline(ctx, [[-10, y], [-17 - i, y + 6], [-19 - i + sw * (i % 2 ? 1 : -1), -1]], 2.5, 2, C.dark, C.out);
    polyline(ctx, [[10, y], [17 + i, y + 6], [19 + i + sw * (i % 2 ? -1 : 1), -1]], 2.5, 2, C.dark, C.out);
  }

  // abdomen
  ellO(ctx, 0, -25, 13, 6.5, C.dark, C.out);
  ellO(ctx, 0, -32, 12.5, 6.5, C.body, C.out);
  ellO(ctx, 0, -39, 12, 6.5, C.dark, C.out);
  ellO(ctx, 0, -46, 11, 7, C.body, C.out);

  // carapace
  ellO(ctx, 1, -57, 12, 11, C.claw, C.out);
  ell(ctx, -3, -60, 5, 5, C.light);
  px(ctx, 1, -62, 8, 2, C.dark);

  // eye stalks
  for (const s of [-1, 1]) {
    polyline(ctx, [[s * 5, -64], [s * 6, -71]], 2.5, 2, C.dark, C.out);
    ellO(ctx, s * 6, -73, 3, 3, '#1c1020', C.out);
    px(ctx, s * 6, -74, 1, 1, '#ffffff');
  }

  // antennae
  polyline(ctx, [[6, -62], [16, -74], [26, -78]], 1.8, 1, C.dark, C.out);
  polyline(ctx, [[-5, -62], [-16, -74], [-26, -76]], 1.8, 1, C.dark, C.out);
  polyline(ctx, [[4, -60], [14, -60], [24, -64]], 1.5, 1, C.body, C.out);

  // back claw
  polyline(ctx, [[-10, -52], [-16, -48], [-20, -44]], 4.5, 3.5, C.dark, C.out);
  drawClaw(ctx, -23, -43, 8, p.cast * 0.6, C.dark, C.out);

  // front claw
  let cx = 19, cy = -46;
  if (armF > 0) { cx = 19 + armF * 20; cy = -48 - armF * 4; }
  if (p.cast > 0) { cx = 22 + p.cast * 16; cy = -54; }
  if (p.win) { cx = 20; cy = -66; }
  polyline(ctx, [[9, -52], [13, -50], [cx - 5, cy + 2]], 5, 4, C.body, C.out);
  drawClaw(ctx, cx, cy, 10 + (armF > 0.5 ? 2 : 0), p.cast * 0.8, C.claw, C.out);
}

// ---------------------------------------------------------------- crab

function drawCrab(ctx, p) {
  const C = PAL.crab;
  const sw = p.walk * 2;
  const armF = p.punch;

  // legs
  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * 7;
    polyline(ctx, [[-18, -34 + off * 0.3], [-26 - i * 2, -18 + off], [-27 - i * 3 + sw, -1]], 3, 2.2, C.dark, C.out);
    polyline(ctx, [[18, -34 + off * 0.3], [26 + i * 2, -18 + off], [27 + i * 3 - sw, -1]], 3, 2.2, C.dark, C.out);
  }

  // back claw
  polyline(ctx, [[-18, -40], [-25, -36], [-29, -32]], 4.5, 3.5, C.dark, C.out);
  drawClaw(ctx, -32, -31, 7.5, p.cast * 0.5, C.dark, C.out);

  // shell
  ellO(ctx, 0, -41, 25, 13.5, C.body, C.out);
  ell(ctx, -7, -46, 13, 6, C.light);
  // shell spots
  for (const [sx, sy] of [[-14, -40], [10, -37], [3, -47], [17, -43], [-3, -35]]) {
    ell(ctx, sx, sy, 1.6, 1.6, C.dark);
  }
  // belly
  ell(ctx, 0, -30, 16, 4, C.belly);

  // mouth
  px(ctx, -2, -32, 5, 1, C.out);
  px(ctx, -4, -33, 2, 1, C.out);
  px(ctx, 3, -33, 2, 1, C.out);

  // eye stalks
  for (const s of [-1, 1]) {
    polyline(ctx, [[s * 6, -50], [s * 8, -60]], 3, 2.4, C.body, C.out);
    ellO(ctx, s * 8, -63, 4, 4, '#ffffff', C.out);
    px(ctx, s * 8 - 1, -64, 2, 2, C.out);
  }

  // front claw
  let cx = 24, cy = -38;
  if (armF > 0) { cx = 24 + armF * 18; cy = -40 - armF * 4; }
  if (p.cast > 0) { cx = 26 + p.cast * 14; cy = -48; }
  if (p.win) { cx = 24; cy = -58; }
  polyline(ctx, [[18, -42], [21, -41], [cx - 4, cy + 2]], 5, 4, C.body, C.out);
  drawClaw(ctx, cx, cy, 9, p.cast * 0.7, C.claw, C.out);
}

// ---------------------------------------------------------------- robot

function drawRobot(ctx, p) {
  const C = PAL.robot;
  const sw = p.walk * 3;
  const armF = p.punch;

  // legs
  for (const s of [-1, 1]) {
    const fx = s * 8 + (s < 0 ? sw : -sw);
    polyline(ctx, [[s * 7, -30], [s * 8, -16], [fx, -4]], 5.5, 4.5, C.metal, C.out);
    px(ctx, fx - 5, -5, 10, 5, C.dark);
    px(ctx, fx - 5, -6, 10, 2, C.light);
    px(ctx, fx - 3, -2, 2, 2, C.out);
    px(ctx, fx + 2, -2, 2, 2, C.out);
  }

  // torso
  px(ctx, -13, -51, 26, 23, C.out);
  px(ctx, -11, -49, 22, 19, C.body);
  px(ctx, -9, -47, 18, 3, C.light);
  // chest core
  ell(ctx, 0, -38, 5.5, 5.5, C.out);
  ell(ctx, 0, -38, 4, 4, p.cast > 0 ? '#ffffff' : C.eye);
  ell(ctx, 0, -38, 2, 2, '#ffffff');
  // vents
  px(ctx, -10, -30, 20, 2, C.dark);
  px(ctx, -10, -27, 20, 1, C.dark);
  // rivets
  for (const [rx, ry] of [[-9, -47], [9, -47], [-9, -34], [9, -34]]) px(ctx, rx, ry, 1, 1, C.light);

  // back arm
  polyline(ctx, [[-15, -47], [-19, -39], [-21, -29]], 5, 4, C.dark, C.out);
  px(ctx, -25, -30, 8, 8, C.out);
  px(ctx, -24, -29, 6, 6, C.metal);

  // front arm
  let ex = 22, ey = -28;
  if (p.block) { ex = 18; ey = -44; }
  else if (p.cast > 0) { ex = 16; ey = -56; }
  else if (armF > 0) { ex = 18 + armF * 20; ey = -44; }
  else if (p.win) { ex = 22; ey = -60; }
  polyline(ctx, [[15, -47], [17, -40], [ex - 4, ey + 2]], 5, 4.5, C.metal, C.out);
  // fist
  px(ctx, ex - 4, ey - 5, 10, 10, C.out);
  px(ctx, ex - 3, ey - 4, 8, 8, C.light);
  px(ctx, ex - 1, ey - 2, 4, 4, C.metal);
  if (armF > 0.6) {
    // rocket flame
    const fx = ex - 7;
    px(ctx, fx, ey - 2, 4, 4, C.accent);
    px(ctx, fx - 3, ey - 1, 3, 2, '#ffe36e');
    px(ctx, fx - 6, ey, 3, 1, '#ff6b3d');
  }

  // neck
  px(ctx, -4, -55, 8, 5, C.dark);

  // head
  px(ctx, -9, -70, 18, 16, C.out);
  px(ctx, -8, -69, 16, 14, C.body);
  px(ctx, -7, -65, 14, 6, '#1b2233');
  px(ctx, -5, -63, 3, 2, C.eye);
  px(ctx, 2, -63, 3, 2, C.eye);
  px(ctx, -8, -67, 16, 1, C.light);
  // side ears
  px(ctx, -12, -64, 3, 6, C.dark);
  px(ctx, 9, -64, 3, 6, C.dark);
  // mouth grill
  px(ctx, -4, -57, 8, 1, C.dark);
  // antenna
  px(ctx, 0, -77, 1, 7, C.dark);
  const blink = Math.sin(p.t * 0.15) > 0;
  ell(ctx, 0, -79, 2, 2, blink ? '#ff5b6e' : '#a83242');
}

// ---------------------------------------------------------------- stingray

function drawRay(ctx, p) {
  const C = PAL.ray;
  const flap = Math.sin(p.t * 0.1) * 3 + (p.air ? 2 : 0);
  const armF = p.punch;

  // tail
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const q = i / 8;
    pts.push([-14 - q * 32, -45 + q * 20 + Math.sin(p.t * 0.09 + q * 4) * 2]);
  }
  polyline(ctx, pts, 3.4, 1.6, C.dark, C.out);
  const [tx, ty] = pts[pts.length - 1];
  tri(ctx, tx, ty - 1, tx + 5, ty - 6, tx + 4, ty + 3, C.sting, C.out, 1.5);

  // wings
  tri(ctx, -5, -52, -34, -46 + flap, -7, -37, C.body, C.out);
  tri(ctx, 5, -52, 34, -46 + flap, 7, -37, C.body, C.out);
  ellO(ctx, 0, -46, 15, 10, C.body, C.out);
  ell(ctx, 0, -42, 13, 5, C.belly);
  // wing tips
  ell(ctx, -31, -46 + flap, 3, 2, C.light);
  ell(ctx, 31, -46 + flap, 3, 2, C.light);

  // spots
  for (const [sx, sy] of [[-16, -49], [-8, -52], [4, -53], [16, -49], [10, -45], [-5, -45]]) {
    ell(ctx, sx, sy, 1.6, 1.6, C.spot);
  }
  // gills
  px(ctx, 3, -44, 1, 4, C.dark);
  px(ctx, 5, -44, 1, 4, C.dark);
  px(ctx, 7, -43, 1, 3, C.dark);

  // eyes (front)
  ellO(ctx, 10, -55, 3.2, 3.4, '#ffffff', C.out);
  ellO(ctx, 17, -53, 3.2, 3.4, '#ffffff', C.out);
  px(ctx, 11, -55, 2, 2, C.out);
  px(ctx, 18, -53, 2, 2, C.out);

  // mouth
  px(ctx, 15, -43, 4, 1, C.out);
  px(ctx, 14, -44, 1, 1, C.out);
  px(ctx, 19, -44, 1, 1, C.out);

  // attack pose: barb forward
  if (armF > 0 || p.cast > 0) {
    const ext = Math.max(armF, p.cast);
    const ex = 20 + ext * 22, ey = -50 - ext * 6;
    polyline(ctx, [[16, -48], [ex, ey]], 3, 2, C.light, C.out);
    tri(ctx, ex + 4, ey - 5, ex + 12, ey, ex + 4, ey + 5, C.sting, C.out, 1.5);
  }
  if (p.win) {
    px(ctx, -18, -62, 2, 2, '#fff2b0');
    px(ctx, 18, -64, 2, 2, '#fff2b0');
  }
}

// ---------------------------------------------------------------- lizard

function drawLizard(ctx, p) {
  const C = PAL.lizard;
  const sw = p.walk * 3.5;
  const armF = p.punch;
  const kick = p.kick;

  // tail
  const tail = [];
  for (let i = 0; i < 9; i++) {
    const q = i / 8;
    tail.push([-8 - q * 34, -24 + q * 12 - Math.sin(q * Math.PI) * 11 + Math.sin(p.t * 0.06 + q * 3) * 2]);
  }
  for (let i = 0; i < tail.length; i++) {
    const [x, y] = tail[i];
    const r = 5.5 - i * 0.42;
    ellO(ctx, x, y, r, r, i % 2 ? C.light : C.body, C.out);
  }

  // legs
  polyline(ctx, [[-5, -26], [-9 + sw * 0.5, -14], [-10 + sw, -3]], 6.5, 5, C.dark, C.out);
  polyline(ctx, [[6, -26], [8 - sw * 0.5 + kick * 4, -14 - kick * 6], [10 - sw + kick * 16, -3 - kick * 9]], 6.5, 5, C.body, C.out);
  ellO(ctx, -11 + sw, -2, 5, 3, C.light, C.out);
  ellO(ctx, 10 - sw + kick * 16, -2 - kick * 9, 5, 3, C.light, C.out);
  // toes
  px(ctx, -14 + sw, -1, 3, 1, C.out);
  px(ctx, 11 - sw + kick * 16, -1 - kick * 9, 3, 1, C.out);

  // torso
  ellO(ctx, 0, -40, 11.5, 16, C.body, C.out);
  ell(ctx, 1, -38, 6.5, 11, C.belly);

  // back arm
  polyline(ctx, [[-9, -47], [-13, -40], [-14, -30]], 4.5, 3.5, C.dark, C.out);
  ellO(ctx, -15, -29, 3.2, 3.2, C.light, C.out);

  // front arm
  let hand = [15, -30];
  if (p.block) hand = [14, -44];
  else if (p.cast > 0) hand = [8, -58];
  else if (armF > 0) hand = [10 + armF * 20, -43];
  else if (p.win) hand = [14, -58];
  polyline(ctx, [[9, -47], [12, -41], hand], 4.5, 3.5, C.body, C.out);
  ellO(ctx, hand[0], hand[1], 3.6, 3.6, C.light, C.out);
  // claws
  px(ctx, hand[0] + 3, hand[1] - 1, 2, 1, '#f2f0d8');
  px(ctx, hand[0] + 3, hand[1] + 2, 2, 1, '#f2f0d8');

  // frill
  tri(ctx, -8, -66, -17, -72, -11, -62, C.crest, C.out, 1.8);
  tri(ctx, -10, -60, -19, -63, -11, -56, C.crest, C.out, 1.8);
  tri(ctx, -7, -72, -13, -80, -4, -74, C.crest, C.out, 1.8);

  // head
  ellO(ctx, 2, -64, 11, 9.5, C.body, C.out);
  ellO(ctx, 13, -61, 8, 5.5, C.body, C.out);
  ell(ctx, 4, -62, 7, 6, C.light);
  // eye
  ellO(ctx, 6, -67, 4, 4, '#ffffff', C.out);
  ell(ctx, 7, -67, 1.6, 3, C.pupil);
  // brow
  px(ctx, 2, -71, 8, 1.5, C.dark);
  // nostril + mouth
  px(ctx, 18, -64, 1.5, 1.5, C.out);
  px(ctx, 12, -58, 8, 1, C.out);
  px(ctx, 10, -59, 2, 1, C.out);
  // tongue flick
  if (Math.sin(p.t * 0.05) > 0.93 && !p.hurt) {
    px(ctx, 20, -57, 7, 1, C.tongue);
    px(ctx, 26, -57, 1, 1, C.tongue);
    px(ctx, 27, -58, 1, 1, C.tongue);
  }
  // head stripes
  px(ctx, -4, -70, 4, 1.5, C.dark);
  px(ctx, -5, -67, 3, 1.5, C.dark);
}

// ---------------------------------------------------------------- starfish

function drawStarfish(ctx, p) {
  const C = PAL.star;
  const sw = p.walk;
  const lean = p.punch * 3 + p.cast * 3;
  const rot = -Math.PI / 2 + sw * 0.09 + (p.cast > 0 ? p.cast * 0.5 : 0);

  // little feet stubs
  polyline(ctx, [[-12, -22], [-13, -3]], 5, 4, C.dark, C.out);
  polyline(ctx, [[12, -22], [13, -3]], 5, 4, C.body, C.out);
  ellO(ctx, -13, -2, 4, 2.5, C.dark, C.out);
  ellO(ctx, 13, -2, 4, 2.5, C.body, C.out);

  ctx.save();
  ctx.translate(lean, 0);
  // star body
  starPath(ctx, 0, -44, 31, 13.5, 5, rot, C.body, C.out, 2.5);
  // arm spots
  const spots = [
    [-21, -58], [-24, -42], [20, -56], [23, -42],
    [-9, -25], [10, -25], [0, -72],
  ];
  for (const [sx, sy] of spots) ell(ctx, sx, sy, 2, 2, C.dark);
  // lighter arm tips
  ell(ctx, 0, -73, 3, 3, C.light);
  ell(ctx, -30, -47, 3, 3, C.light);
  ell(ctx, 30, -47, 3, 3, C.light);
  ell(ctx, -15, -12, 3, 3, C.light);
  ell(ctx, 15, -12, 3, 3, C.light);

  // face
  ellO(ctx, -6, -48, 4.2, 4.6, '#ffffff', C.out);
  ellO(ctx, 6, -48, 4.2, 4.6, '#ffffff', C.out);
  ell(ctx, -5, -47, 2, 2.4, C.out);
  ell(ctx, 7, -47, 2, 2.4, C.out);
  px(ctx, -7, -50, 1.5, 1.5, '#ffffff');
  px(ctx, 5, -50, 1.5, 1.5, '#ffffff');
  ell(ctx, -13, -42, 2.5, 1.6, C.blush);
  ell(ctx, 13, -42, 2.5, 1.6, C.blush);
  // mouth
  px(ctx, -3, -39, 6, 1, C.out);
  px(ctx, -5, -40, 2, 1, C.out);
  px(ctx, 4, -40, 2, 1, C.out);
  ctx.restore();
}

// ---------------------------------------------------------------- turtle (Spike)

function drawTurtle(ctx, p) {
  const C = PAL.turtle;
  const sw = p.walk * 3;
  const armF = p.punch;
  const pulse = 0.5 + 0.5 * Math.sin(p.t * 0.06);

  // divine aura
  ctx.save();
  ctx.globalAlpha = 0.16 + pulse * 0.08;
  ell(ctx, 0, -58, 44, 46, C.gold);
  ctx.globalAlpha = 0.28 + pulse * 0.1;
  ell(ctx, 0, -58, 34, 36, '#fff3b0');
  ctx.restore();
  // orbiting runes
  for (let i = 0; i < 3; i++) {
    const a = p.t * 0.02 + (i * Math.PI * 2) / 3;
    const rx = Math.cos(a) * 40, ry = -58 + Math.sin(a) * 18;
    ctx.globalAlpha = 0.5 + pulse * 0.3;
    px(ctx, rx - 2, ry - 2, 4, 4, C.gold);
    ctx.globalAlpha = 1;
  }

  // legs
  for (const s of [-1, 1]) {
    const fx = s * 15 + (s < 0 ? sw : -sw);
    polyline(ctx, [[s * 14, -28], [s * 18, -14], [fx, -4]], 9, 7.5, C.dark, C.out);
    ellO(ctx, fx, -2, 7, 4, C.body, C.out);
    px(ctx, fx - 4, -1, 2, 2, '#e8e0b0');
    px(ctx, fx + 1, -1, 2, 2, '#e8e0b0');
  }

  // tail
  tri(ctx, -24, -30, -36, -22, -22, -24, C.body, C.out);

  // shell rim + shell
  ellO(ctx, 0, -55, 31, 33, C.belly, C.out);
  ellO(ctx, 0, -55, 28, 30, C.shell, C.out);
  // plate pattern
  ell(ctx, -11, -64, 8, 7, C.shellDark);
  ell(ctx, 9, -66, 7, 6, C.shellDark);
  ell(ctx, -1, -47, 9, 8, C.shellDark);
  ell(ctx, 14, -50, 6, 6, C.shellDark);
  ell(ctx, -15, -44, 5, 5, C.shellDark);
  // gold rune lines on shell
  ctx.strokeStyle = C.goldDark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-20, -72); ctx.lineTo(-8, -58); ctx.lineTo(3, -70); ctx.lineTo(15, -56);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, -40); ctx.lineTo(-3, -35); ctx.lineTo(10, -40);
  ctx.stroke();

  // shell spikes
  const spikes = [
    [-30, -64, -40, -74, -25, -76],
    [-27, -46, -38, -44, -26, -36],
    [0, -86, 4, -98, 10, -84],
    [26, -46, 37, -42, 26, -36],
    [29, -64, 39, -72, 26, -76],
  ];
  for (const [x1, y1, x2, y2, x3, y3] of spikes) {
    tri(ctx, x1, y1, x2, y2, x3, y3, C.gold, C.out, 2);
    px(ctx, (x1 + x2) / 2, (y1 + y2) / 2, 2, 2, '#fff3b0');
  }

  // neck + head
  ellO(ctx, 19, -72, 10, 9, C.body, C.out);
  ellO(ctx, 25, -80, 12, 10, C.body, C.out);
  ell(ctx, 24, -86, 6, 4, C.dark);
  // eye
  ellO(ctx, 30, -82, 4, 3.6, '#ffffff', C.out);
  ell(ctx, 31, -82, 1.8, 2.6, C.out);
  // stern brow
  px(ctx, 25, -88, 9, 2, C.dark);
  // beak
  px(ctx, 34, -78, 4, 2, C.dark);
  px(ctx, 35, -76, 3, 1, C.out);
  // gold markings
  px(ctx, 20, -76, 4, 2, C.goldDark);
  px(ctx, 18, -68, 5, 1.5, C.goldDark);

  // back arm
  polyline(ctx, [[-20, -62], [-28, -52], [-30, -42]], 7, 5.5, C.dark, C.out);
  ellO(ctx, -31, -41, 5, 5, C.body, C.out);

  // front arm
  let hx = 32, hy = -44;
  if (p.block) { hx = 30; hy = -56; }
  else if (p.cast > 0) { hx = 30; hy = -74; }
  else if (armF > 0) { hx = 26 + armF * 18; hy = -56 - armF * 4; }
  else if (p.win) { hx = 30; hy = -72; }
  polyline(ctx, [[22, -62], [28, -56], [hx, hy]], 7.5, 6, C.body, C.out);
  // golden gauntlet + fist
  ellO(ctx, hx, hy, 7, 6.5, C.gold, C.out);
  px(ctx, hx - 2, hy - 2, 4, 4, C.goldDark);
  px(ctx, hx + 2, hy - 5, 2, 2, '#fff3b0');

  // halo
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(18, -100 + Math.sin(p.t * 0.08) * 1.2, 10, 3.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#fff3b0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(18, -100 + Math.sin(p.t * 0.08) * 1.2, 8, 2.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  // sparkles
  const sp = Math.sin(p.t * 0.1);
  px(ctx, 4 + sp * 2, -96, 2, 2, '#fff3b0');
  px(ctx, 34, -70 + sp * 2, 2, 2, '#fff3b0');
}

// ---------------------------------------------------------------- dispatch

const DRAW = {
  lemur: drawLemur,
  octopus: (ctx, p) => drawOctopus(ctx, p, false),
  octopusjr: (ctx, p) => drawOctopus(ctx, p, true),
  squid: drawSquid,
  lobster: drawLobster,
  crab: drawCrab,
  robot: drawRobot,
  stingray: drawRay,
  lizard: drawLizard,
  starfish: drawStarfish,
  turtle: drawTurtle,
};

export function drawFighter(ctx, char, f, zoom = 1) {
  const p = poseOf(f);
  const s = char.scale * zoom;
  ctx.save();
  ctx.translate(Math.round(f.x), Math.round(f.y));
  if (f.state === 'ko') {
    const k = Math.min(1, (f.koT || 0) / 16);
    ctx.rotate(-k * Math.PI * 0.5);
    ctx.translate(0, -5);
  }
  ctx.scale(f.facing * s, s);
  ctx.translate(0, p.bob);
  if (p.crouch) ctx.scale(1 + p.crouch * 0.08, 1 - p.crouch * 0.15);
  if (p.hurt && f.state !== 'ko') ctx.rotate(-0.05);
  const fn = DRAW[char.kind] || drawLemur;
  fn(ctx, p, char);
  ctx.restore();
}

export function drawShadow(ctx, char, f, groundY) {
  const h = Math.max(0, groundY - f.y);
  const sc = Math.max(0.35, 1 - h / 220);
  ctx.save();
  ctx.globalAlpha = 0.28 * sc;
  ell(ctx, f.x, groundY + 2, char.hurtW * 0.55 * char.scale * sc, 4 * sc, '#0a0714');
  ctx.restore();
}

export function drawCharInBox(ctx, char, box, t, facing = 1) {
  const effH = char.height * char.scale;
  const effW = char.hurtW * char.scale;
  const s = Math.min((box.w * 0.86) / effW, (box.h * 0.9) / effH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.globalAlpha = 0.35;
  ell(ctx, box.x + box.w / 2, box.y + box.h - 3, box.w * 0.24, 2.5, '#000000');
  ctx.globalAlpha = 1;
  const fake = {
    x: box.x + box.w / 2,
    y: box.y + box.h - 3,
    facing,
    state: 'idle',
    animT: t,
    onGround: true,
    crouching: false,
    blocking: false,
    hitstun: 0,
    attack: null,
  };
  // drawFighter applies char.scale; divide it back out of our fit scale
  drawFighter(ctx, char, fake, s / char.scale);
  ctx.restore();
}

export { PAL };
