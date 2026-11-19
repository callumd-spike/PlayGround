// Critter Clash - main game flow, input, and loop.
import {
  W, H, COL, inRect, titleItemRect, gridCellRect, LOCK_RECT,
  resultButtonRect, pauseItemRect,
} from './layout.js';
import { ROSTER } from './characters.js';
import { audio } from './audio.js';
import { renderTitle, renderSelect, renderResult, renderPause, renderHowto } from './render.js';
import { renderFight } from './fightview.js';
import { startMatch, startRound, updateFight } from './combat.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

const touchEl = document.getElementById('touch-controls');
const pauseBtn = document.getElementById('pause-touch');
const muteBtn = document.getElementById('mute-btn');

const P1_KEYS = {
  left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
  punch: ['KeyJ'], kick: ['KeyK'], block: ['KeyL'], special: ['KeyU'],
};
const P2_KEYS = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
  punch: ['Comma', 'Numpad1'], kick: ['Period', 'Numpad2'],
  block: ['Slash', 'Numpad3'], special: ['ShiftRight', 'Numpad0'],
};

const game = {
  scene: 'title',
  time: 0,
  mode: 'cpu',
  diff: 1,
  menuIndex: 0,
  howto: false,
  paused: false,
  pauseIndex: 0,
  keys: new Set(),
  touchKeys: {},
  buffers: [{}, {}],
  mouse: { x: -1, y: -1 },
  select: { step: 0, cursors: [0, 4], picked: [null, null], rouletteT: 0, cpuDoneT: 0 },
  fighters: [],
  projectiles: [],
  particles: [],
  floats: [],
  afterimages: [],
  stage: 'dojo',
  round: 1,
  timer: 3600,
  fightLock: 0,
  roundOver: false,
  roundOverT: 0,
  announce: null,
  hitstop: 0,
  shake: 0,
  flash: 0,
  result: null,
  resultIndex: 0,
  cpuInput: {},
  ai: { timer: 0, action: 'approach', actionT: 0 },
  isTouch: false,
};

game.isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  || ('ontouchstart' in window) || /touch=1/.test(location.search);

// ---------------------------------------------------------------- audio unlock

function ensureAudio() {
  audio.init();
  if (audio.pendingTrack) {
    const t = audio.pendingTrack;
    audio.pendingTrack = null;
    audio.playTrack(t);
  }
}

function updateMuteBtn() {
  if (!muteBtn) return;
  muteBtn.textContent = audio.muted ? 'SOUND OFF' : 'SOUND ON';
  muteBtn.classList.toggle('muted', audio.muted);
}

// ---------------------------------------------------------------- input helpers

function keyDown(list) {
  for (const k of list) if (game.keys.has(k)) return true;
  return false;
}

function readInput(player) {
  const map = player === 0 ? P1_KEYS : P2_KEYS;
  const t = game.touchKeys;
  const buf = game.buffers[player] || {};
  const get = (a) => {
    if (keyDown(map[a])) return true;
    if (player === 0 && t[a]) return true;
    if (buf[a] > 0) return true;
    return false;
  };
  return {
    left: get('left'), right: get('right'), up: get('up'), down: get('down'),
    punch: get('punch'), kick: get('kick'), block: get('block'), special: get('special'),
  };
}

// Remember recent taps for a few frames so a press that begins and ends
// between two updates still produces an attack or jump.
function bufferPress(player, action) {
  if (!game.buffers[player]) game.buffers[player] = {};
  game.buffers[player][action] = 6;
}

function clearBuffers() {
  game.buffers = [{}, {}];
}

function tickBuffers() {
  for (const b of game.buffers) {
    for (const k in b) if (b[k] > 0) b[k]--;
  }
}

const TAP_ACTIONS = ['up', 'punch', 'kick', 'special'];

function bufferKey(code) {
  for (let p = 0; p < 2; p++) {
    const map = p === 0 ? P1_KEYS : P2_KEYS;
    for (const a of TAP_ACTIONS) if (map[a].includes(code)) bufferPress(p, a);
  }
}

function moveCursor(idx, dx, dy) {
  let col = idx % 4;
  let row = Math.floor(idx / 4);
  col = (col + dx + 4) % 4;
  row = (row + dy + 3) % 3;
  let n = row * 4 + col;
  if (n > 10) n = 10;
  return n;
}

function cellAt(x, y) {
  for (let i = 0; i < ROSTER.length; i++) {
    if (inRect(x, y, gridCellRect(i))) return i;
  }
  return -1;
}

function titleIndexAt(x, y) {
  for (let i = 0; i < 4; i++) if (inRect(x, y, titleItemRect(i))) return i;
  return -1;
}

// ---------------------------------------------------------------- scene flow

function startSelect(mode) {
  game.mode = mode;
  game.scene = 'select';
  game.howto = false;
  game.paused = false;
  game.select = { step: 0, cursors: [0, 4], picked: [null, null], rouletteT: 0, cpuDoneT: 0 };
  game.time = 0;
  clearBuffers();
  audio.playTrack('menu');
  audio.confirm();
}

function confirmPick() {
  const s = game.select;
  if (s.step === 0) {
    s.picked[0] = s.cursors[0];
    audio.confirm();
    if (game.mode === 'cpu') {
      s.step = 2;
      s.rouletteT = 0;
      s.cursors[1] = 0;
    } else {
      s.step = 1;
      s.cursors[1] = (s.cursors[0] + 1) % ROSTER.length;
    }
  } else if (s.step === 1) {
    s.picked[1] = s.cursors[1];
    audio.confirm();
    beginMatch();
  }
}

function beginMatch() {
  const s = game.select;
  if (s.picked[0] == null) return;
  if (s.picked[1] == null) {
    let p;
    do { p = Math.floor(Math.random() * ROSTER.length); } while (p === s.picked[0]);
    s.picked[1] = p;
  }
  const a = ROSTER[s.picked[0]].stage;
  const b = ROSTER[s.picked[1]].stage;
  game.stage = a === b ? a : (Math.random() < 0.5 ? a : b);
  startMatch(game, s.picked, game.stage);
  game.scene = 'fight';
  game.paused = false;
  game.time = 0;
  clearBuffers();
  audio.playTrack('fight');
}

function updateSelect() {
  const s = game.select;
  if (s.step === 2) {
    s.rouletteT++;
    if (s.rouletteT % 4 === 0) {
      s.cursors[1] = Math.floor(Math.random() * ROSTER.length);
      audio.move();
    }
    if (s.rouletteT >= 55) {
      let p;
      do { p = Math.floor(Math.random() * ROSTER.length); } while (p === s.picked[0]);
      s.picked[1] = p;
      s.cursors[1] = p;
      s.step = 3;
      s.cpuDoneT = 0;
      audio.confirm();
    }
  } else if (s.step === 3) {
    s.cpuDoneT++;
    if (s.cpuDoneT > 34) beginMatch();
  }
}

function quitToTitle() {
  game.scene = 'title';
  game.paused = false;
  game.menuIndex = 0;
  game.howto = false;
  game.time = 0;
  game.particles = [];
  clearBuffers();
  audio.playTrack('menu');
}

function updateResult() {
  if (game.time % 4 === 0) {
    const colors = ['#ffe36e', '#ff5ea8', '#5ff0e0', '#ffffff', '#ff9f43'];
    game.particles.push({
      x: Math.random() * W,
      y: -4,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 0.5 + Math.random() * 0.9,
      life: 200,
      maxLife: 200,
      size: Math.random() < 0.3 ? 3 : 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      grav: 0.012,
    });
  }
  for (const p of game.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.grav;
    p.life--;
  }
  game.particles = game.particles.filter((p) => p.life > 0 && p.y < H + 10);
}

// ---------------------------------------------------------------- keyboard

function handleTitleKey(code) {
  if (code === 'ArrowUp' || code === 'KeyW') {
    game.menuIndex = (game.menuIndex + 3) % 4;
    audio.move();
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    game.menuIndex = (game.menuIndex + 1) % 4;
    audio.move();
  } else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
    activateTitleItem();
  }
}

function activateTitleItem() {
  if (game.menuIndex === 0) startSelect('cpu');
  else if (game.menuIndex === 1) startSelect('local');
  else if (game.menuIndex === 2) { game.howto = true; audio.confirm(); }
  else {
    game.diff = (game.diff + 1) % 3;
    audio.select();
  }
}

function handleSelectKey(code) {
  const s = game.select;
  if (s.step >= 2) {
    if (code === 'Escape') quitToTitle();
    return;
  }
  if (code === 'Escape') {
    if (s.step === 1) {
      s.step = 0;
      s.picked[0] = null;
      audio.move();
    } else {
      quitToTitle();
    }
    return;
  }
  if (code === 'KeyR') {
    s.cursors[s.step] = Math.floor(Math.random() * ROSTER.length);
    audio.move();
    return;
  }
  let dx = 0, dy = 0;
  if (code === 'ArrowRight' || code === 'KeyD') dx = 1;
  else if (code === 'ArrowLeft' || code === 'KeyA') dx = -1;
  else if (code === 'ArrowDown' || code === 'KeyS') dy = 1;
  else if (code === 'ArrowUp' || code === 'KeyW') dy = -1;
  if (dx || dy) {
    s.cursors[s.step] = moveCursor(s.cursors[s.step], dx, dy);
    audio.move();
    return;
  }
  if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') confirmPick();
}

function handleResultKey(code) {
  if (code === 'ArrowLeft' || code === 'ArrowUp' || code === 'KeyA' || code === 'KeyW') {
    game.resultIndex = (game.resultIndex + 2) % 3;
    audio.move();
  } else if (code === 'ArrowRight' || code === 'ArrowDown' || code === 'KeyD' || code === 'KeyS') {
    game.resultIndex = (game.resultIndex + 1) % 3;
    audio.move();
  } else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
    activateResult();
  }
}

function activateResult() {
  if (game.resultIndex === 0) beginMatch();
  else if (game.resultIndex === 1) startSelect(game.mode);
  else quitToTitle();
}

function handlePauseKey(code) {
  if (code === 'Escape' || code === 'KeyP') {
    game.paused = false;
    clearBuffers();
    return;
  }
  if (code === 'ArrowUp' || code === 'KeyW') {
    game.pauseIndex = (game.pauseIndex + 3) % 4;
    audio.move();
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    game.pauseIndex = (game.pauseIndex + 1) % 4;
    audio.move();
  } else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
    if (game.pauseIndex === 0) { game.paused = false; clearBuffers(); }
    else if (game.pauseIndex === 1) { game.paused = false; clearBuffers(); startRound(game); }
    else if (game.pauseIndex === 2) { audio.toggleMute(); updateMuteBtn(); audio.select(); }
    else quitToTitle();
  }
}

function onKeyDown(code) {
  ensureAudio();
  if (code === 'KeyM') {
    audio.toggleMute();
    updateMuteBtn();
    return;
  }
  if (game.howto) {
    if (code === 'Escape' || code === 'Enter' || code === 'Space' || code === 'NumpadEnter') {
      game.howto = false;
      audio.move();
    }
    return;
  }
  if (game.paused) { handlePauseKey(code); return; }

  if (game.scene === 'title') handleTitleKey(code);
  else if (game.scene === 'select') handleSelectKey(code);
  else if (game.scene === 'fight') {
    if (code === 'Escape' || code === 'KeyP') {
      game.paused = true;
      game.pauseIndex = 0;
      clearBuffers();
      audio.move();
    }
  } else if (game.scene === 'result') handleResultKey(code);
}

// ---------------------------------------------------------------- pointer

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * W,
    y: ((e.clientY - r.top) / r.height) * H,
  };
}

function handleClick(x, y) {
  if (game.howto) {
    game.howto = false;
    audio.move();
    return;
  }
  if (game.paused) {
    for (let i = 0; i < 4; i++) {
      if (inRect(x, y, pauseItemRect(i))) {
        game.pauseIndex = i;
        if (i === 0) { game.paused = false; clearBuffers(); }
        else if (i === 1) { game.paused = false; clearBuffers(); startRound(game); }
        else if (i === 2) { audio.toggleMute(); updateMuteBtn(); }
        else quitToTitle();
        return;
      }
    }
    return;
  }
  if (game.scene === 'title') {
    const i = titleIndexAt(x, y);
    if (i >= 0) { game.menuIndex = i; activateTitleItem(); }
  } else if (game.scene === 'select') {
    const s = game.select;
    if (s.step >= 2) return;
    const i = cellAt(x, y);
    if (i >= 0) {
      if (s.cursors[s.step] === i) confirmPick();
      else { s.cursors[s.step] = i; audio.move(); }
      return;
    }
    if (inRect(x, y, LOCK_RECT)) confirmPick();
  } else if (game.scene === 'result') {
    for (let i = 0; i < 3; i++) {
      if (inRect(x, y, resultButtonRect(i))) {
        game.resultIndex = i;
        activateResult();
        return;
      }
    }
  }
}

function onPointerMove(e) {
  const p = toCanvas(e);
  game.mouse = p;
  if (game.howto) return;
  if (game.scene === 'title') {
    const i = titleIndexAt(p.x, p.y);
    if (i >= 0) game.menuIndex = i;
  } else if (game.scene === 'select') {
    const s = game.select;
    if (s.step > 1) return;
    const i = cellAt(p.x, p.y);
    if (i >= 0) s.cursors[s.step] = i;
  } else if (game.scene === 'result') {
    for (let i = 0; i < 3; i++) {
      if (inRect(p.x, p.y, resultButtonRect(i))) game.resultIndex = i;
    }
  } else if (game.paused) {
    for (let i = 0; i < 4; i++) {
      if (inRect(p.x, p.y, pauseItemRect(i))) game.pauseIndex = i;
    }
  }
}

canvas.addEventListener('pointerdown', (e) => {
  ensureAudio();
  const p = toCanvas(e);
  game.mouse = p;
  handleClick(p.x, p.y);
});
canvas.addEventListener('pointermove', onPointerMove);

window.addEventListener('keydown', (e) => {
  const code = e.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) e.preventDefault();
  ensureAudio();
  if (!e.repeat) {
    bufferKey(code);
    onKeyDown(code);
  }
  game.keys.add(code);
});
window.addEventListener('keyup', (e) => game.keys.delete(e.code));
window.addEventListener('blur', () => game.keys.clear());

// ---------------------------------------------------------------- touch

document.querySelectorAll('[data-key]').forEach((btn) => {
  const key = btn.dataset.key;
  const press = (e) => {
    e.preventDefault();
    ensureAudio();
    game.touchKeys[key] = true;
    if (TAP_ACTIONS.includes(key)) bufferPress(0, key);
    btn.classList.add('active');
  };
  const release = (e) => {
    e.preventDefault();
    game.touchKeys[key] = false;
    btn.classList.remove('active');
  };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('pointerleave', release);
});

if (pauseBtn) {
  pauseBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ensureAudio();
    if (game.scene === 'fight') {
      game.paused = !game.paused;
      game.pauseIndex = 0;
      clearBuffers();
    }
  });
}

if (muteBtn) {
  muteBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ensureAudio();
    audio.toggleMute();
    updateMuteBtn();
  });
}

function updateTouchUI() {
  const show = game.isTouch && game.scene === 'fight' && !game.paused;
  if (touchEl) touchEl.classList.toggle('show', show);
  if (pauseBtn) pauseBtn.classList.toggle('show', game.isTouch && game.scene === 'fight' && !game.paused);
  if (muteBtn) muteBtn.classList.toggle('show', game.isTouch);
}

// ---------------------------------------------------------------- loop

function step() {
  game.time++;
  if (game.howto || game.paused) return;
  if (game.scene === 'select') updateSelect();
  else if (game.scene === 'fight') {
    const in1 = readInput(0);
    let in2 = {};
    if (game.mode === 'local') in2 = readInput(1);
    updateFight(game, in1, in2, game.mode === 'cpu');
    tickBuffers();
  } else if (game.scene === 'result') updateResult();
}

function render() {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, W, H);
  if (game.scene === 'title') {
    renderTitle(ctx, game);
    if (game.howto) renderHowto(ctx, game);
  } else if (game.scene === 'select') {
    renderSelect(ctx, game);
  } else if (game.scene === 'fight') {
    renderFight(ctx, game);
    if (game.paused) renderPause(ctx, game);
  } else if (game.scene === 'result') {
    renderResult(ctx, game);
  }
  updateTouchUI();
}

let last = performance.now();
let acc = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(50, now - last);
  last = now;
  acc += dt;
  let n = 0;
  while (acc >= 1000 / 60 && n < 5) {
    step();
    acc -= 1000 / 60;
    n++;
  }
  render();
}

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const s = Math.min(vw / W, vh / H);
  canvas.style.width = `${Math.floor(W * s)}px`;
  canvas.style.height = `${Math.floor(H * s)}px`;
}

window.addEventListener('resize', resize);
resize();
updateMuteBtn();
audio.playTrack('menu');
requestAnimationFrame(loop);

// Debug/development hooks (harmless in production).
window.__cc = {
  game,
  startSelect,
  beginMatch,
  startRound,
  startMatchup(a, b, mode = 'cpu') {
    game.select.picked = [a, b];
    game.mode = mode;
    beginMatch();
  },
};
