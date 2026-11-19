/* Lemmy: Tailspin Showdown — a tiny pixel fighting game */
(() => {
  'use strict';

  const W = 640;
  const H = 360;
  const GROUND = 306;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const $ = (id) => document.getElementById(id);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const sign = (v) => (v < 0 ? -1 : 1);
  const pad2 = (n) => String(n).padStart(2, '0');

  const ui = {
    hud: $('hud'),
    title: $('titleScreen'),
    pause: $('pauseScreen'),
    result: $('resultScreen'),
    start: $('startBtn'),
    resume: $('resumeBtn'),
    quit: $('quitBtn'),
    rematch: $('rematchBtn'),
    toTitle: $('titleBtn'),
    mute: $('muteBtn'),
    pauseBtn: $('pauseBtn'),
    announce: $('announce'),
    announceText: $('announceText'),
    playerCombo: $('playerCombo'),
    enemyCombo: $('enemyCombo'),
    touch: $('touchControls'),
    hint: $('controlsHint'),
    playerHealth: $('playerHealth'),
    enemyHealth: $('enemyHealth'),
    playerLag: $('playerLag'),
    enemyLag: $('enemyLag'),
    playerMeter: $('playerMeter'),
    enemyMeter: $('enemyMeter'),
    playerReady: $('playerReady'),
    playerPips: $('playerPips'),
    enemyPips: $('enemyPips'),
    timer: $('timerText'),
    timerShell: document.querySelector('.timer-shell'),
    roundReadout: $('roundReadout'),
    bestCombo: $('bestCombo'),
    portrait: $('portrait'),
    resultKicker: $('resultKicker'),
    resultTitle: $('resultTitle'),
    resultRank: $('resultRank'),
    resultRounds: $('resultRounds'),
    resultCombo: $('resultCombo'),
    resultDamage: $('resultDamage'),
    resultTime: $('resultTime'),
    resultLine: $('resultLine'),
    resultPanel: document.querySelector('.result-panel'),
    quickTools: $('quickTools'),
    quickPause: $('quickPause'),
    quickMute: $('quickMute'),
  };

  const P = {
    ink: '#0a0812',
    outline: '#201b2e',
    furDark: '#5a5a76',
    fur: '#b9bacb',
    furLight: '#e0dfe8',
    face: '#fff4e2',
    faceShade: '#e6d9ca',
    eye: '#ffc857',
    eyeHot: '#fff0a8',
    nose: '#241e2e',
    scarf: '#e8555f',
    scarfDark: '#a52f48',
    wrap: '#f4a261',
    belt: '#5b3b3e',
    gold: '#ffd166',
    bossOutline: '#1d1720',
    bossDark: '#3f302c',
    boss: '#674c3e',
    bossLight: '#8c6952',
    belly: '#a57a5a',
    moss: '#5b7f45',
    mossLight: '#8eab59',
    tusk: '#f4e4bd',
    bossEye: '#ff5d58',
  };

  const ATTACKS = {
    punch: { startup: 4, active: 4, recovery: 8, damage: 5, reach: 37, y: -37, h: 18, knockback: 1.8, hitstun: 11, meterGain: 8, lunge: 0.35, sfx: 'punch' },
    kick: { startup: 8, active: 6, recovery: 15, damage: 9, reach: 52, y: -27, h: 25, knockback: 3.4, hitstun: 16, meterGain: 11, lunge: 1.05, sfx: 'kick' },
    jumpKick: { startup: 4, active: 10, recovery: 9, damage: 8, reach: 45, y: -31, h: 31, knockback: 2.7, hitstun: 14, meterGain: 10, lunge: 0.2, air: true, sfx: 'kick' },
    special: { startup: 12, active: 27, recovery: 21, damage: 5, reach: 49, y: -35, h: 47, knockback: 2.2, hitstun: 9, meterGain: 0, lunge: 2.3, multi: 6, maxHits: 5, sfx: 'special' },
    bossSwipe: { startup: 12, active: 7, recovery: 18, damage: 11, reach: 59, y: -40, h: 32, knockback: 4.3, hitstun: 18, meterGain: 12, lunge: 1.4, sfx: 'heavy' },
    bossStomp: { startup: 16, active: 6, recovery: 23, damage: 13, reach: 47, y: -18, h: 24, knockback: 4.6, hitstun: 20, meterGain: 12, lunge: 0.5, sfx: 'heavy' },
    bossCharge: { startup: 24, active: 24, recovery: 27, damage: 16, reach: 50, y: -37, h: 44, knockback: 5.2, hitstun: 24, meterGain: 0, lunge: 4.6, sfx: 'charge' },
  };

  const game = {
    screen: 'title',
    paused: false,
    round: 1,
    playerWins: 0,
    enemyWins: 0,
    timer: 60 * 60,
    introTimer: 0,
    introFightCue: false,
    roundEndTimer: 0,
    roundWinner: null,
    roundReason: '',
    roundResultShown: false,
    koSide: null,
    showResult: false,
    resultTimer: 0,
    hintTimer: 0,
    matchFrames: 0,
    tick: 0,
    hitstop: 0,
    slowmo: 0,
    shake: 0,
    shakeX: 0,
    shakeY: 0,
    bestCombo: 0,
    stats: { maxCombo: 0, damage: 0 },
    flash: 0,
  };

  const input = {
    left: false,
    right: false,
    guard: false,
  };
  const pressed = new Set();
  let lastDirectionTap = { dir: 0, time: 0 };
  let isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900;
  let isPortraitView = window.innerWidth <= 620 && window.innerHeight > window.innerWidth;

  function stageMinX() {
    return isPortraitView ? 150 : 34;
  }
  function stageMaxX() {
    return isPortraitView ? W - 150 : W - 34;
  }

  function emptyControls() {
    return { left: false, right: false, guard: false, jump: false, punch: false, kick: false, special: false, dash: false };
  }

  function makeLemmy() {
    return {
      id: 'lemmy',
      name: 'LEMMY',
      isPlayer: true,
      x: 208,
      y: GROUND,
      vx: 0,
      vy: 0,
      facing: 1,
      maxHealth: 100,
      health: 100,
      displayHealth: 100,
      meter: 0,
      state: 'idle',
      stateTime: 0,
      animTime: 0,
      onGround: true,
      attack: null,
      attackType: null,
      hitLanded: false,
      hits: 0,
      hitTimer: 0,
      lungeDone: false,
      hitStun: 0,
      blockStun: 0,
      invuln: 0,
      flash: 0,
      combo: 0,
      comboTimer: 0,
      maxCombo: 0,
      damageDealt: 0,
      dashTime: 0,
      dashCooldown: 0,
      afterimageTimer: 0,
      width: 22,
      height: 61,
      radius: 11,
      spriteScale: 1.32,
    };
  }

  function makeBramble() {
    return {
      id: 'bramble',
      name: 'BRAMBLE',
      isPlayer: false,
      x: 432,
      y: GROUND,
      vx: 0,
      vy: 0,
      facing: -1,
      maxHealth: 120,
      health: 120,
      displayHealth: 120,
      meter: 0,
      state: 'idle',
      stateTime: 0,
      animTime: 0,
      onGround: true,
      attack: null,
      attackType: null,
      hitLanded: false,
      hits: 0,
      hitTimer: 0,
      lungeDone: false,
      hitStun: 0,
      blockStun: 0,
      invuln: 0,
      flash: 0,
      combo: 0,
      comboTimer: 0,
      maxCombo: 0,
      damageDealt: 0,
      dashTime: 0,
      dashCooldown: 0,
      afterimageTimer: 0,
      width: 36,
      height: 80,
      radius: 18,
      spriteScale: 1.22,
      ai: {
        think: 20,
        cooldown: 30,
        trigger: null,
        airTried: false,
        controls: emptyControls(),
      },
    };
  }

  let player = makeLemmy();
  let enemy = makeBramble();

  const particles = [];
  const afterimages = [];
  const fireflies = [];
  const leaves = [];

  for (let i = 0; i < 30; i++) {
    fireflies.push({
      x: rand(14, W - 14),
      y: rand(90, GROUND - 12),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.006, 0.016),
      amp: rand(5, 18),
      size: Math.random() < 0.22 ? 2 : 1,
      warm: Math.random() < 0.72,
    });
  }
  for (let i = 0; i < 16; i++) {
    leaves.push({
      x: rand(0, W),
      y: rand(-80, GROUND),
      vx: rand(-0.18, 0.16),
      vy: rand(0.1, 0.35),
      phase: rand(0, Math.PI * 2),
      spin: rand(0.01, 0.04),
      size: rand(2, 4),
      color: Math.random() < 0.5 ? '#5b7f45' : '#8e6b4c',
    });
  }

  /* ---------------- Canvas helpers ---------------- */

  function px(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function pixelCircle(g, cx, cy, r, color) {
    g.fillStyle = color;
    const rr = r * r;
    for (let y = -r; y <= r; y++) {
      const span = Math.floor(Math.sqrt(Math.max(0, rr - y * y)));
      g.fillRect(Math.round(cx - span), Math.round(cy + y), span * 2 + 1, 1);
    }
  }

  function dither(g, x, y, w, h, color, step = 3, alpha = 0.25) {
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = color;
    for (let yy = y; yy < y + h; yy += step) {
      for (let xx = x + ((yy / step) % 2) * step; xx < x + w; xx += step * 2) {
        g.fillRect(Math.round(xx), Math.round(yy), 1, 1);
      }
    }
    g.restore();
  }

  function text(g, str, x, y, size, color, align = 'left', shadow = null) {
    g.save();
    g.font = `${size}px "Press Start 2P", monospace`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    if (shadow) {
      g.fillStyle = shadow;
      g.fillText(str, Math.round(x + 1), Math.round(y + 1));
    }
    g.fillStyle = color;
    g.fillText(str, Math.round(x), Math.round(y));
    g.restore();
  }

  /* ---------------- Static scenery ---------------- */

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = W;
  bgCanvas.height = H;
  const bg = bgCanvas.getContext('2d');
  bg.imageSmoothingEnabled = false;

  const fgCanvas = document.createElement('canvas');
  fgCanvas.width = W;
  fgCanvas.height = H;
  const fg = fgCanvas.getContext('2d');
  fg.imageSmoothingEnabled = false;

  function drawPalm(g, x, base, height, lean, color, dark) {
    g.save();
    g.strokeStyle = dark;
    g.lineWidth = 8;
    g.lineCap = 'square';
    g.beginPath();
    g.moveTo(x, base);
    g.quadraticCurveTo(x + lean * 0.35, base - height * 0.55, x + lean, base - height);
    g.stroke();
    g.strokeStyle = color;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(x, base);
    g.quadraticCurveTo(x + lean * 0.35, base - height * 0.55, x + lean, base - height);
    g.stroke();
    const tx = x + lean;
    const ty = base - height;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9;
      const len = 20 + (i % 3) * 7;
      g.strokeStyle = dark;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(tx, ty);
      g.quadraticCurveTo(tx + Math.cos(a) * len * 0.55, ty + Math.sin(a) * len * 0.4 - 4, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.55 + 5);
      g.stroke();
      g.strokeStyle = i % 2 ? color : '#416b4c';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(tx, ty);
      g.quadraticCurveTo(tx + Math.cos(a) * len * 0.55, ty + Math.sin(a) * len * 0.4 - 4, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.55 + 5);
      g.stroke();
    }
    g.restore();
  }

  function drawVine(g, x, y, len, color, leafColor, seed) {
    g.save();
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, y);
    let cx = x;
    let cy = y;
    for (let i = 1; i <= 6; i++) {
      const nx = x + Math.sin(seed + i * 0.7) * 6;
      const ny = y + (len / 6) * i;
      g.quadraticCurveTo(cx, cy + len / 12, nx, ny);
      cx = nx;
      cy = ny;
    }
    g.stroke();
    for (let i = 1; i < 6; i++) {
      const lx = x + Math.sin(seed + i * 1.3) * 8;
      const ly = y + (len / 6) * i;
      g.fillStyle = i % 2 ? leafColor : color;
      g.beginPath();
      g.moveTo(lx, ly);
      g.lineTo(lx + 5, ly + 2);
      g.lineTo(lx + 1, ly + 4);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(lx, ly);
      g.lineTo(lx - 5, ly + 3);
      g.lineTo(lx - 1, ly + 5);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  function drawTorchPost(g, x, base) {
    px(g, x - 3, base - 43, 6, 43, '#33263a');
    px(g, x - 4, base - 44, 8, 4, '#59405a');
    px(g, x - 7, base - 51, 14, 8, '#21192b');
    px(g, x - 5, base - 49, 10, 4, '#6b4556');
    px(g, x - 2, base - 58, 4, 8, '#3d2a3d');
  }

  function buildBackground() {
    // Sky bands
    const sky = ['#0d0b1c', '#121027', '#181330', '#221639', '#2e1b43', '#3d224c', '#512a52', '#6b3357', '#873f5a', '#a64d5b', '#c45c5d', '#dc705e', '#ed8a65'];
    for (let i = 0; i < sky.length; i++) {
      bg.fillStyle = sky[i];
      bg.fillRect(0, i * 18, W, 19);
    }

    // Star field
    let seed = 1337;
    const sr = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 76; i++) {
      const x = Math.floor(sr() * W);
      const y = Math.floor(sr() * 205);
      const s = sr() > 0.85 ? 2 : 1;
      bg.globalAlpha = 0.28 + sr() * 0.55;
      bg.fillStyle = sr() > 0.7 ? '#ffe6b0' : '#c7c3e5';
      bg.fillRect(x, y, s, s);
    }
    bg.globalAlpha = 1;

    // Moon glow
    const moonX = 492;
    const moonY = 92;
    const glow = bg.createRadialGradient(moonX, moonY, 12, moonX, moonY, 82);
    glow.addColorStop(0, 'rgba(255, 230, 176, 0.22)');
    glow.addColorStop(0.45, 'rgba(255, 192, 145, 0.08)');
    glow.addColorStop(1, 'rgba(255, 192, 145, 0)');
    bg.fillStyle = glow;
    bg.fillRect(moonX - 90, moonY - 90, 180, 180);

    pixelCircle(bg, moonX, moonY, 32, '#f5d6a0');
    pixelCircle(bg, moonX - 4, moonY - 5, 29, '#ffe9bb');
    pixelCircle(bg, moonX + 12, moonY - 8, 7, '#f0c98f');
    pixelCircle(bg, moonX - 14, moonY + 10, 5, '#f0c98f');
    pixelCircle(bg, moonX + 6, moonY + 17, 4, '#e8be87');
    pixelCircle(bg, moonX + 19, moonY + 3, 3, '#f0c98f');
    dither(bg, moonX - 30, moonY - 28, 58, 54, '#d8a977', 3, 0.18);

    // Thin clouds
    bg.save();
    bg.globalAlpha = 0.22;
    bg.fillStyle = '#e5a2a1';
    bg.fillRect(326, 74, 84, 2);
    bg.fillRect(382, 84, 54, 2);
    bg.fillRect(210, 120, 72, 2);
    bg.fillRect(258, 128, 36, 2);
    bg.restore();

    // Distant ridges
    bg.fillStyle = '#241a39';
    bg.beginPath();
    bg.moveTo(0, 238);
    bg.lineTo(42, 211);
    bg.lineTo(78, 224);
    bg.lineTo(119, 194);
    bg.lineTo(168, 225);
    bg.lineTo(214, 204);
    bg.lineTo(259, 230);
    bg.lineTo(312, 198);
    bg.lineTo(360, 226);
    bg.lineTo(405, 208);
    bg.lineTo(454, 232);
    bg.lineTo(508, 205);
    bg.lineTo(553, 225);
    bg.lineTo(606, 201);
    bg.lineTo(640, 219);
    bg.lineTo(640, 306);
    bg.lineTo(0, 306);
    bg.closePath();
    bg.fill();

    bg.fillStyle = '#1b1b32';
    bg.beginPath();
    bg.moveTo(0, 262);
    bg.lineTo(53, 234);
    bg.lineTo(92, 249);
    bg.lineTo(144, 226);
    bg.lineTo(188, 251);
    bg.lineTo(240, 235);
    bg.lineTo(290, 257);
    bg.lineTo(337, 232);
    bg.lineTo(388, 251);
    bg.lineTo(442, 231);
    bg.lineTo(491, 256);
    bg.lineTo(546, 238);
    bg.lineTo(597, 255);
    bg.lineTo(640, 237);
    bg.lineTo(640, 306);
    bg.lineTo(0, 306);
    bg.closePath();
    bg.fill();

    // Far canopy
    bg.fillStyle = '#14292d';
    for (let x = -20; x < W + 20; x += 28) {
      const h = 12 + ((x * 13) % 19 + 19) % 19;
      bg.beginPath();
      bg.moveTo(x, 284);
      bg.lineTo(x + 14, 284 - h);
      bg.lineTo(x + 29, 284);
      bg.closePath();
      bg.fill();
    }
    bg.fillStyle = '#0f2328';
    bg.fillRect(0, 280, W, 26);

    // Ruined temple gate in the far distance
    bg.save();
    bg.globalAlpha = 0.78;
    bg.fillStyle = '#2a2438';
    bg.fillRect(262, 214, 116, 8);
    bg.fillRect(266, 222, 14, 84);
    bg.fillRect(360, 222, 14, 84);
    bg.fillStyle = '#3b314b';
    bg.fillRect(262, 212, 116, 3);
    bg.fillRect(266, 222, 3, 84);
    bg.fillRect(360, 222, 3, 84);
    bg.fillStyle = '#211d2f';
    bg.fillRect(280, 222, 80, 4);
    bg.fillRect(280, 250, 80, 2);
    bg.fillRect(280, 280, 80, 2);
    bg.fillStyle = '#352b45';
    bg.beginPath();
    bg.moveTo(254, 214);
    bg.lineTo(320, 188);
    bg.lineTo(386, 214);
    bg.closePath();
    bg.fill();
    bg.fillStyle = '#463a58';
    bg.beginPath();
    bg.moveTo(262, 211);
    bg.lineTo(320, 190);
    bg.lineTo(378, 211);
    bg.closePath();
    bg.fill();
    bg.fillStyle = '#5d466e';
    bg.fillRect(316, 210, 8, 8);
    bg.fillStyle = '#4ecdc4';
    bg.fillRect(318, 212, 4, 4);
    bg.globalAlpha = 0.5;
    bg.fillStyle = '#4ecdc4';
    bg.fillRect(316, 208, 8, 2);
    bg.globalAlpha = 0.9;
    bg.fillStyle = '#46614b';
    bg.fillRect(266, 224, 6, 20);
    bg.fillRect(367, 238, 5, 12);
    bg.fillRect(288, 214, 14, 3);
    bg.fillStyle = '#5f7f4e';
    bg.fillRect(270, 230, 3, 7);
    bg.fillRect(363, 246, 4, 6);
    bg.restore();

    // Side trees
    drawPalm(bg, 22, 315, 152, -11, '#223c3b', '#101f26');
    drawPalm(bg, 618, 315, 176, 15, '#1d3639', '#0d1c24');
    drawPalm(bg, 88, 306, 106, 8, '#1a3036', '#0c1a22');
    drawPalm(bg, 556, 306, 112, -9, '#1c3337', '#0c1a22');

    // Mid trees with thick trunks
    bg.fillStyle = '#172a2c';
    bg.fillRect(6, 188, 25, 118);
    bg.fillRect(609, 170, 25, 136);
    bg.fillStyle = '#27443d';
    bg.fillRect(9, 188, 5, 118);
    bg.fillRect(618, 170, 4, 136);
    bg.fillStyle = '#2b473c';
    for (let i = 0; i < 9; i++) {
      bg.beginPath();
      bg.moveTo(0, 160 + i * 8);
      bg.lineTo(34 + (i % 3) * 12, 139 + i * 9);
      bg.lineTo(58, 169 + i * 8);
      bg.closePath();
      bg.fill();
      bg.beginPath();
      bg.moveTo(640, 142 + i * 9);
      bg.lineTo(606 - (i % 3) * 11, 126 + i * 10);
      bg.lineTo(584, 156 + i * 9);
      bg.closePath();
      bg.fill();
    }

    // Hanging vines
    drawVine(bg, 52, 0, 116, '#2d5142', '#3e7150', 1.4);
    drawVine(bg, 132, 0, 82, '#2a493d', '#3b664a', 3.1);
    drawVine(bg, 570, 0, 96, '#2a4b3f', '#3d6b4d', 4.6);
    drawVine(bg, 606, 0, 128, '#29473c', '#3b654a', 2.2);

    // Torch posts
    drawTorchPost(bg, 67, 307);
    drawTorchPost(bg, 575, 307);

    // Floor
    bg.fillStyle = '#231c2c';
    bg.fillRect(0, GROUND, W, H - GROUND);
    bg.fillStyle = '#2e2438';
    bg.fillRect(0, GROUND + 4, W, H - GROUND - 4);
    bg.fillStyle = '#3a2b42';
    bg.fillRect(0, GROUND + 20, W, 2);
    bg.fillStyle = '#1c1624';
    bg.fillRect(0, GROUND + 36, W, 2);
    for (let x = -20; x < W; x += 58) {
      bg.fillStyle = '#2b2035';
      bg.fillRect(x + 28, GROUND + 4, 2, 16);
      bg.fillRect(x + 5, GROUND + 22, 2, 14);
      bg.fillRect(x + 40, GROUND + 38, 2, 16);
    }
    // Floor cracks and chips
    bg.fillStyle = '#493552';
    bg.fillRect(126, GROUND + 11, 20, 1);
    bg.fillRect(144, GROUND + 12, 2, 4);
    bg.fillRect(394, GROUND + 29, 26, 1);
    bg.fillRect(414, GROUND + 30, 2, 4);
    bg.fillRect(230, GROUND + 44, 14, 1);
    bg.fillStyle = '#5d4465';
    bg.fillRect(92, GROUND + 7, 4, 1);
    bg.fillRect(516, GROUND + 17, 5, 1);
    bg.fillRect(342, GROUND + 34, 3, 1);

    // Grass fringe
    bg.fillStyle = '#4c7650';
    bg.fillRect(0, GROUND - 1, W, 4);
    bg.fillStyle = '#7ba260';
    for (let x = 0; x < W; x += 4) {
      const h = 1 + ((x * 7) % 4);
      bg.fillRect(x, GROUND - h, 2, h);
    }
    bg.fillStyle = '#a4c574';
    for (let x = 1; x < W; x += 11) {
      bg.fillRect(x, GROUND - 2 - ((x * 3) % 3), 1, 2);
    }

    // Small mushrooms and stones
    for (const [x, y, c] of [[103, GROUND + 3, '#8d6b8d'], [487, GROUND + 4, '#a37773'], [544, GROUND + 2, '#79617d']]) {
      bg.fillStyle = c;
      bg.fillRect(x, y, 4, 2);
      bg.fillStyle = '#e5cfa7';
      bg.fillRect(x + 1, y + 2, 2, 1);
    }

    // Vignette-ish edge shadows
    const edge = bg.createLinearGradient(0, 0, 60, 0);
    edge.addColorStop(0, 'rgba(5, 4, 10, 0.45)');
    edge.addColorStop(1, 'rgba(5, 4, 10, 0)');
    bg.fillStyle = edge;
    bg.fillRect(0, 0, 70, H);
    const edge2 = bg.createLinearGradient(W, 0, W - 70, 0);
    edge2.addColorStop(0, 'rgba(5, 4, 10, 0.4)');
    edge2.addColorStop(1, 'rgba(5, 4, 10, 0)');
    bg.fillStyle = edge2;
    bg.fillRect(W - 70, 0, 70, H);
  }

  function buildForeground() {
    // Top leaves
    fg.save();
    fg.globalAlpha = 0.82;
    for (const [x, y, s, flip] of [[-8, -6, 1.2, 1], [78, -12, 0.8, -1], [552, -10, 0.9, 1], [620, -8, 1.2, -1]]) {
      fg.save();
      fg.translate(x, y);
      fg.scale(s * flip, s);
      fg.fillStyle = '#12252a';
      fg.beginPath();
      fg.moveTo(0, 0);
      fg.quadraticCurveTo(30, 14, 62, 6);
      fg.quadraticCurveTo(48, 30, 18, 27);
      fg.quadraticCurveTo(7, 17, 0, 0);
      fg.fill();
      fg.fillStyle = '#1e3b35';
      fg.beginPath();
      fg.moveTo(4, 4);
      fg.quadraticCurveTo(28, 17, 52, 9);
      fg.quadraticCurveTo(37, 23, 19, 22);
      fg.closePath();
      fg.fill();
      fg.restore();
    }
    fg.restore();

    // Bottom corner ferns
    const fern = (x, y, flip) => {
      fg.save();
      fg.translate(x, y);
      fg.scale(flip, 1);
      fg.fillStyle = '#0e2026';
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI * 0.82 + i * 0.2;
        const len = 24 + (i % 3) * 10;
        fg.beginPath();
        fg.moveTo(0, 0);
        fg.quadraticCurveTo(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5 - 10, Math.cos(a) * len, Math.sin(a) * len * 0.5);
        fg.lineTo(Math.cos(a) * len * 0.8, Math.sin(a) * len * 0.5 + 6);
        fg.closePath();
        fg.fill();
      }
      fg.fillStyle = '#18352f';
      fg.beginPath();
      fg.ellipse(0, 0, 28, 10, 0, 0, Math.PI * 2);
      fg.fill();
      fg.restore();
    };
    fern(0, H + 4, 1);
    fern(W, H + 4, -1);

    // A few blades of foreground grass
    fg.fillStyle = '#15282a';
    for (let x = 18; x < W; x += 37) {
      const h = 6 + ((x * 5) % 9);
      fg.beginPath();
      fg.moveTo(x, H);
      fg.quadraticCurveTo(x + 3, H - h, x + 9, H - h - 4);
      fg.lineTo(x + 5, H);
      fg.closePath();
      fg.fill();
    }
  }

  /* ---------------- Audio ---------------- */

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.music = null;
      this.muted = false;
      this.noiseBuffer = null;
      this.nextNote = 0;
      this.step = 0;
    }

    ensure() {
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = 0.22;
          this.master.connect(this.ctx.destination);
          this.music = this.ctx.createGain();
          this.music.gain.value = 0.27;
          this.music.connect(this.master);
          this.noiseBuffer = this.makeNoise();
          this.nextNote = this.ctx.currentTime + 0.08;
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (err) {
        this.ctx = null;
      }
    }

    makeNoise() {
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    }

    setMuted(muted) {
      this.muted = muted;
      if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.22, this.ctx.currentTime, 0.02);
      if (ui.mute) {
        ui.mute.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
        ui.mute.classList.toggle('is-muted', muted);
        ui.mute.setAttribute('aria-pressed', String(muted));
      }
      if (ui.quickMute) {
        ui.quickMute.textContent = muted ? 'OFF' : 'SFX';
        ui.quickMute.classList.toggle('is-muted', muted);
        ui.quickMute.setAttribute('aria-pressed', String(muted));
      }
    }

    tone(freq, dur, type, gain, slideTo = null, when = null, dest = null) {
      if (!this.ctx || this.muted) return;
      const t = when ?? this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t);
      if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(amp);
      amp.connect(dest || this.master);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    }

    noise(dur, gain, freq, when = null, dest = null) {
      if (!this.ctx || this.muted || !this.noiseBuffer) return;
      const t = when ?? this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, t);
      filter.Q.value = 0.8;
      const amp = this.ctx.createGain();
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.005);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(amp);
      amp.connect(dest || this.master);
      src.start(t);
      src.stop(t + dur + 0.02);
    }

    sfx(name) {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      switch (name) {
        case 'punch':
          this.noise(0.07, 0.1, 1300);
          break;
        case 'kick':
          this.noise(0.1, 0.12, 850);
          this.tone(150, 0.07, 'square', 0.04, 80);
          break;
        case 'heavy':
          this.noise(0.14, 0.16, 520);
          this.tone(95, 0.13, 'square', 0.08, 45);
          break;
        case 'hit':
          this.noise(0.1, 0.22, 950);
          this.tone(145, 0.1, 'square', 0.11, 55);
          this.tone(72, 0.14, 'triangle', 0.08, 42);
          break;
        case 'block':
          this.tone(920, 0.06, 'square', 0.07, 560);
          this.noise(0.05, 0.07, 2400);
          break;
        case 'jump':
          this.tone(210, 0.08, 'square', 0.055, 430);
          break;
        case 'land':
          this.noise(0.07, 0.08, 280);
          break;
        case 'dash':
          this.noise(0.14, 0.1, 1800);
          break;
        case 'special':
          this.tone(160, 0.34, 'sawtooth', 0.07, 760);
          this.tone(320, 0.3, 'square', 0.04, 1300);
          this.noise(0.25, 0.06, 1200);
          break;
        case 'charge':
          this.tone(80, 0.55, 'sawtooth', 0.08, 210);
          this.noise(0.4, 0.09, 360);
          break;
        case 'ko':
          this.tone(190, 0.6, 'sawtooth', 0.13, 42);
          this.noise(0.5, 0.14, 520);
          break;
        case 'round':
          [220, 330, 440].forEach((f, i) => this.tone(f, 0.14, 'square', 0.045, null, now + i * 0.1));
          break;
        case 'fight':
          [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.12, 'square', 0.05, null, now + i * 0.075));
          break;
        case 'victory':
          [262, 330, 392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.2, 'square', 0.045, null, now + i * 0.11));
          break;
        case 'click':
          this.tone(620, 0.04, 'square', 0.035, 760);
          break;
        case 'furyReady':
          this.tone(880, 0.1, 'square', 0.05, 1320);
          this.tone(1320, 0.12, 'triangle', 0.04, 1760, now + 0.08);
          break;
        default:
          break;
      }
    }

    tickMusic() {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      while (this.nextNote < now + 0.16) {
        this.scheduleStep(this.step, this.nextNote);
        this.nextNote += 0.235;
        this.step = (this.step + 1) % 32;
      }
    }

    scheduleStep(step, t) {
      const bass = [55, 55, 0, 55, 82.41, 0, 73.42, 55, 55, 55, 0, 65.41, 82.41, 0, 98, 73.42];
      const mel = [440, 0, 523.25, 0, 659.25, 587.33, 523.25, 0, 440, 0, 392, 440, 523.25, 0, 587.33, 0];
      const idx = step % 16;
      const beat = step % 4 === 0;
      if (bass[idx]) this.tone(bass[idx], 0.18, 'triangle', 0.045, null, t, this.music);
      if (mel[idx] && step % 2 === 0) this.tone(mel[idx], 0.12, 'square', 0.018, null, t, this.music);
      if (beat) this.tone(80, 0.09, 'sine', 0.035, 42, t, this.music);
      if (step % 2 === 1) this.noise(0.025, 0.012, 5200, t, this.music);
    }
  }

  const audio = new SoundEngine();

  function ensureAudio() {
    audio.ensure();
  }

  /* ---------------- Portrait ---------------- */

  function buildPortrait() {
    const pc = ui.portrait;
    if (!pc) return;
    const g = pc.getContext('2d');
    g.imageSmoothingEnabled = false;
    const grad = g.createLinearGradient(0, 0, 0, pc.height);
    grad.addColorStop(0, '#4d355d');
    grad.addColorStop(0.55, '#2a203a');
    grad.addColorStop(1, '#16111f');
    g.fillStyle = grad;
    g.fillRect(0, 0, pc.width, pc.height);
    g.save();
    g.globalAlpha = 0.24;
    for (let i = -pc.height; i < pc.width + pc.height; i += 9) {
      g.fillStyle = i % 18 === 0 ? '#ffd166' : '#4ecdc4';
      g.fillRect(i, 0, 2, pc.height);
    }
    g.restore();
    pixelCircle(g, 43, 41, 31, 'rgba(255, 209, 102, 0.12)');
    const fake = {
      x: 42,
      y: 114,
      facing: 1,
      state: 'portrait',
      animTime: 14,
      flash: 0,
      attack: null,
    };
    drawLemmy(g, fake, 1.62, 1);
    g.fillStyle = 'rgba(10, 8, 18, 0.28)';
    g.fillRect(0, 0, pc.width, 3);
    g.fillRect(0, pc.height - 3, pc.width, 3);
  }

  /* ---------------- Lemmy sprite ---------------- */

  function cubic(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
      y: mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1],
    };
  }

  function limb(g, ox, oy, l1, l2, a1, a2, w, color, dark, endColor, foot = false) {
    const ex = ox + Math.cos(a1) * l1;
    const ey = oy + Math.sin(a1) * l1;
    const hx = ex + Math.cos(a1 + a2) * l2;
    const hy = ey + Math.sin(a1 + a2) * l2;

    g.lineCap = 'round';
    g.strokeStyle = dark;
    g.lineWidth = w + 2;
    g.beginPath();
    g.moveTo(ox, oy);
    g.lineTo(ex, ey);
    g.lineTo(hx, hy);
    g.stroke();

    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(ox, oy);
    g.lineTo(ex, ey);
    g.lineTo(hx, hy);
    g.stroke();

    g.fillStyle = color;
    g.beginPath();
    g.arc(ex, ey, w * 0.46, 0, Math.PI * 2);
    g.fill();

    if (foot) {
      px(g, hx - 2, hy - 1, 8, 3, dark);
      px(g, hx - 1, hy - 2, 6, 3, endColor);
      px(g, hx + 3, hy + 1, 3, 1, dark);
    } else {
      px(g, hx - 3, hy - 3, 6, 6, dark);
      px(g, hx - 2, hy - 2, 4, 4, endColor);
      px(g, hx - 1, hy - 1, 2, 2, '#fff4e2');
    }
    return { ex, ey, hx, hy };
  }

  function drawLemmyTail(g, pose, state, t) {
    const sway = pose.tailSway;
    const p0 = [-5, -22 + pose.crouch];
    const p1 = [-21, -25 + pose.crouch - sway * 0.5];
    const p2 = [-35, -51 + sway * 2.2];
    const p3 = [-18 + sway * 5, -66 + sway * 3];
    const pts = [];
    for (let i = 0; i <= 18; i++) pts.push(cubic(p0, p1, p2, p3, i / 18));

    g.lineCap = 'round';
    g.strokeStyle = P.outline;
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      g.strokeStyle = i % 4 < 2 ? '#ded9e6' : '#2c273a';
      g.lineWidth = 5.6 - i * 0.08;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    px(g, pts[18].x - 3, pts[18].y - 3, 6, 6, P.outline);
    px(g, pts[18].x - 2, pts[18].y - 2, 4, 4, '#2c273a');
  }

  function drawLemmyScarfTail(g, pose, t) {
    const wave = Math.sin(t * 0.12) * 3;
    g.fillStyle = P.scarfDark;
    g.beginPath();
    g.moveTo(-5, -42 + pose.crouch);
    g.lineTo(-17, -37 + wave);
    g.lineTo(-29, -40 - wave * 0.4);
    g.lineTo(-24, -32 + wave * 0.5);
    g.lineTo(-10, -34 + pose.crouch);
    g.closePath();
    g.fill();
    g.fillStyle = P.scarf;
    g.beginPath();
    g.moveTo(-5, -43 + pose.crouch);
    g.lineTo(-15, -39 + wave);
    g.lineTo(-24, -42 - wave * 0.3);
    g.lineTo(-19, -35 + wave * 0.4);
    g.lineTo(-8, -37 + pose.crouch);
    g.closePath();
    g.fill();
  }

  function drawLemmyBody(g, pose) {
    const c = pose.crouch;
    g.fillStyle = P.outline;
    g.beginPath();
    g.moveTo(-9, -43 + c);
    g.lineTo(6, -45 + c);
    g.lineTo(11, -34 + c);
    g.lineTo(8, -20 + c);
    g.lineTo(-7, -20 + c);
    g.lineTo(-11, -32 + c);
    g.closePath();
    g.fill();

    g.fillStyle = P.fur;
    g.beginPath();
    g.moveTo(-7, -42 + c);
    g.lineTo(5, -43 + c);
    g.lineTo(9, -34 + c);
    g.lineTo(6, -22 + c);
    g.lineTo(-5, -22 + c);
    g.lineTo(-8, -32 + c);
    g.closePath();
    g.fill();

    g.fillStyle = P.furLight;
    g.beginPath();
    g.moveTo(1, -40 + c);
    g.lineTo(8, -35 + c);
    g.lineTo(6, -24 + c);
    g.lineTo(-1, -23 + c);
    g.lineTo(-3, -33 + c);
    g.closePath();
    g.fill();

    g.fillStyle = '#8c8ca4';
    g.beginPath();
    g.moveTo(-7, -42 + c);
    g.lineTo(-3, -41 + c);
    g.lineTo(-5, -23 + c);
    g.lineTo(-8, -31 + c);
    g.closePath();
    g.fill();

    // belt
    px(g, -7, -25 + c, 15, 4, P.belt);
    px(g, -1, -25 + c, 3, 3, P.gold);
    px(g, 0, -24 + c, 1, 1, '#fff0b2');

    // shoulder tufts
    g.fillStyle = P.furLight;
    px(g, -10, -41 + c, 4, 3, P.furLight);
    px(g, 7, -42 + c, 4, 3, P.furLight);
  }

  function drawLemmyHead(g, pose, f) {
    const c = pose.crouch;
    const hx = 2 + pose.headX;
    const hy = -52 + c + pose.bob + pose.headY;
    const state = f.state;
    const isHurt = state === 'hit' || state === 'ko';
    const isFury = state === 'attack' && f.attackType === 'special';

    g.save();
    g.translate(hx, hy);
    if (pose.headTilt) g.rotate(pose.headTilt);

    // ears
    g.fillStyle = P.outline;
    g.beginPath();
    g.arc(-9, -9, 5.1, 0, Math.PI * 2);
    g.arc(9, -9, 5.1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.fur;
    g.beginPath();
    g.arc(-9, -9, 3.6, 0, Math.PI * 2);
    g.arc(9, -9, 3.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#d8a6ac';
    g.beginPath();
    g.arc(-9, -9, 1.8, 0, Math.PI * 2);
    g.arc(9, -9, 1.8, 0, Math.PI * 2);
    g.fill();

    // head silhouette
    g.fillStyle = P.outline;
    g.beginPath();
    g.arc(0, 0, 13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.fur;
    g.beginPath();
    g.arc(0, 0, 11.5, 0, Math.PI * 2);
    g.fill();

    // face mask
    g.fillStyle = P.face;
    g.beginPath();
    g.moveTo(-4, -8);
    g.lineTo(7, -9);
    g.lineTo(13, -3);
    g.lineTo(11, 5);
    g.lineTo(2, 9);
    g.lineTo(-4, 5);
    g.lineTo(-7, -1);
    g.closePath();
    g.fill();

    // forehead marking
    g.fillStyle = P.furDark;
    g.beginPath();
    g.moveTo(1, -11);
    g.lineTo(7, -10);
    g.lineTo(6, -5);
    g.lineTo(0, -5);
    g.closePath();
    g.fill();
    g.fillStyle = '#2a2434';
    g.beginPath();
    g.moveTo(3, -10);
    g.lineTo(7, -9);
    g.lineTo(6, 1);
    g.lineTo(3, 1);
    g.closePath();
    g.fill();

    // eye patches
    g.fillStyle = '#1a1724';
    g.save();
    g.rotate(-0.16);
    g.beginPath();
    g.ellipse(-2, -2.2, 4.4, 4.9, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.save();
    g.rotate(0.12);
    g.beginPath();
    g.ellipse(7.2, -2.4, 4.2, 4.7, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();

    if (isHurt) {
      g.strokeStyle = P.face;
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(-4, -4);
      g.lineTo(-1, -1);
      g.moveTo(-1, -4);
      g.lineTo(-4, -1);
      g.moveTo(6, -4);
      g.lineTo(9, -1);
      g.moveTo(9, -4);
      g.lineTo(6, -1);
      g.stroke();
    } else {
      const eyeY = -2.3;
      if (isFury) {
        g.fillStyle = 'rgba(255, 209, 102, 0.45)';
        g.fillRect(-4, eyeY - 3, 5, 7);
        g.fillRect(6, eyeY - 3, 5, 7);
      }
      g.fillStyle = isFury ? P.eyeHot : P.eye;
      g.fillRect(-4, eyeY - 2, 4, 4);
      g.fillRect(6, eyeY - 2, 4, 4);
      g.fillStyle = '#241b1c';
      g.fillRect(-2, eyeY - 1, 2, 3);
      g.fillRect(8, eyeY - 1, 2, 3);
      g.fillStyle = '#fff7d0';
      g.fillRect(-4, eyeY - 2, 1, 1);
      g.fillRect(6, eyeY - 2, 1, 1);
    }

    // muzzle
    g.fillStyle = P.faceShade;
    g.beginPath();
    g.ellipse(7, 5, 6, 4, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.face;
    g.beginPath();
    g.ellipse(7, 4, 5, 3, 0, 0, Math.PI * 2);
    g.fill();

    // nose
    g.fillStyle = P.nose;
    g.beginPath();
    g.moveTo(8, 2);
    g.lineTo(13, 3);
    g.lineTo(10, 6);
    g.lineTo(7, 5);
    g.closePath();
    g.fill();
    g.fillStyle = '#51465a';
    g.fillRect(10, 3, 1, 1);

    // mouth
    g.strokeStyle = P.nose;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(9, 6);
    g.lineTo(11, 8);
    g.lineTo(8, 8);
    g.stroke();

    // determined brow
    if (!isHurt) {
      g.strokeStyle = '#3a3147';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(-5, -7);
      g.lineTo(-1, -6);
      g.moveTo(6, -6);
      g.lineTo(10, -7);
      g.stroke();
    }

    // head tuft
    g.fillStyle = P.furLight;
    g.beginPath();
    g.moveTo(-2, -12);
    g.lineTo(2, -16);
    g.lineTo(5, -11);
    g.closePath();
    g.fill();

    g.restore();
  }

  function drawLemmy(g, f, scale = 1, alpha = 1) {
    const t = f.animTime || 0;
    const state = f.state || 'idle';
    const a = f.attack;
    let crouch = 0;
    let bob = 0;
    let headX = 0;
    let headY = 0;
    let headTilt = 0;
    let bodyLean = 0;
    let frontArm = { a1: 1.42, a2: -2.25 };
    let backArm = { a1: 1.3, a2: -2.12 };
    let frontLeg = { a1: 1.5, a2: -0.08 };
    let backLeg = { a1: 1.77, a2: 0.08 };
    let tailSway = Math.sin(t * 0.085) * 0.9;
    let spin = 0;

    if (state === 'idle' || state === 'portrait' || state === 'title') {
      bob = Math.sin(t * 0.13) * 1.1;
      frontArm = { a1: 1.42, a2: -2.25 };
      backArm = { a1: 1.3, a2: -2.1 };
      tailSway = Math.sin(t * 0.08) * (state === 'title' ? 2.1 : 1.0);
      headTilt = Math.sin(t * 0.05) * 0.02;
    } else if (state === 'walk') {
      const sw = Math.sin(t * 0.32);
      bob = Math.abs(Math.cos(t * 0.32)) * 0.8;
      frontLeg = { a1: 1.5 + sw * 0.48, a2: -0.08 - sw * 0.22 };
      backLeg = { a1: 1.77 - sw * 0.48, a2: 0.08 + sw * 0.22 };
      frontArm = { a1: 1.42 - sw * 0.3, a2: -2.25 + sw * 0.15 };
      backArm = { a1: 1.3 + sw * 0.3, a2: -2.1 - sw * 0.15 };
      tailSway = Math.sin(t * 0.16) * 1.5;
    } else if (state === 'jump') {
      bob = 0;
      frontLeg = { a1: 0.9, a2: -1.55 };
      backLeg = { a1: 1.25, a2: -1.45 };
      frontArm = { a1: 0.75, a2: -1.0 };
      backArm = { a1: 1.5, a2: -1.5 };
      tailSway = 2.2;
      headY = -1;
    } else if (state === 'block' || state === 'blockstun') {
      crouch = 2;
      bob = 0;
      frontArm = { a1: 1.02, a2: -1.9 };
      backArm = { a1: 1.2, a2: -2.2 };
      frontLeg = { a1: 1.42, a2: -0.18 };
      backLeg = { a1: 1.68, a2: 0.15 };
      headY = 1.5;
      tailSway = -0.8;
    } else if (state === 'hit') {
      bob = 0;
      bodyLean = -2;
      headX = -1;
      headY = 1;
      headTilt = -0.17;
      frontArm = { a1: 2.2, a2: -1.0 };
      backArm = { a1: 2.45, a2: -0.7 };
      frontLeg = { a1: 1.35, a2: 0.2 };
      backLeg = { a1: 1.55, a2: 0.3 };
      tailSway = 3.4;
    } else if (state === 'ko') {
      frontArm = { a1: 2.3, a2: -0.5 };
      backArm = { a1: 2.1, a2: -0.8 };
      frontLeg = { a1: 1.5, a2: 0.3 };
      backLeg = { a1: 1.8, a2: 0.2 };
      tailSway = 3;
    } else if (state === 'victory') {
      bob = Math.abs(Math.sin(t * 0.16)) * 2;
      frontArm = { a1: -1.15, a2: -0.25 };
      backArm = { a1: -1.45, a2: 0.15 };
      frontLeg = { a1: 1.52, a2: -0.1 };
      backLeg = { a1: 1.76, a2: 0.1 };
      tailSway = Math.sin(t * 0.13) * 2.4;
      headTilt = Math.sin(t * 0.13) * 0.04;
    } else if (state === 'dash') {
      bodyLean = 2.5;
      frontArm = { a1: 2.6, a2: -0.8 };
      backArm = { a1: 2.9, a2: -0.7 };
      frontLeg = { a1: 1.0, a2: -0.3 };
      backLeg = { a1: 2.1, a2: 0.2 };
      tailSway = 3.5;
      headY = 1;
    } else if (state === 'attack') {
      const startup = a ? a.startup : 1;
      const active = a ? a.active : 1;
      const recovery = a ? a.recovery : 1;
      const st = f.stateTime;
      let ext = 0;
      let wind = 0;
      if (st <= startup) wind = st / startup;
      else if (st <= startup + active) ext = 1;
      else ext = Math.max(0, 1 - (st - startup - active) / recovery);
      if (st <= startup) ext = -wind * 0.3;

      if (f.attackType === 'punch') {
        frontArm = { a1: lerp(1.9, 0.0, ext), a2: lerp(-2.1, 0.0, ext) };
        backArm = { a1: 1.8, a2: -1.7 };
        bodyLean = ext * 2.4;
        headX = ext * 0.7;
        tailSway = -1.5 - ext * 2;
        frontLeg = { a1: 1.58, a2: -0.15 };
        backLeg = { a1: 1.85, a2: 0.12 };
      } else if (f.attackType === 'kick') {
        frontLeg = { a1: lerp(1.6, 0.18, ext), a2: lerp(-0.1, 0.02, ext) };
        backLeg = { a1: 1.9, a2: 0.3 };
        frontArm = { a1: 2.4, a2: -0.9 };
        backArm = { a1: -0.6, a2: -0.5 };
        bodyLean = -ext * 2.1;
        headX = -ext * 0.6;
        tailSway = 1 + ext * 2.5;
      } else if (f.attackType === 'jumpKick') {
        frontLeg = { a1: lerp(1.25, 0.25, ext), a2: lerp(-0.3, 0.0, ext) };
        backLeg = { a1: 1.1, a2: -1.45 };
        frontArm = { a1: 0.9, a2: -1.3 };
        backArm = { a1: 2.2, a2: -0.6 };
        bodyLean = -ext * 1.2;
        tailSway = 2.5;
      } else if (f.attackType === 'special') {
        const fury = st > startup;
        frontArm = { a1: 0.2, a2: -0.5 };
        backArm = { a1: 2.9, a2: 0.3 };
        frontLeg = { a1: 1.2, a2: -0.4 };
        backLeg = { a1: 1.8, a2: 0.3 };
        spin = fury ? Math.sin(t * 0.55) * 0.14 : 0;
        tailSway = 3.5;
        headY = fury ? -1 : 0;
        if (fury) bob = Math.sin(t * 0.4) * 1.5;
      } else if (f.attackType === 'bossSwipe') {
        frontArm = { a1: 1.9, a2: -1.1 };
      }
    }

    g.save();
    g.globalAlpha = alpha;
    g.translate(Math.round(f.x), Math.round(f.y));
    g.scale(f.facing * scale, scale);
    if (state === 'ko') {
      g.translate(-3, -2);
      g.rotate(Math.PI * 0.47);
    }
    if (spin) g.rotate(spin);
    if (f.flash > 0 && alpha > 0.8) g.filter = 'brightness(2.4) saturate(0.35)';

    const pose = { crouch, bob, headX, headY, headTilt, tailSway };
    drawLemmyTail(g, pose, state, t);
    drawLemmyScarfTail(g, pose, t);

    if (bodyLean) g.translate(bodyLean, 0);
    limb(g, -2, -21 + crouch, 10, 9, backLeg.a1, backLeg.a2, 5, '#8c8ca4', P.outline, '#e5dfe9', true);
    limb(g, -4, -39 + crouch, 9, 9, backArm.a1, backArm.a2, 4.5, '#8f8fa8', P.outline, '#cfc9d8', false);
    drawLemmyBody(g, pose);

    // scarf band
    g.fillStyle = P.scarfDark;
    g.beginPath();
    g.ellipse(0, -42 + crouch, 9, 3.2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.scarf;
    g.beginPath();
    g.ellipse(0, -43 + crouch, 8.3, 2.6, 0, 0, Math.PI * 2);
    g.fill();
    px(g, -9, -44 + crouch, 4, 3, P.scarfDark);

    limb(g, -2, -21 + crouch, 10, 9, frontLeg.a1, frontLeg.a2, 5.5, P.fur, P.outline, '#f0e9ef', true);
    drawLemmyHead(g, pose, f);
    limb(g, 0, -39 + crouch, 10, 9, frontArm.a1, frontArm.a2, 5, P.furLight, P.outline, P.face, false);

    // wrist wrap on the front arm
    const wx = 2 + Math.cos(frontArm.a1) * 10;
    const wy = -39 + crouch + Math.sin(frontArm.a1) * 10;
    if (state !== 'hit' && state !== 'ko') {
      px(g, wx - 2, wy - 1, 4, 2, P.wrap);
    }

    // attack effects
    if (state === 'attack' && alpha > 0.7) {
      const st = f.stateTime;
      const active = a && st > a.startup && st <= a.startup + a.active;
      if (active && f.attackType === 'punch') {
        g.strokeStyle = 'rgba(255, 238, 184, 0.7)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(20 + i * 3, -43 + i * 3);
          g.lineTo(31 + i * 4, -43 + i * 3);
          g.stroke();
        }
      }
      if (active && f.attackType === 'kick') {
        g.strokeStyle = 'rgba(255, 209, 102, 0.72)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(1, -23, 25, -0.7, 0.55);
        g.stroke();
        g.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(1, -23, 29, -0.6, 0.4);
        g.stroke();
      }
      if (active && f.attackType === 'special') {
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const r = 18 + i * 8;
          const start = (st * 0.2 + i * 1.7) % (Math.PI * 2);
          g.strokeStyle = i % 2 ? 'rgba(255, 209, 102, 0.55)' : 'rgba(78, 205, 196, 0.5)';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(0, -30, r, start, start + 2.2);
          g.stroke();
        }
        g.restore();
      }
    }

    g.filter = 'none';
    g.restore();
  }

  /* ---------------- Bramble sprite ---------------- */

  function drawBrambleMane(g, pose) {
    g.fillStyle = P.bossOutline;
    for (let i = 0; i < 7; i++) {
      const x = -12 - i * 2.2;
      const y = -65 + i * 4 + pose.crouch;
      g.beginPath();
      g.moveTo(x + 6, y);
      g.lineTo(x - 4, y - 6 - (i % 3) * 2);
      g.lineTo(x + 1, y + 5);
      g.closePath();
      g.fill();
    }
  }

  function drawBrambleBody(g, pose) {
    const c = pose.crouch;
    g.fillStyle = P.bossOutline;
    g.beginPath();
    g.moveTo(-18, -56 + c);
    g.lineTo(8, -61 + c);
    g.lineTo(19, -45 + c);
    g.lineTo(17, -26 + c);
    g.lineTo(11, -18 + c);
    g.lineTo(-14, -18 + c);
    g.lineTo(-20, -33 + c);
    g.closePath();
    g.fill();

    g.fillStyle = P.boss;
    g.beginPath();
    g.moveTo(-15, -54 + c);
    g.lineTo(7, -58 + c);
    g.lineTo(16, -44 + c);
    g.lineTo(14, -27 + c);
    g.lineTo(9, -21 + c);
    g.lineTo(-11, -21 + c);
    g.lineTo(-16, -33 + c);
    g.closePath();
    g.fill();

    g.fillStyle = P.bossLight;
    g.beginPath();
    g.moveTo(-8, -51 + c);
    g.lineTo(6, -54 + c);
    g.lineTo(11, -43 + c);
    g.lineTo(8, -31 + c);
    g.lineTo(-6, -31 + c);
    g.closePath();
    g.fill();

    g.fillStyle = P.belly;
    g.beginPath();
    g.moveTo(1, -46 + c);
    g.lineTo(12, -43 + c);
    g.lineTo(11, -27 + c);
    g.lineTo(2, -24 + c);
    g.lineTo(-3, -33 + c);
    g.closePath();
    g.fill();

    // leather harness
    g.strokeStyle = '#3a2628';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(-12, -50 + c);
    g.lineTo(11, -35 + c);
    g.stroke();
    g.fillStyle = '#c7a45c';
    g.fillRect(1, -43 + c, 4, 4);

    // moss clusters
    const moss = [[-13, -50], [-8, -54], [6, -56], [12, -48], [-16, -38], [10, -30], [-7, -22]];
    for (const [mx, my] of moss) {
      g.fillStyle = P.moss;
      g.fillRect(mx, my + c, 4, 2);
      g.fillRect(mx + 1, my - 1 + c, 2, 2);
      g.fillStyle = P.mossLight;
      g.fillRect(mx + 3, my + c, 1, 1);
    }

    // belt
    g.fillStyle = '#2c2027';
    g.fillRect(-13, -24 + c, 27, 5);
    g.fillStyle = '#8f7444';
    g.fillRect(-1, -24 + c, 4, 4);
  }

  function drawBrambleHead(g, pose, f) {
    const c = pose.crouch;
    const hx = 11 + pose.headX;
    const hy = -65 + c + pose.bob + pose.headY;
    const isHurt = f.state === 'hit' || f.state === 'ko';
    const isCharge = f.state === 'attack' && f.attackType === 'bossCharge';

    g.save();
    g.translate(hx, hy);
    if (pose.headTilt) g.rotate(pose.headTilt);

    // ears
    g.fillStyle = P.bossOutline;
    g.beginPath();
    g.moveTo(-11, -9);
    g.lineTo(-18, -18);
    g.lineTo(-6, -16);
    g.closePath();
    g.fill();
    g.fillStyle = P.boss;
    g.beginPath();
    g.moveTo(-11, -10);
    g.lineTo(-15, -16);
    g.lineTo(-7, -14);
    g.closePath();
    g.fill();
    g.fillStyle = '#7f5557';
    g.beginPath();
    g.moveTo(-10, -11);
    g.lineTo(-13, -14);
    g.lineTo(-8, -13);
    g.closePath();
    g.fill();

    // horns
    g.fillStyle = P.tusk;
    g.beginPath();
    g.moveTo(-2, -15);
    g.lineTo(-1, -24);
    g.lineTo(4, -16);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(10, -16);
    g.lineTo(13, -25);
    g.lineTo(16, -14);
    g.closePath();
    g.fill();

    // head
    g.fillStyle = P.bossOutline;
    g.beginPath();
    g.arc(0, 0, 17, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.bossDark;
    g.beginPath();
    g.arc(0, 0, 15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.boss;
    g.beginPath();
    g.arc(-1, -1, 13.5, 0, Math.PI * 2);
    g.fill();

    // snout
    g.fillStyle = P.bossOutline;
    g.beginPath();
    g.ellipse(13, 3, 13, 10, -0.08, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.bossLight;
    g.beginPath();
    g.ellipse(13, 2, 11, 8, -0.08, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.belly;
    g.beginPath();
    g.ellipse(18, 4, 6, 4, -0.08, 0, Math.PI * 2);
    g.fill();

    // nose
    g.fillStyle = '#231a20';
    g.fillRect(23, 0, 5, 4);
    g.fillStyle = '#5e4446';
    g.fillRect(24, 1, 1, 1);
    g.fillRect(27, 1, 1, 1);

    // mouth
    g.strokeStyle = '#2a1b20';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(17, 9);
    g.lineTo(25, 8);
    g.stroke();

    // tusks
    g.fillStyle = P.tusk;
    g.beginPath();
    g.moveTo(20, 7);
    g.lineTo(25, 9);
    g.lineTo(29, 1);
    g.lineTo(33, -8);
    g.lineTo(29, -3);
    g.lineTo(24, 4);
    g.closePath();
    g.fill();
    g.fillStyle = '#d6c398';
    g.beginPath();
    g.moveTo(21, 7);
    g.lineTo(24, 8);
    g.lineTo(29, 0);
    g.lineTo(27, 2);
    g.closePath();
    g.fill();
    g.fillStyle = P.tusk;
    g.beginPath();
    g.moveTo(13, 9);
    g.lineTo(17, 10);
    g.lineTo(19, 2);
    g.lineTo(21, -4);
    g.lineTo(17, 1);
    g.lineTo(14, 5);
    g.closePath();
    g.fill();

    // eye
    const eyeX = 9;
    const eyeY = -5;
    if (isHurt) {
      g.strokeStyle = '#ffd4a6';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(eyeX - 2, eyeY - 2);
      g.lineTo(eyeX + 2, eyeY + 2);
      g.moveTo(eyeX + 2, eyeY - 2);
      g.lineTo(eyeX - 2, eyeY + 2);
      g.stroke();
    } else {
      g.fillStyle = isCharge ? 'rgba(255, 86, 74, 0.4)' : 'rgba(255, 86, 74, 0.18)';
      g.fillRect(eyeX - 4, eyeY - 4, 9, 8);
      g.fillStyle = P.bossEye;
      g.fillRect(eyeX - 2, eyeY - 2, 5, 4);
      g.fillStyle = '#ffd8b0';
      g.fillRect(eyeX - 1, eyeY - 1, 2, 2);
      g.fillStyle = '#3a1018';
      g.fillRect(eyeX + 1, eyeY, 1, 2);
    }

    // brow
    g.strokeStyle = '#241a20';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(5, -9);
    g.lineTo(13, -8);
    g.stroke();

    // moss on head
    g.fillStyle = P.moss;
    g.fillRect(-9, -13, 6, 3);
    g.fillRect(-6, -16, 4, 3);
    g.fillStyle = P.mossLight;
    g.fillRect(-4, -15, 2, 1);

    g.restore();
  }

  function drawBramble(g, f, scale = 1, alpha = 1) {
    const t = f.animTime || 0;
    const state = f.state || 'idle';
    const a = f.attack;
    let crouch = 0;
    let bob = 0;
    let headX = 0;
    let headY = 0;
    let headTilt = 0;
    let bodyLean = 0;
    let frontArm = { a1: 1.15, a2: 1.1 };
    let backArm = { a1: 1.35, a2: 1.0 };
    let frontLeg = { a1: 1.5, a2: 0.08 };
    let backLeg = { a1: 1.8, a2: 0.05 };
    let tailSway = 0;
    let shake = 0;

    if (state === 'idle') {
      bob = Math.sin(t * 0.08) * 1.2;
      frontArm = { a1: 1.18, a2: 1.0 };
      backArm = { a1: 1.38, a2: 0.9 };
      headY = Math.sin(t * 0.08) * 0.6;
      tailSway = Math.sin(t * 0.1) * 2;
    } else if (state === 'walk') {
      const sw = Math.sin(t * 0.22);
      bob = Math.abs(Math.cos(t * 0.22)) * 1.2;
      frontLeg = { a1: 1.5 + sw * 0.32, a2: 0.08 - sw * 0.16 };
      backLeg = { a1: 1.8 - sw * 0.32, a2: 0.05 + sw * 0.16 };
      frontArm = { a1: 1.2 - sw * 0.16, a2: 1.0 };
      backArm = { a1: 1.4 + sw * 0.16, a2: 0.9 };
      tailSway = Math.sin(t * 0.15) * 2.4;
    } else if (state === 'jump') {
      frontLeg = { a1: 0.9, a2: 0.3 };
      backLeg = { a1: 1.2, a2: 0.2 };
      frontArm = { a1: 0.7, a2: 0.5 };
      backArm = { a1: 1.8, a2: 0.4 };
      headY = -2;
      tailSway = 3;
    } else if (state === 'block' || state === 'blockstun') {
      crouch = 3;
      frontArm = { a1: 0.75, a2: 1.7 };
      backArm = { a1: 0.95, a2: 1.9 };
      frontLeg = { a1: 1.38, a2: 0.18 };
      backLeg = { a1: 1.72, a2: 0.2 };
      headY = 2;
      tailSway = -1;
    } else if (state === 'hit') {
      bodyLean = -2.5;
      headX = -1;
      headY = 1;
      headTilt = -0.16;
      frontArm = { a1: 2.1, a2: 0.8 };
      backArm = { a1: 2.4, a2: 0.5 };
      frontLeg = { a1: 1.4, a2: 0.3 };
      backLeg = { a1: 1.65, a2: 0.3 };
      tailSway = 4;
    } else if (state === 'ko') {
      frontArm = { a1: 2.2, a2: 0.4 };
      backArm = { a1: 2.0, a2: 0.5 };
      frontLeg = { a1: 1.4, a2: 0.5 };
      backLeg = { a1: 1.75, a2: 0.4 };
      tailSway = 3;
    } else if (state === 'victory') {
      bob = Math.abs(Math.sin(t * 0.12)) * 2.5;
      frontArm = { a1: -1.2, a2: -0.3 };
      backArm = { a1: -1.5, a2: 0.2 };
      headTilt = Math.sin(t * 0.1) * 0.05;
      tailSway = Math.sin(t * 0.16) * 3;
    } else if (state === 'dash') {
      bodyLean = 4;
      frontArm = { a1: 2.6, a2: 0.4 };
      backArm = { a1: 2.9, a2: 0.2 };
      frontLeg = { a1: 1.05, a2: 0.2 };
      backLeg = { a1: 2.0, a2: 0.3 };
      tailSway = 4;
      headY = 2;
    } else if (state === 'attack') {
      const st = f.stateTime;
      const startup = a ? a.startup : 1;
      const active = a ? a.active : 1;
      const recovery = a ? a.recovery : 1;
      let ext = 0;
      if (st <= startup) ext = -st / startup * 0.35;
      else if (st <= startup + active) ext = 1;
      else ext = Math.max(0, 1 - (st - startup - active) / recovery);

      if (f.attackType === 'bossSwipe') {
        frontArm = { a1: lerp(2.2, 0.05, Math.max(0, ext)), a2: lerp(0.6, 0.0, Math.max(0, ext)) };
        backArm = { a1: 1.8, a2: 1.2 };
        bodyLean = Math.max(0, ext) * 3;
        headX = Math.max(0, ext) * 1.2;
        tailSway = -2;
        frontLeg = { a1: 1.6, a2: 0.1 };
        backLeg = { a1: 1.9, a2: 0.1 };
      } else if (f.attackType === 'bossStomp') {
        frontLeg = { a1: lerp(0.6, 1.8, Math.max(0, ext)), a2: lerp(0.1, 0.0, Math.max(0, ext)) };
        backLeg = { a1: 1.8, a2: 0.1 };
        frontArm = { a1: 1.9, a2: 0.8 };
        backArm = { a1: 2.2, a2: 0.5 };
        bodyLean = 1;
        headY = 2;
        shake = Math.max(0, ext) * 1.5;
      } else if (f.attackType === 'bossCharge') {
        bodyLean = 4;
        frontArm = { a1: 2.75, a2: 0.3 };
        backArm = { a1: 2.95, a2: 0.2 };
        frontLeg = { a1: 1.1, a2: 0.1 };
        backLeg = { a1: 2.0, a2: 0.2 };
        tailSway = 5;
        headY = 2;
        shake = 1;
      }
    }

    g.save();
    g.globalAlpha = alpha;
    g.translate(Math.round(f.x + (shake ? rand(-shake, shake) : 0)), Math.round(f.y));
    g.scale(f.facing * scale, scale);
    if (state === 'ko') {
      g.translate(-5, -3);
      g.rotate(Math.PI * 0.46);
    }
    if (f.flash > 0 && alpha > 0.8) g.filter = 'brightness(2.3) saturate(0.3)';

    const pose = { crouch, bob, headX, headY, headTilt, tailSway };
    drawBrambleMane(g, pose);

    // little tail
    g.strokeStyle = P.bossOutline;
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-14, -27 + crouch);
    g.quadraticCurveTo(-22, -30 + tailSway, -24, -22 + tailSway * 0.4);
    g.stroke();
    g.strokeStyle = P.bossDark;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-14, -27 + crouch);
    g.quadraticCurveTo(-22, -30 + tailSway, -24, -22 + tailSway * 0.4);
    g.stroke();

    if (bodyLean) g.translate(bodyLean, 0);
    limb(g, -8, -23 + crouch, 11, 10, backLeg.a1, backLeg.a2, 7, P.bossDark, P.bossOutline, '#3a2b28', true);
    limb(g, -10, -51 + crouch, 13, 12, backArm.a1, backArm.a2, 8, P.bossDark, P.bossOutline, '#4c3a32', false);
    drawBrambleBody(g, pose);
    limb(g, -8, -23 + crouch, 11, 10, frontLeg.a1, frontLeg.a2, 7.5, P.boss, P.bossOutline, '#5a4238', true);
    drawBrambleHead(g, pose, f);
    limb(g, -2, -52 + crouch, 13, 12, frontArm.a1, frontArm.a2, 8.5, P.boss, P.bossOutline, '#6a5040', false);

    // wrist/ankle cuffs
    if (state !== 'hit' && state !== 'ko') {
      px(g, -5, -43 + crouch, 4, 2, P.moss);
    }

    if (state === 'attack' && alpha > 0.7) {
      const st = f.stateTime;
      const active = a && st > a.startup && st <= a.startup + a.active;
      if (active && f.attackType === 'bossSwipe') {
        g.strokeStyle = 'rgba(255, 211, 137, 0.65)';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(8, -38, 37, -1.1, 0.55);
        g.stroke();
        g.strokeStyle = 'rgba(142, 171, 89, 0.55)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(8, -38, 43, -1.0, 0.45);
        g.stroke();
      }
      if (active && f.attackType === 'bossCharge') {
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = 'rgba(255, 74, 65, 0.18)';
        g.fillRect(-34, -50, 22, 38);
        g.strokeStyle = 'rgba(255, 115, 86, 0.55)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.moveTo(-20 - i * 5, -46 + i * 9);
          g.lineTo(-38 - i * 7, -46 + i * 9);
          g.stroke();
        }
        g.restore();
      }
      if (active && f.attackType === 'bossStomp') {
        g.strokeStyle = 'rgba(255, 211, 137, 0.5)';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(18, -2, 22, 5, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }

    g.filter = 'none';
    g.restore();
  }

  /* ---------------- Fighter simulation ---------------- */

  function updateCommon(f) {
    f.animTime++;
    if (f.invuln > 0) f.invuln--;
    if (f.flash > 0) f.flash--;
    if (f.dashCooldown > 0) f.dashCooldown--;
    if (f.comboTimer > 0) {
      f.comboTimer--;
      if (f.comboTimer === 0) f.combo = 0;
    }
  }

  function autoFace(f) {
    const other = f === player ? enemy : player;
    if (f.onGround && !['attack', 'hit', 'ko', 'dash'].includes(f.state)) {
      f.facing = other.x >= f.x ? 1 : -1;
    }
  }

  function spawnDust(x, y, count = 4, color = '#9b8d9f') {
    for (let i = 0; i < count; i++) {
      particles.push({
        type: 'dust',
        x: x + rand(-6, 6),
        y: y + rand(-2, 1),
        vx: rand(-1.3, 1.3),
        vy: rand(-1.2, -0.2),
        gravity: 0.03,
        drag: 0.94,
        life: randInt(16, 28),
        maxLife: 28,
        size: rand(1, 3),
        color,
        layer: 0,
      });
    }
  }

  function spawnLeaf(x, y) {
    particles.push({
      type: 'leaf',
      x,
      y,
      vx: rand(-0.5, 0.5),
      vy: rand(-0.3, 0.2),
      gravity: 0.02,
      drag: 0.99,
      life: randInt(50, 90),
      maxLife: 90,
      size: rand(2, 4),
      color: Math.random() < 0.5 ? '#8eab59' : '#c47b57',
      layer: 1,
      spin: rand(-0.1, 0.1),
      rot: rand(0, 6.28),
    });
  }

  function physics(f, drag = 1) {
    const wasGround = f.onGround;
    f.x += f.vx;
    f.y += f.vy;
    f.vy += 0.55;
    if (f.vy > 13) f.vy = 13;

    if (f.y >= GROUND) {
      if (!wasGround) {
        if (f.vy > 3) {
          spawnDust(f.x, GROUND, 5, '#a697a7');
          if (f.isPlayer) audio.sfx('land');
        }
      }
      f.y = GROUND;
      f.vy = 0;
      f.onGround = true;
      if (f.state === 'jump') f.state = 'idle';
    } else {
      f.onGround = false;
    }

    f.vx *= drag;
    if (f.onGround && Math.abs(f.vx) < 0.03) f.vx = 0;
    f.x = clamp(f.x, stageMinX(), stageMaxX());
  }

  function startDash(f) {
    f.state = 'dash';
    f.stateTime = 0;
    f.dashTime = 9;
    f.dashCooldown = 48;
    f.vx = f.facing * 5.9;
    f.vy = 0;
    spawnDust(f.x - f.facing * 8, GROUND, 7, '#a697a7');
    if (f.isPlayer) audio.sfx('dash');
  }

  function startAttack(f, type) {
    const a = ATTACKS[type];
    if (!a) return;
    f.attack = { ...a };
    f.attackType = type;
    f.state = 'attack';
    f.stateTime = 0;
    f.hitLanded = false;
    f.hits = 0;
    f.hitTimer = 0;
    f.lungeDone = false;
    if (type === 'special' || type === 'bossCharge') {
      f.meter = 0;
      f.invuln = type === 'special' ? 20 : 0;
      f.flash = 2;
      if (f.isPlayer) audio.sfx('special');
      else audio.sfx('charge');
      spawnDust(f.x - f.facing * 8, GROUND, 8, f.isPlayer ? '#8be6d8' : '#d6815e');
    }
  }

  function endAttack(f) {
    f.attack = null;
    f.attackType = null;
    f.hitLanded = false;
    f.hits = 0;
    f.hitTimer = 0;
    f.state = f.onGround ? 'idle' : 'jump';
  }

  function attackHitbox(f) {
    const a = f.attack;
    if (!a) return null;
    const sc = f.spriteScale || 1;
    const reach = a.reach * sc;
    const front = f.x + f.facing * 9 * sc;
    const x1 = f.facing > 0 ? front : front - reach;
    const x2 = f.facing > 0 ? front + reach : front;
    const cy = f.y + a.y * sc;
    const hh = a.h * sc;
    return {
      x1,
      x2,
      y1: cy - hh / 2,
      y2: cy + hh / 2,
    };
  }

  function hurtbox(f) {
    const w = f.width * f.spriteScale;
    const h = f.height * f.spriteScale;
    return {
      x1: f.x - w / 2,
      x2: f.x + w / 2,
      y1: f.y - h,
      y2: f.y,
    };
  }

  function boxesOverlap(a, b) {
    return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
  }

  function addAfterimage(f) {
    afterimages.push({
      x: f.x,
      y: f.y,
      facing: f.facing,
      id: f.id,
      state: f.state,
      stateTime: f.stateTime,
      animTime: f.animTime,
      attack: f.attack,
      attackType: f.attackType,
      spriteScale: f.spriteScale,
      flash: 0,
      life: 12,
      maxLife: 12,
    });
    if (afterimages.length > 18) afterimages.shift();
  }

  function updateAttack(f) {
    const a = f.attack;
    if (!a) {
      endAttack(f);
      return;
    }
    f.stateTime++;
    const st = f.stateTime;

    if (st === a.startup) {
      if (f.isPlayer) audio.sfx(a.sfx);
      else if (a.sfx === 'heavy') audio.sfx('heavy');
      else if (a.sfx === 'charge') audio.sfx('charge');
    }

    if (st > a.startup && st <= a.startup + a.active) {
      if (!f.lungeDone && a.lunge) {
        f.vx += f.facing * a.lunge;
        f.lungeDone = true;
        spawnDust(f.x - f.facing * 5, GROUND, 3, f.isPlayer ? '#c7b9cf' : '#b07a5c');
      }
      if (a.multi) {
        f.hitTimer--;
        if (f.hitTimer <= 0 && f.hits < a.maxHits) {
          tryAttackHit(f);
          f.hitTimer = a.multi;
        }
      } else if (!f.hitLanded) {
        tryAttackHit(f);
      }
      if (a.air) {
        if (st % 2 === 0) spawnDust(f.x, f.y + 5, 1, '#b6a7c3');
      }
      if (a === ATTACKS.special || f.attackType === 'bossCharge') {
        if (st % 2 === 0) addAfterimage(f);
        if (st % 3 === 0) spawnDust(f.x - f.facing * 10, GROUND, 1, f.isPlayer ? '#78d8cd' : '#d6815e');
      }
    }

    if (a === ATTACKS.bossCharge && st > a.startup && st <= a.startup + a.active) {
      f.vx = f.facing * 4.6;
    }

    physics(f, f.onGround ? 0.86 : 0.985);

    if (a.air && f.onGround) {
      endAttack(f);
      return;
    }

    if (f.stateTime >= a.startup + a.active + a.recovery) {
      endAttack(f);
    }
  }

  function updateFighter(f, c) {
    updateCommon(f);

    if (f.state === 'ko') {
      physics(f, 0.965);
      return;
    }

    if (f.state === 'hit') {
      f.hitStun--;
      physics(f, 0.9);
      if (f.hitStun <= 0 && f.onGround) f.state = 'idle';
      return;
    }

    if (f.state === 'blockstun') {
      f.blockStun--;
      physics(f, 0.86);
      if (f.blockStun <= 0) f.state = c.guard && f.onGround ? 'block' : 'idle';
      return;
    }

    if (f.state === 'dash') {
      f.dashTime--;
      f.stateTime++;
      if (f.stateTime % 2 === 0) addAfterimage(f);
      if (f.dashTime <= 0) {
        f.state = 'idle';
        f.vx *= 0.35;
      }
      physics(f, 0.985);
      return;
    }

    if (f.state === 'attack') {
      updateAttack(f);
      return;
    }

    autoFace(f);
    const move = (c.right ? 1 : 0) - (c.left ? 1 : 0);

    if (c.jump && f.onGround) {
      f.vy = -8.5;
      f.onGround = false;
      f.state = 'jump';
      f.vx = move * 2.15;
      spawnDust(f.x, GROUND, 5, '#b9a9be');
      if (f.isPlayer) audio.sfx('jump');
      physics(f, 0.99);
      return;
    }

    if (c.dash && f.onGround && f.dashCooldown <= 0) {
      startDash(f);
      physics(f, 0.99);
      return;
    }

    if (f.onGround && c.guard) {
      f.state = 'block';
      f.vx = 0;
    } else if (f.onGround) {
      if (move !== 0) {
        f.state = 'walk';
        f.vx = move * (f.isPlayer ? 2.25 : 1.72);
      } else {
        f.state = 'idle';
        f.vx *= 0.55;
      }
    } else {
      f.state = 'jump';
      f.vx = clamp(f.vx + move * 0.22, -3.4, 3.4);
    }

    if (c.special && f.meter >= 100) {
      startAttack(f, f.isPlayer ? 'special' : 'bossCharge');
    } else if (c.punch) {
      startAttack(f, f.onGround ? (f.isPlayer ? 'punch' : 'bossSwipe') : 'jumpKick');
    } else if (c.kick) {
      startAttack(f, f.onGround ? (f.isPlayer ? 'kick' : 'bossStomp') : 'jumpKick');
    }

    physics(f, f.onGround ? 1 : 0.99);
  }

  function tryAttackHit(f) {
    const a = f.attack;
    if (!a) return;
    const def = f === player ? enemy : player;
    if (def.state === 'ko' || def.invuln > 0) return;
    if (a.multi && f.hits >= a.maxHits) return;
    const hb = attackHitbox(f);
    const hurt = hurtbox(def);
    if (!boxesOverlap(hb, hurt)) return;
    resolveHit(f, def, a, hb);
    f.hitLanded = true;
    f.hits++;
  }

  function spawnHitSpark(x, y, color, big = false) {
    const n = big ? 13 : 8;
    for (let i = 0; i < n; i++) {
      const ang = rand(-Math.PI, Math.PI);
      const sp = rand(1.2, big ? 5.2 : 3.6);
      particles.push({
        type: 'spark',
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        gravity: 0.14,
        drag: 0.93,
        life: randInt(12, big ? 28 : 22),
        maxLife: 28,
        size: rand(1, big ? 4 : 3),
        color: Math.random() < 0.4 ? '#fff4d6' : color,
        layer: 1,
      });
    }
    particles.push({ type: 'ring', x, y, vx: 0, vy: 0, gravity: 0, drag: 1, life: big ? 16 : 11, maxLife: 16, size: big ? 7 : 4, color, layer: 1 });
    particles.push({ type: 'star', x, y, vx: 0, vy: 0, gravity: 0, drag: 1, life: big ? 13 : 9, maxLife: 13, size: big ? 15 : 10, color: '#fff8db', layer: 1 });
  }

  function addDamageNumber(x, y, value, color = '#fff2d2') {
    particles.push({
      type: 'text',
      x,
      y,
      vx: rand(-0.25, 0.25),
      vy: -1.25,
      gravity: 0.02,
      drag: 0.99,
      life: 42,
      maxLife: 42,
      size: 8,
      color,
      text: String(value),
      layer: 1,
    });
  }

  function resolveHit(attacker, defender, a, hb) {
    const facingAttacker = sign(attacker.x - defender.x);
    const blocked = defender.state === 'block' && defender.onGround && defender.facing === facingAttacker;
    const hitX = clamp((hb.x1 + hb.x2) / 2, Math.min(attacker.x, defender.x), Math.max(attacker.x, defender.x));
    const hitY = defender.y - (defender.isPlayer ? 44 : 55);

    if (blocked) {
      const chip = Math.max(1, Math.round(a.damage * 0.16));
      defender.health = Math.max(0, defender.health - chip);
      defender.state = 'blockstun';
      defender.blockStun = 9;
      defender.vx = attacker.facing * 1.6;
      defender.flash = 2;
      attacker.meter = clamp(attacker.meter + 4, 0, 100);
      defender.meter = clamp(defender.meter + 5, 0, 100);
      spawnHitSpark(hitX, hitY, '#7de8e0', false);
      addDamageNumber(hitX, hitY - 8, chip, '#9ef7ee');
      audio.sfx('block');
      game.hitstop = Math.max(game.hitstop, 3);
      game.shake = Math.max(game.shake, 2);
      if (defender.health <= 0) triggerKO(defender, attacker);
      return;
    }

    const damage = a.damage;
    defender.health = Math.max(0, defender.health - damage);
    defender.state = 'hit';
    defender.stateTime = 0;
    defender.hitStun = a.hitstun;
    defender.vx = attacker.facing * a.knockback;
    defender.vy = a.damage >= 11 ? -2.2 : 0;
    defender.onGround = a.damage >= 11 ? false : defender.onGround;
    defender.facing = facingAttacker;
    defender.flash = 5;
    attacker.meter = clamp(attacker.meter + a.meterGain, 0, 100);
    defender.meter = clamp(defender.meter + 4, 0, 100);
    attacker.combo++;
    attacker.comboTimer = 78;
    attacker.maxCombo = Math.max(attacker.maxCombo, attacker.combo);
    attacker.damageDealt += damage;
    if (attacker.isPlayer) {
      game.stats.maxCombo = Math.max(game.stats.maxCombo, attacker.combo);
      game.stats.damage += damage;
      if (attacker.combo >= 2) showCombo('player', attacker.combo);
      if (attacker.meter >= 100 && attacker.meter - a.meterGain < 100) audio.sfx('furyReady');
    } else if (attacker.combo >= 2) {
      showCombo('enemy', attacker.combo);
    }

    const color = attacker.isPlayer ? '#ffd166' : '#ff8b6b';
    spawnHitSpark(hitX, hitY, color, damage >= 10);
    addDamageNumber(hitX, hitY - 10, damage, attacker.isPlayer ? '#fff2d2' : '#ffc0a8');
    if (damage >= 10) {
      for (let i = 0; i < 3; i++) spawnDust(hitX, hitY, 2, '#e3d0c5');
    }
    audio.sfx('hit');
    game.hitstop = Math.max(game.hitstop, clamp(3 + Math.round(damage * 0.45), 4, 11));
    game.shake = Math.max(game.shake, clamp(2 + damage * 0.38, 3, 11));
    game.flash = Math.max(game.flash, damage >= 10 ? 4 : 0);

    if (defender.health <= 0) triggerKO(defender, attacker);
  }

  function triggerKO(defender, attacker) {
    defender.state = 'ko';
    defender.stateTime = 0;
    defender.hitStun = 0;
    defender.vx = attacker.facing * 4.2;
    defender.vy = -5.4;
    defender.onGround = false;
    defender.invuln = 999;
    game.koSide = defender.isPlayer ? 'enemy' : 'player';
    game.slowmo = 34;
    game.hitstop = Math.max(game.hitstop, 8);
    game.shake = Math.max(game.shake, 12);
    game.flash = 6;
    audio.sfx('ko');
    spawnHitSpark(defender.x, defender.y - 30, '#ff8b6b', true);
    for (let i = 0; i < 18; i++) spawnLeaf(defender.x + rand(-16, 16), defender.y - rand(10, 60));
  }

  /* ---------------- Opponent brain ---------------- */

  function updateAIThink() {
    const ai = enemy.ai;
    ai.think--;
    ai.cooldown--;
    if (game.screen !== 'fight' || enemy.state === 'ko') return;
    const dist = Math.abs(player.x - enemy.x);

    if (!enemy.onGround) {
      if (!ai.airTried && ai.think <= 0 && dist < 92 && enemy.state === 'jump') {
        ai.trigger = 'kick';
        ai.airTried = true;
        ai.think = 28;
      }
      return;
    }
    ai.airTried = false;
    if (enemy.state === 'hit' || enemy.state === 'blockstun' || enemy.state === 'attack') return;
    if (ai.think > 0) return;

    ai.controls = emptyControls();
    ai.think = 8 + randInt(0, 11);
    const toward = player.x < enemy.x ? 'left' : 'right';
    const away = toward === 'left' ? 'right' : 'left';
    const threat = player.state === 'attack' && dist < 102;
    const lowHealth = enemy.health / enemy.maxHealth < 0.36;
    const playerLow = player.health / player.maxHealth < 0.3;

    // Guard against obvious pressure.
    if (threat && Math.random() < (lowHealth ? 0.62 : 0.44)) {
      ai.controls.guard = true;
      ai.think = 13 + randInt(0, 9);
      return;
    }

    // Fury charge from mid range.
    if (enemy.meter >= 100 && dist > 38 && dist < 118 && Math.random() < 0.68) {
      ai.trigger = 'special';
      ai.cooldown = 62;
      ai.think = 18;
      return;
    }

    if (dist > 148) {
      ai.controls[toward] = true;
      if (Math.random() < 0.13) {
        ai.trigger = 'jump';
        ai.think = 25;
      } else if (Math.random() < 0.18 && ai.cooldown <= 0) {
        ai.trigger = 'dash';
        ai.cooldown = 75;
        ai.think = 15;
      } else {
        ai.think = 18 + randInt(0, 9);
      }
      return;
    }

    if (dist > 78) {
      if (Math.random() < 0.78) ai.controls[toward] = true;
      if (Math.random() < 0.11) ai.trigger = 'jump';
      if (Math.random() < 0.09) ai.controls.guard = true;
      ai.think = 15 + randInt(0, 10);
      return;
    }

    if (dist < 36) {
      if (Math.random() < 0.52) ai.controls[away] = true;
      else if (Math.random() < 0.3) ai.controls.guard = true;
      ai.think = 12 + randInt(0, 7);
      return;
    }

    if (ai.cooldown <= 0) {
      const r = Math.random();
      const aggression = lowHealth || playerLow ? 0.1 : 0;
      if (r < 0.34 + aggression) {
        ai.trigger = 'punch';
        ai.cooldown = 27 + randInt(0, 16);
        ai.think = 8 + randInt(0, 5);
      } else if (r < 0.63 + aggression) {
        ai.trigger = 'kick';
        ai.cooldown = 40 + randInt(0, 20);
        ai.think = 10 + randInt(0, 5);
      } else if (r < 0.76) {
        ai.controls.guard = true;
        ai.think = 13 + randInt(0, 8);
      } else if (r < 0.9) {
        ai.controls[away] = true;
        ai.think = 12 + randInt(0, 7);
      } else {
        ai.think = 10 + randInt(0, 8);
      }
    } else {
      if (Math.random() < 0.32) ai.controls.guard = true;
      else if (Math.random() < 0.45) ai.controls[toward] = true;
      ai.think = 10 + randInt(0, 7);
    }
  }

  function getAIControls() {
    const ai = enemy.ai;
    const c = {
      left: ai.controls.left,
      right: ai.controls.right,
      guard: ai.controls.guard,
      jump: ai.trigger === 'jump',
      punch: ai.trigger === 'punch',
      kick: ai.trigger === 'kick',
      special: ai.trigger === 'special',
      dash: ai.trigger === 'dash',
    };
    ai.trigger = null;
    return c;
  }

  function pushFightersApart() {
    if (player.state === 'ko' || enemy.state === 'ko') return;
    const dx = enemy.x - player.x;
    const min = player.radius * player.spriteScale + enemy.radius * enemy.spriteScale;
    if (Math.abs(dx) < min) {
      const overlap = min - Math.abs(dx);
      const dir = dx === 0 ? 1 : sign(dx);
      const playerAnchored = player.state === 'idle' || player.state === 'block';
      const enemyAnchored = enemy.state === 'idle' || enemy.state === 'block';
      let pPush = 0.5;
      if (playerAnchored && !enemyAnchored) pPush = 0.12;
      else if (!playerAnchored && enemyAnchored) pPush = 0.88;
      player.x -= overlap * pPush * dir;
      enemy.x += overlap * (1 - pPush) * dir;
      player.x = clamp(player.x, stageMinX(), stageMaxX());
      enemy.x = clamp(enemy.x, stageMinX(), stageMaxX());
    }
  }

  /* ---------------- Match flow ---------------- */

  function resetRoundFighters() {
    const pMeter = player.meter;
    const eMeter = enemy.meter;
    player = makeLemmy();
    enemy = makeBramble();
    player.meter = Math.min(35, pMeter * 0.5);
    enemy.meter = Math.min(35, eMeter * 0.5);
    player.displayHealth = player.health;
    enemy.displayHealth = enemy.health;
    particles.length = 0;
    afterimages.length = 0;
  }

  function startMatch() {
    ensureAudio();
    audio.sfx('click');
    game.round = 1;
    game.playerWins = 0;
    game.enemyWins = 0;
    game.stats = { maxCombo: 0, damage: 0 };
    game.matchFrames = 0;
    game.koSide = null;
    game.showResult = false;
    game.paused = false;
    player = makeLemmy();
    enemy = makeBramble();
    startRound();
  }

  function startRound() {
    resetRoundFighters();
    game.screen = 'intro';
    game.introTimer = 150;
    game.introFightCue = false;
    game.roundEndTimer = 0;
    game.roundWinner = null;
    game.roundReason = '';
    game.roundResultShown = false;
    game.koSide = null;
    game.timer = 60 * 60;
    game.paused = false;
    game.hintTimer = 0;
    game.slowmo = 0;
    game.hitstop = 0;
    game.shake = 0;
    ui.result.classList.add('is-hidden');
    ui.pause.classList.add('is-hidden');
    announce(`ROUND ${game.round}`, 'tone-cream', 760);
    audio.sfx('round');
    updateHUD();
    syncScreens();
  }

  function endRound(winner, reason) {
    if (game.screen !== 'fight') return;
    game.screen = 'roundEnd';
    game.roundEndTimer = 200;
    game.roundWinner = winner;
    game.roundReason = reason;
    game.roundResultShown = false;
    game.hintTimer = 0;

    if (winner === 'player') game.playerWins++;
    else if (winner === 'enemy') game.enemyWins++;

    if (reason === 'ko') {
      announce('K.O.', 'tone-red', 1150);
      game.slowmo = Math.max(game.slowmo, 24);
    } else {
      announce(winner === null ? 'DRAW!' : 'TIME!', 'tone-gold', 1000);
    }
    updateHUD();
    syncScreens();
  }

  function endRoundByTime() {
    if (game.screen !== 'fight') return;
    let winner = null;
    if (player.health > enemy.health) winner = 'player';
    else if (enemy.health > player.health) winner = 'enemy';
    endRound(winner, 'time');
  }

  function finishMatch() {
    game.screen = 'matchEnd';
    game.showResult = false;
    game.resultTimer = 62;
    game.paused = false;
    game.koSide = null;
    if (game.playerWins >= 2) {
      player.state = 'victory';
      enemy.state = 'ko';
      enemy.onGround = false;
      enemy.vy = -3;
      audio.sfx('victory');
    } else {
      enemy.state = 'victory';
      player.state = 'ko';
      player.onGround = false;
      player.vy = -3;
    }
    updateHUD();
    syncScreens();
  }

  function showResultScreen() {
    game.showResult = true;
    const won = game.playerWins >= 2;
    const totalSeconds = Math.floor(game.matchFrames / 60);
    const mm = Math.floor(totalSeconds / 60);
    const ss = pad2(totalSeconds % 60);
    ui.resultKicker.textContent = won ? 'LEVEL 1 CLEAR' : 'LEVEL 1 FAILED';
    ui.resultTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
    ui.resultRounds.textContent = `${game.playerWins}-${game.enemyWins}`;
    ui.resultCombo.textContent = String(game.stats.maxCombo);
    ui.resultDamage.textContent = String(game.stats.damage);
    ui.resultTime.textContent = `${mm}:${ss}`;
    ui.resultLine.textContent = won
      ? (game.playerWins === 2 && game.enemyWins === 0 ? 'A flawless tailspin. The forest approves.' : 'The tail has spoken. Bramble yields.')
      : 'Bramble holds the grove. Shake it off and try again.';
    let rank = 'C';
    if (won) {
      rank = game.stats.maxCombo >= 6 ? 'S' : game.stats.maxCombo >= 3 ? 'A' : 'B';
      if (game.enemyWins === 0 && game.stats.maxCombo >= 4) rank = 'S';
    } else {
      rank = game.playerWins >= 1 ? 'D' : 'E';
    }
    ui.resultRank.textContent = rank;
    ui.resultPanel.classList.toggle('loss', !won);
    if (game.stats.maxCombo > game.bestCombo) {
      game.bestCombo = game.stats.maxCombo;
      try { localStorage.setItem('lemmyBestCombo', String(game.bestCombo)); } catch (err) {}
    }
    ui.bestCombo.textContent = String(game.bestCombo);
    ui.result.classList.remove('is-hidden');
    syncScreens();
  }

  function showTitle() {
    game.screen = 'title';
    game.paused = false;
    game.showResult = false;
    game.koSide = null;
    game.hintTimer = 0;
    game.slowmo = 0;
    game.hitstop = 0;
    player = makeLemmy();
    enemy = makeBramble();
    particles.length = 0;
    afterimages.length = 0;
    ui.result.classList.add('is-hidden');
    ui.pause.classList.add('is-hidden');
    ui.bestCombo.textContent = String(game.bestCombo);
    syncScreens();
    updateHUD();
  }

  function togglePause() {
    if (!['fight', 'intro', 'roundEnd'].includes(game.screen)) return;
    game.paused = !game.paused;
    if (game.paused) {
      input.left = input.right = input.guard = false;
      pressed.clear();
      audio.sfx('click');
    }
    syncScreens();
  }

  function resumeMatch() {
    if (!game.paused) return;
    game.paused = false;
    syncScreens();
    audio.sfx('click');
  }

  function quitToTitle() {
    game.paused = false;
    audio.sfx('click');
    showTitle();
  }

  /* ---------------- Frame updates ---------------- */

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      if (p.type === 'leaf') p.rot += p.spin;
      if (p.type === 'dust') p.size *= 0.99;
    }
    if (particles.length > 260) particles.splice(0, particles.length - 260);
  }

  function updateAfterimages() {
    for (let i = afterimages.length - 1; i >= 0; i--) {
      afterimages[i].life--;
      if (afterimages[i].life <= 0) afterimages.splice(i, 1);
    }
  }

  function updateAmbient() {
    for (const leaf of leaves) {
      leaf.x += leaf.vx + Math.sin((game.tick + leaf.phase * 20) * 0.012) * 0.09;
      leaf.y += leaf.vy;
      leaf.phase += 0.01;
      if (leaf.y > H + 8) {
        leaf.y = -8;
        leaf.x = rand(0, W);
      }
      if (leaf.x < -10) leaf.x = W + 8;
      if (leaf.x > W + 10) leaf.x = -8;
    }
  }

  function updateDisplayHealth() {
    for (const f of [player, enemy]) {
      if (f.displayHealth > f.health) f.displayHealth = Math.max(f.health, f.displayHealth - 0.85);
      else if (f.displayHealth < f.health) f.displayHealth = f.health;
    }
  }

  function buildPlayerControls() {
    return {
      left: input.left,
      right: input.right,
      guard: input.guard,
      jump: pressed.delete('jump'),
      punch: pressed.delete('punch'),
      kick: pressed.delete('kick'),
      special: pressed.delete('special'),
      dash: pressed.delete('dash'),
    };
  }

  function updateTitle() {
    // The title scene is mostly procedural; keep ambient motion alive.
  }

  function updateIntro() {
    const pControls = emptyControls();
    const eControls = emptyControls();
    updateFighter(player, pControls);
    updateFighter(enemy, eControls);
    pushFightersApart();
    game.introTimer--;
    if (game.introTimer <= 82 && !game.introFightCue) {
      game.introFightCue = true;
      announce('FIGHT!', 'tone-gold', 700);
      audio.sfx('fight');
    }
    if (game.introTimer <= 0) {
      game.screen = 'fight';
      game.hintTimer = 400;
      announce('FIGHT!', 'tone-gold', 620);
      syncScreens();
    }
  }

  function updateFight() {
    game.matchFrames++;
    updateAIThink();
    const pc = buildPlayerControls();
    const ec = getAIControls();
    updateFighter(player, pc);
    updateFighter(enemy, ec);
    pushFightersApart();
    game.timer--;
    if (game.hintTimer > 0) game.hintTimer--;
    updateDisplayHealth();

    if (game.koSide) {
      endRound(game.koSide, 'ko');
      return;
    }
    if (game.timer <= 0) {
      game.timer = 0;
      endRoundByTime();
    }
  }

  function updateDramaFighter(f) {
    updateCommon(f);
    if (f.state === 'ko') {
      physics(f, 0.96);
    } else {
      if (f.onGround && f.state !== 'victory') f.state = 'idle';
      physics(f, 0.86);
    }
  }

  function updateRoundEnd() {
    updateDramaFighter(player);
    updateDramaFighter(enemy);
    pushFightersApart();
    game.roundEndTimer--;
    updateDisplayHealth();

    if (!game.roundResultShown && game.roundEndTimer <= 130) {
      game.roundResultShown = true;
      if (game.roundWinner === 'player') {
        player.state = 'victory';
        player.vx = 0;
        if (enemy.state !== 'ko') {
          enemy.state = 'ko';
          enemy.onGround = false;
          enemy.vy = -2.5;
        }
        const perfect = player.health >= player.maxHealth;
        announce(perfect ? 'PERFECT!' : 'LEMMY WINS', perfect ? 'tone-teal' : 'tone-gold', 1300);
        audio.sfx('victory');
      } else if (game.roundWinner === 'enemy') {
        enemy.state = 'victory';
        enemy.vx = 0;
        if (player.state !== 'ko') {
          player.state = 'ko';
          player.onGround = false;
          player.vy = -2.5;
        }
        announce('BRAMBLE WINS', 'tone-red', 1300);
      } else {
        announce('DRAW', 'tone-cream', 1200);
      }
      updateHUD();
    }

    if (game.roundEndTimer <= 0) {
      if (game.playerWins >= 2 || game.enemyWins >= 2) {
        finishMatch();
      } else {
        game.round++;
        startRound();
      }
    }
  }

  function updateMatchEnd() {
    updateDramaFighter(player);
    updateDramaFighter(enemy);
    game.resultTimer--;
    updateDisplayHealth();
    if (game.resultTimer <= 0 && !game.showResult) {
      showResultScreen();
    }
  }

  function updateShake() {
    if (game.shake > 0.15) {
      game.shake *= 0.86;
      game.shakeX = rand(-game.shake, game.shake);
      game.shakeY = rand(-game.shake, game.shake);
    } else {
      game.shake = 0;
      game.shakeX = 0;
      game.shakeY = 0;
    }
    if (game.flash > 0) game.flash--;
  }

  function update() {
    game.tick++;
    updateAmbient();

    if (game.paused) {
      return;
    }

    if (game.screen === 'title') {
      updateTitle();
      return;
    }

    if (game.hitstop > 0) {
      game.hitstop--;
      updateShake();
      updateHUD();
      return;
    }

    if (game.slowmo > 0) {
      game.slowmo--;
      if (game.tick % 2 === 0) {
        updateShake();
        updateHUD();
        return;
      }
    }

    if (game.screen === 'intro') updateIntro();
    else if (game.screen === 'fight') updateFight();
    else if (game.screen === 'roundEnd') updateRoundEnd();
    else if (game.screen === 'matchEnd') updateMatchEnd();

    updateParticles();
    updateAfterimages();
    updateShake();
    updateHUD();
    pressed.clear();
  }

  /* ---------------- HUD / overlays ---------------- */

  let announceTimer = null;

  function announce(str, tone = 'tone-gold', duration = 900) {
    ui.announceText.textContent = str;
    ui.announce.className = `announce ${tone}`;
    void ui.announce.offsetWidth;
    ui.announce.classList.add('show');
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => ui.announce.classList.remove('show'), duration);
  }

  function showCombo(side, count) {
    const el = side === 'player' ? ui.playerCombo : ui.enemyCombo;
    const strong = el.querySelector('strong');
    strong.textContent = String(count);
    clearTimeout(el._hideTimer);
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    el._hideTimer = setTimeout(() => el.classList.remove('show'), 760);
  }

  function updateHUD() {
    const pPct = clamp((player.health / player.maxHealth) * 100, 0, 100);
    const ePct = clamp((enemy.health / enemy.maxHealth) * 100, 0, 100);
    const pLag = clamp((player.displayHealth / player.maxHealth) * 100, 0, 100);
    const eLag = clamp((enemy.displayHealth / enemy.maxHealth) * 100, 0, 100);

    ui.playerHealth.style.width = `${pPct}%`;
    ui.enemyHealth.style.width = `${ePct}%`;
    ui.playerLag.style.width = `${pLag}%`;
    ui.enemyLag.style.width = `${eLag}%`;
    ui.playerHealth.classList.toggle('is-low', pPct < 32);
    ui.playerHealth.classList.toggle('is-critical', pPct < 16);
    ui.enemyHealth.classList.toggle('is-low', ePct < 32);
    ui.enemyHealth.classList.toggle('is-critical', ePct < 16);

    ui.playerMeter.style.width = `${player.meter}%`;
    ui.enemyMeter.style.width = `${enemy.meter}%`;
    ui.playerMeter.classList.toggle('is-ready', player.meter >= 100);
    ui.enemyMeter.classList.toggle('is-ready', enemy.meter >= 100);
    ui.playerReady.classList.toggle('is-on', player.meter >= 100);
    const furyBtn = ui.touch.querySelector('[data-act="special"]');
    if (furyBtn) furyBtn.classList.toggle('is-ready', player.meter >= 100);

    const seconds = Math.ceil(game.timer / 60);
    ui.timer.textContent = String(seconds);
    ui.timerShell.classList.toggle('is-critical', seconds <= 10 && game.screen === 'fight');
    ui.roundReadout.textContent = game.screen === 'title' ? 'LEVEL 1' : `ROUND ${game.round}`;

    const pipsP = ui.playerPips.children;
    const pipsE = ui.enemyPips.children;
    for (let i = 0; i < pipsP.length; i++) pipsP[i].classList.toggle('is-won', i < game.playerWins);
    for (let i = 0; i < pipsE.length; i++) pipsE[i].classList.toggle('is-won', i < game.enemyWins);
  }

  function syncScreens() {
    const inMatch = ['intro', 'fight', 'roundEnd', 'matchEnd'].includes(game.screen);
    ui.title.classList.toggle('is-hidden', game.screen !== 'title');
    ui.hud.classList.toggle('is-hidden', !inMatch);
    ui.pause.classList.toggle('is-hidden', !game.paused);
    ui.result.classList.toggle('is-hidden', !(game.screen === 'matchEnd' && game.showResult));
    const showTouch = game.screen === 'fight' && !game.paused && isTouch;
    ui.touch.classList.toggle('is-hidden', !showTouch);
    ui.hint.classList.toggle('show', game.screen === 'fight' && game.hintTimer > 0 && !game.paused && !isTouch);
    const pausable = ['intro', 'fight', 'roundEnd'].includes(game.screen);
    ui.pauseBtn.disabled = !pausable;
    ui.pauseBtn.textContent = game.paused ? 'RESUME' : 'PAUSE';
    ui.pauseBtn.style.opacity = pausable ? '1' : '0.45';
    ui.quickTools.classList.toggle('is-hidden', !['intro', 'fight', 'roundEnd'].includes(game.screen));
    ui.quickPause.disabled = !pausable;
    ui.quickPause.textContent = game.paused ? '▶' : 'II';
    ui.quickMute.textContent = audio.muted ? 'OFF' : 'SFX';
  }

  function clearInputs() {
    input.left = false;
    input.right = false;
    input.guard = false;
    pressed.clear();
    document.querySelectorAll('.touch-btn').forEach((b) => b.classList.remove('is-down'));
  }

  /* ---------------- Rendering ---------------- */

  function drawTorchGlow(t) {
    const flicker = 0.82 + Math.sin(t * 0.19) * 0.08 + Math.sin(t * 0.47) * 0.05;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const x of [67, 575]) {
      const grad = ctx.createRadialGradient(x, 252, 2, x, 252, 50);
      grad.addColorStop(0, `rgba(255, 198, 102, ${0.24 * flicker})`);
      grad.addColorStop(0.32, `rgba(255, 136, 76, ${0.1 * flicker})`);
      grad.addColorStop(1, 'rgba(255, 100, 70, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - 52, 200, 104, 104);
      ctx.fillStyle = '#ffe3a3';
      ctx.fillRect(x - 1, 246 + Math.sin(t * 0.3 + x) * 1, 2, 4);
      ctx.fillStyle = '#ff9d61';
      ctx.fillRect(x - 3, 250 + Math.sin(t * 0.25 + x) * 1, 6, 2);
    }
    ctx.restore();
  }

  function drawFireflies(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of fireflies) {
      const x = f.x + Math.sin(t * f.speed + f.phase) * f.amp;
      const y = f.y + Math.cos(t * f.speed * 0.8 + f.phase * 1.7) * f.amp * 0.55;
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.045 + f.phase * 2));
      ctx.globalAlpha = pulse * 0.75;
      ctx.fillStyle = f.warm ? '#ffd166' : '#8ff5dd';
      if (f.size > 1) {
        ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 2);
        ctx.globalAlpha = pulse * 0.15;
        ctx.fillRect(Math.round(x) - 4, Math.round(y) - 2, 9, 7);
      } else {
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawAmbientLeaves() {
    ctx.save();
    for (const leaf of leaves) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = leaf.color;
      const wob = Math.sin(leaf.phase) * 2;
      ctx.fillRect(Math.round(leaf.x + wob), Math.round(leaf.y), leaf.size, 1);
      ctx.fillRect(Math.round(leaf.x + wob) + 1, Math.round(leaf.y) + 1, Math.max(1, leaf.size - 1), 1);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawShadow(f) {
    const height = Math.max(0, GROUND - f.y);
    const alpha = clamp(0.3 - height * 0.0032, 0.06, 0.3);
    const w = (f.isPlayer ? 20 : 29) * (f.spriteScale || 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#07050d';
    ctx.beginPath();
    ctx.ellipse(f.x, GROUND + 2, w - height * 0.03, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAfterimages() {
    ctx.save();
    for (const s of afterimages) {
      const a = (s.life / s.maxLife) * 0.24;
      if (a <= 0.01) continue;
      ctx.globalCompositeOperation = 'lighter';
      if (s.attackType === 'bossCharge' || s.attackType === 'special') {
        ctx.globalAlpha = a * 1.3;
      } else {
        ctx.globalAlpha = a;
      }
      const fake = { ...s, flash: 0 };
      if (s.id === 'bramble') {
        drawBramble(ctx, fake, s.spriteScale || 1, ctx.globalAlpha);
      } else {
        drawLemmy(ctx, fake, s.spriteScale || 1, ctx.globalAlpha);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawParticles(layer) {
    for (const p of particles) {
      if ((p.layer || 0) !== layer) continue;
      const life = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = clamp(life, 0, 1);
      if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        const s = Math.max(1, p.size * life);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(s), Math.ceil(s));
      } else if (p.type === 'dust') {
        ctx.fillStyle = p.color;
        const s = Math.max(1, p.size * life);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(s), Math.ceil(s));
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (1 - life) * 18, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'star') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        const s = p.size * (0.6 + (1 - life) * 0.5);
        ctx.beginPath();
        ctx.moveTo(p.x - s, p.y);
        ctx.lineTo(p.x + s, p.y);
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x, p.y + s);
        ctx.moveTo(p.x - s * 0.55, p.y - s * 0.55);
        ctx.lineTo(p.x + s * 0.55, p.y + s * 0.55);
        ctx.moveTo(p.x + s * 0.55, p.y - s * 0.55);
        ctx.lineTo(p.x - s * 0.55, p.y + s * 0.55);
        ctx.stroke();
      } else if (p.type === 'text') {
        text(ctx, p.text, p.x, p.y, p.size, p.color, 'center', '#2a1525');
      } else if (p.type === 'leaf') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -1, p.size, 2);
        ctx.fillRect(-1, -p.size / 2, 2, p.size);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawWorldFighters() {
    const list = [player, enemy].sort((a, b) => a.y - b.y);
    for (const f of list) {
      if (f.isPlayer) drawLemmy(ctx, f, f.spriteScale, 1);
      else drawBramble(ctx, f, f.spriteScale, 1);
    }
  }

  function drawTitleScene() {
    const t = game.tick;
    ctx.drawImage(bgCanvas, 0, 0);
    drawTorchGlow(t);
    drawFireflies(t);
    drawAmbientLeaves();

    // Mood wash
    const wash = ctx.createLinearGradient(0, 0, W, 0);
    wash.addColorStop(0, 'rgba(8, 6, 15, 0.32)');
    wash.addColorStop(0.55, 'rgba(8, 6, 15, 0.04)');
    wash.addColorStop(1, 'rgba(8, 6, 15, 0.18)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    // Spotlight behind the hero
    const spot = ctx.createRadialGradient(392, 194, 8, 392, 194, 190);
    spot.addColorStop(0, 'rgba(255, 209, 102, 0.18)');
    spot.addColorStop(0.4, 'rgba(232, 93, 93, 0.09)');
    spot.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = spot;
    ctx.fillRect(195, 0, 420, 360);

    // Pedestal ring
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#1a1324';
    ctx.beginPath();
    ctx.ellipse(386, 327, 54, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8d6b5b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(386, 326, 48, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.38)';
    ctx.beginPath();
    ctx.ellipse(386, 326, 38, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Huge "01" watermark
    ctx.save();
    ctx.globalAlpha = 0.055;
    text(ctx, '01', 548, 145, 70, '#fff2d2', 'center');
    ctx.restore();

    // Hero
    const hero = {
      x: 386,
      y: 327,
      facing: -1,
      state: 'title',
      animTime: t,
      flash: 0,
      attack: null,
    };
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#07050d';
    ctx.beginPath();
    ctx.ellipse(386, 329, 32, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawLemmy(ctx, hero, 2.9, 1);

    // Foreground atmosphere
    drawFireflies(t + 120);
    drawParticles(1);
    ctx.drawImage(fgCanvas, 0, 0);

    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255, 244, 214, ${game.flash * 0.025})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawArenaScene() {
    ctx.drawImage(bgCanvas, 0, 0);
    drawTorchGlow(game.tick);
    drawFireflies(game.tick);
    drawAmbientLeaves();

    for (const f of [player, enemy]) drawShadow(f);
    drawAfterimages();
    drawParticles(0);
    drawWorldFighters();
    drawParticles(1);
    ctx.drawImage(fgCanvas, 0, 0);

    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255, 244, 214, ${game.flash * 0.03})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (game.screen !== 'title') ctx.translate(Math.round(game.shakeX), Math.round(game.shakeY));
    if (game.screen === 'title') drawTitleScene();
    else drawArenaScene();
    ctx.restore();

    // Subtle screen tint during pause
    if (game.paused) {
      ctx.fillStyle = 'rgba(8, 6, 15, 0.25)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------------- Input ---------------- */

  function registerDirectionTap(dir) {
    const now = performance.now();
    if (lastDirectionTap.dir === dir && now - lastDirectionTap.time < 270) {
      pressed.add('dash');
      lastDirectionTap = { dir: 0, time: 0 };
    } else {
      lastDirectionTap = { dir, time: now };
    }
  }

  const keyMap = {
    arrowleft: 'left',
    a: 'left',
    arrowright: 'right',
    d: 'right',
    arrowup: 'jump',
    w: 'jump',
    ' ': 'jump',
    j: 'punch',
    k: 'kick',
    l: 'guard',
    u: 'special',
    shift: 'dash',
  };

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) e.preventDefault();
    if (e.repeat) return;
    ensureAudio();

    if (key === 'enter') {
      if (game.screen === 'title') {
        startMatch();
      } else if (game.screen === 'matchEnd' && game.showResult) {
        startMatch();
      } else if (game.paused) {
        resumeMatch();
      }
      return;
    }
    if (key === 'escape' || key === 'p') {
      if (game.paused) resumeMatch();
      else togglePause();
      return;
    }
    if (key === 'm') {
      audio.setMuted(!audio.muted);
      return;
    }
    if (game.screen !== 'fight' || game.paused) return;

    const act = keyMap[key];
    if (!act) return;
    if (act === 'left' || act === 'right') {
      input[act] = true;
      registerDirectionTap(act);
    } else if (act === 'guard') {
      input.guard = true;
    } else {
      pressed.add(act);
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    const act = keyMap[key];
    if (!act) return;
    if (act === 'left' || act === 'right') input[act] = false;
    else if (act === 'guard') input.guard = false;
  });

  function bindTouchControls() {
    document.querySelectorAll('.touch-btn').forEach((btn) => {
      const act = btn.dataset.act;
      const release = () => {
        btn.classList.remove('is-down');
        if (act === 'left') input.left = false;
        if (act === 'right') input.right = false;
        if (act === 'guard') input.guard = false;
      };
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        ensureAudio();
        if (game.screen !== 'fight' || game.paused) return;
        btn.classList.add('is-down');
        try { btn.setPointerCapture(e.pointerId); } catch (err) {}
        if (act === 'left' || act === 'right') {
          input[act] = true;
          registerDirectionTap(act);
        } else if (act === 'guard') {
          input.guard = true;
        } else if (act === 'special') {
          if (player.meter >= 100) pressed.add('special');
          else {
            announce('FURY NOT READY', 'tone-cream', 500);
          }
        } else {
          pressed.add(act);
        }
      });
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('lostpointercapture', release);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  function bindUi() {
    ui.start.addEventListener('click', () => {
      ensureAudio();
      audio.sfx('click');
      startMatch();
    });
    ui.resume.addEventListener('click', resumeMatch);
    ui.quit.addEventListener('click', quitToTitle);
    ui.rematch.addEventListener('click', () => {
      ensureAudio();
      audio.sfx('click');
      startMatch();
    });
    ui.toTitle.addEventListener('click', () => {
      audio.sfx('click');
      showTitle();
    });
    ui.pauseBtn.addEventListener('click', () => {
      ensureAudio();
      if (game.paused) resumeMatch();
      else togglePause();
    });
    ui.mute.addEventListener('click', () => {
      ensureAudio();
      audio.setMuted(!audio.muted);
      audio.sfx('click');
    });
    ui.quickPause.addEventListener('click', () => {
      ensureAudio();
      if (game.paused) resumeMatch();
      else togglePause();
    });
    ui.quickMute.addEventListener('click', () => {
      ensureAudio();
      audio.setMuted(!audio.muted);
      audio.sfx('click');
    });
    bindTouchControls();
  }

  window.addEventListener('blur', clearInputs);
  window.addEventListener('resize', () => {
    isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900;
    isPortraitView = window.innerWidth <= 620 && window.innerHeight > window.innerWidth;
    syncScreens();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ['fight', 'intro', 'roundEnd'].includes(game.screen) && !game.paused) {
      game.paused = true;
      clearInputs();
      syncScreens();
    }
  });
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.game-frame')) e.preventDefault();
  });

  function loadBest() {
    try {
      const saved = Number(localStorage.getItem('lemmyBestCombo'));
      if (Number.isFinite(saved) && saved > 0) game.bestCombo = saved;
    } catch (err) {}
    ui.bestCombo.textContent = String(game.bestCombo);
  }

  /* ---------------- Boot ---------------- */

  buildBackground();
  buildForeground();
  buildPortrait();
  loadBest();
  bindUi();
  showTitle();
  updateHUD();
  syncScreens();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      buildPortrait();
      render();
    }).catch(() => {});
  }

  let lastTime = performance.now();
  let accumulator = 0;
  const STEP = 1000 / 60;

  function loop(now) {
    const dt = Math.min(50, now - lastTime);
    lastTime = now;
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < 4) {
      update();
      accumulator -= STEP;
      steps++;
    }
    if (steps === 4) accumulator = 0;
    render();
    audio.tickMusic();
    requestAnimationFrame(loop);
  }

  window.__LEMMY__ = {
    get game() { return game; },
    get player() { return player; },
    get enemy() { return enemy; },
    startMatch,
    showTitle,
    togglePause,
    announce,
    input,
    pressed,
  };

  requestAnimationFrame(loop);
})();
