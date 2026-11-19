// Menu / select / result / pause rendering.
import {
  W, H, GROUND, COL, panel, ellFill, drawButton, inRect,
  titleItemRect, gridCellRect, LOCK_RECT, resultButtonRect, pauseItemRect,
} from './layout.js';
import { drawText, textWidth } from './font.js';
import { ROSTER, STAGE_INFO } from './characters.js';
import { drawFighter, drawShadow, drawCharInBox } from './sprites.js';
import { drawStage } from './stages.js';
import { audio } from './audio.js';

const BG_STARS = (() => {
  let seed = 7;
  const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  return Array.from({ length: 70 }, () => ({ x: r() * 480, y: r() * 270, s: r() < 0.2 ? 2 : 1, p: r() * 6.28 }));
})();

function fakeFighter(x, y, facing, t, state = 'idle') {
  return {
    x, y, facing, state, animT: t, onGround: true,
    crouching: false, blocking: false, hitstun: 0, attack: null,
  };
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- title

export function renderTitle(ctx, game) {
  drawStage(ctx, 'cosmic', game.time / 60);
  ctx.fillStyle = 'rgba(8,4,20,0.52)';
  ctx.fillRect(0, 0, W, H);

  // big silhouettes on the sides
  ctx.globalAlpha = 0.3;
  const t = game.time;
  drawFighter(ctx, ROSTER[10], fakeFighter(58, 274, 1, t * 0.9), 1.5);
  drawFighter(ctx, ROSTER[1], fakeFighter(430, 274, -1, t * 0.8 + 20), 1.35);
  ctx.globalAlpha = 1;

  // darken middle for text
  const g = ctx.createLinearGradient(0, 90, 0, 240);
  g.addColorStop(0, 'rgba(8,4,20,0)');
  g.addColorStop(0.5, 'rgba(8,4,20,0.55)');
  g.addColorStop(1, 'rgba(8,4,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 90, W, 150);

  // logo
  drawText(ctx, 'CRITTER', 240, 24, {
    scale: 5, align: 'center', color: COL.gold, outline: '#2a0f3a', outlineWidth: 2, shadow: '#080410',
  });
  drawText(ctx, 'CLASH', 240, 56, {
    scale: 7, align: 'center', color: '#ff8a3d', outline: '#2a0f3a', outlineWidth: 2, shadow: '#080410',
  });
  // little star accents
  const blink = Math.sin(t * 0.08) > 0;
  if (blink) {
    drawText(ctx, '*', 92, 36, { scale: 2, color: '#fff3b0' });
    drawText(ctx, '*', 384, 40, { scale: 2, color: '#fff3b0' });
  }
  drawText(ctx, 'PAWS  •  CLAWS  •  TENTACLES', 240, 112, {
    scale: 1, align: 'center', color: '#ff9fc4', shadow: '#12081f',
  });

  // menu
  const labels = [
    '1 PLAYER  VS CPU',
    '2 PLAYERS  LOCAL',
    'HOW TO PLAY',
    `CPU LEVEL: ${['EASY', 'NORMAL', 'HARD'][game.diff]}`,
  ];
  for (let i = 0; i < labels.length; i++) {
    const r = titleItemRect(i);
    const sel = i === game.menuIndex;
    if (sel) {
      ctx.fillStyle = 'rgba(48,37,82,0.92)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = COL.gold;
      ctx.fillRect(r.x, r.y, r.w, 1);
      ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
      ctx.fillRect(r.x, r.y, 1, r.h);
      ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
      const ax = Math.sin(t * 0.12) * 2;
      drawText(ctx, '>', r.x + 8 + ax, r.y + 6, { scale: 1, color: COL.gold });
      drawText(ctx, '<', r.x + r.w - 13 - ax, r.y + 6, { scale: 1, color: COL.gold });
    }
    drawText(ctx, labels[i], 240, r.y + 6, {
      scale: 2, align: 'center', color: sel ? COL.gold : '#a79cc8',
      shadow: sel ? '#2a0f3a' : null,
    });
  }

  if (Math.sin(t * 0.09) > -0.2) {
    drawText(ctx, 'PRESS ENTER TO SELECT', 240, 224, { scale: 1, align: 'center', color: '#b9aee0' });
  }

  drawText(ctx, '11 FIGHTERS  •  4 STAGES  •  M: MUTE', 240, 252, {
    scale: 1, align: 'center', color: '#7f74a8',
  });
}

// ---------------------------------------------------------------- select

export function renderSelect(ctx, game) {
  const s = game.select;
  const t = game.time;

  // background
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#150c2c');
  g.addColorStop(0.55, '#1b1038');
  g.addColorStop(1, '#080512');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // stars
  for (const st of BG_STARS) {
    ctx.globalAlpha = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.03 + st.p));
    ctx.fillStyle = '#cfc4ff';
    ctx.fillRect(Math.round(st.x), Math.round(st.y), st.s, st.s);
  }
  ctx.globalAlpha = 1;

  // perspective grid floor
  ctx.strokeStyle = 'rgba(95,240,224,0.07)';
  ctx.lineWidth = 1;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(240 + i * 12, 200);
    ctx.lineTo(240 + i * 90, 270);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const y = 210 + i * 14;
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // header
  panel(ctx, 0, 0, W, 44, 'rgba(12,8,26,0.92)', '#2e2650');
  const step = s.step;
  const color = step === 0 ? COL.cyan : COL.magenta;
  let header = 'PLAYER 1  •  CHOOSE YOUR FIGHTER';
  if (step === 1) header = 'PLAYER 2  •  CHOOSE YOUR FIGHTER';
  else if (step === 2) header = 'CPU  •  CHOOSING...';
  else if (step === 3) header = `CPU CHOSE  ${ROSTER[s.picked[1]].name}`;
  drawText(ctx, header, 240, 9, { scale: 2, align: 'center', color, shadow: '#0a0714' });
  drawText(ctx, game.mode === 'cpu' ? '1 PLAYER  VS  CPU' : '2 PLAYERS  LOCAL', 240, 29, {
    scale: 1, align: 'center', color: '#8f85b5',
  });

  // grid
  for (let i = 0; i < ROSTER.length; i++) {
    const r = gridCellRect(i);
    const ch = ROSTER[i];
    const isP1Cursor = (step === 0 && s.cursors[0] === i) || (step > 0 && s.picked[0] === i);
    const isP2Cursor = (step === 1 || step === 2) ? s.cursors[1] === i : (step === 3 && s.picked[1] === i);
    const p1Locked = step > 0 && s.picked[0] === i;
    const p2Locked = step === 3 && s.picked[1] === i;

    let border = '#2e2650';
    let fill = '#141027';
    if (isP1Cursor) { border = COL.cyan; fill = '#16242c'; }
    if (isP2Cursor) { border = COL.magenta; fill = '#2a1626'; }

    panel(ctx, r.x, r.y, r.w, r.h, fill, border);
    if (isP1Cursor || isP2Cursor) {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 0.15);
      ctx.fillStyle = isP2Cursor ? COL.magenta : COL.cyan;
      ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, 1);
      ctx.fillRect(r.x + 1, r.y + r.h - 2, r.w - 2, 1);
      ctx.globalAlpha = 1;
    }
    // accent strip
    ctx.fillStyle = ch.special.color;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(r.x + 3, r.y + r.h - 3, r.w - 6, 1);
    ctx.globalAlpha = 1;

    drawCharInBox(ctx, ch, { x: r.x + 3, y: r.y + 2, w: r.w - 6, h: r.h - 6 }, t * 0.5 + i * 11, 1);

    // badges
    if (isP1Cursor) {
      ctx.fillStyle = COL.cyan;
      ctx.fillRect(r.x + 2, r.y + 2, 9, 8);
      drawText(ctx, p1Locked ? '1' : '1', r.x + 4, r.y + 3, { scale: 1, color: '#0a0714' });
      if (p1Locked) {
        ctx.fillStyle = COL.cyan;
        ctx.fillRect(r.x + r.w - 8, r.y + 2, 6, 6);
        ctx.fillStyle = '#0a0714';
        ctx.fillRect(r.x + r.w - 7, r.y + 4, 1, 2);
        ctx.fillRect(r.x + r.w - 6, r.y + 5, 1, 1);
        ctx.fillRect(r.x + r.w - 5, r.y + 3, 1, 3);
      }
    }
    if (isP2Cursor) {
      ctx.fillStyle = COL.magenta;
      ctx.fillRect(r.x + 2, r.y + 2, 9, 8);
      drawText(ctx, '2', r.x + 4, r.y + 3, { scale: 1, color: '#0a0714' });
      if (p2Locked) {
        ctx.fillStyle = COL.magenta;
        ctx.fillRect(r.x + r.w - 8, r.y + 2, 6, 6);
        ctx.fillStyle = '#0a0714';
        ctx.fillRect(r.x + r.w - 7, r.y + 4, 1, 2);
        ctx.fillRect(r.x + r.w - 6, r.y + 5, 1, 1);
        ctx.fillRect(r.x + r.w - 5, r.y + 3, 1, 3);
      }
    }
  }

  // info panel
  panel(ctx, 240, 46, 224, 194, '#151028', '#3a3060');
  const activeIdx = step === 0 ? s.cursors[0] : (step === 3 ? s.picked[1] : s.cursors[1]);
  const ch = ROSTER[activeIdx];

  drawText(ctx, ch.name, 252, 54, { scale: 2, color: '#ffffff', shadow: '#0a0714' });
  drawText(ctx, ch.title, 252, 75, { scale: 1, color: COL.gold });

  // preview
  panel(ctx, 246, 86, 212, 80, '#100b20', '#2b2348');
  ctx.globalAlpha = 0.1;
  ellFill(ctx, 352, 150, 70, 26, ch.special.color);
  ctx.globalAlpha = 1;
  drawCharInBox(ctx, ch, { x: 250, y: 88, w: 204, h: 76 }, t * 0.55 + activeIdx * 7, 1);
  drawText(ctx, 'SPECIAL', 252, 170, { scale: 1, color: '#7f74a8' });
  drawText(ctx, ch.special.name, 300, 170, { scale: 1, color: ch.special.color });

  // stats
  const statRow = (label, val, y, col) => {
    drawText(ctx, label, 252, y, { scale: 1, color: '#b9aee0' });
    for (let i = 0; i < 5; i++) {
      const sx = 292 + i * 10;
      ctx.fillStyle = i < val ? col : '#2a2244';
      ctx.fillRect(sx, y, 8, 5);
      if (i < val) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(sx, y, 8, 1);
      }
    }
  };
  statRow('PWR', ch.stats.pow, 181, COL.orange);
  statRow('SPD', ch.stats.spd, 190, COL.cyan);
  statRow('DEF', ch.stats.def, 199, COL.green);

  // quote
  drawText(ctx, ch.quote, 252, 213, {
    scale: 1, color: '#cfc4ff', wrapWidth: 204, shadow: '#0a0714',
  });

  // bottom bar
  panel(ctx, 0, 244, W, 26, 'rgba(12,8,26,0.95)', '#2e2650');
  if (step <= 1) {
    drawText(ctx, game.isTouch
      ? 'TAP A FIGHTER, THEN TAP AGAIN TO LOCK'
      : 'ARROWS: MOVE    ENTER: LOCK    ESC: BACK', 14, 253, {
      scale: 1, color: '#8f85b5',
    });
    drawButton(ctx, LOCK_RECT, 'LOCK IN', { active: true, color });
  } else {
    drawText(ctx, 'GET READY...', 14, 253, { scale: 1, color: '#8f85b5' });
    drawButton(ctx, LOCK_RECT, step === 3 ? 'READY!' : 'CPU PICK', { active: false });
  }
}

// ---------------------------------------------------------------- result

export function renderResult(ctx, game) {
  const res = game.result;
  if (!res) return;
  const winner = res.winner;
  const t = game.time;

  drawStage(ctx, game.stage, t / 60);
  ctx.fillStyle = 'rgba(6,3,14,0.7)';
  ctx.fillRect(0, 0, W, H);

  // spotlight
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.moveTo(110, 0); ctx.lineTo(190, 0); ctx.lineTo(260, 244); ctx.lineTo(20, 244);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;

  drawShadow(ctx, winner.char, { x: 128, y: 242 }, 242);
  drawFighter(ctx, winner.char, fakeFighter(128, 242, 1, t * 1.1, 'win'), 1.5);

  drawParticles(ctx, game.particles);

  panel(ctx, 236, 34, 230, 188, 'rgba(20,14,38,0.9)', '#4a3f74');
  drawText(ctx, 'WINNER', 248, 44, { scale: 1, color: COL.gold });
  const nameScale = winner.char.name.length > 9 ? 2 : 3;
  drawText(ctx, winner.char.name, 248, 56, {
    scale: nameScale, color: '#ffffff', outline: '#1b0f2a', outlineWidth: 1, shadow: '#0a0714',
  });
  drawText(ctx, winner.char.title, 248, 56 + nameScale * 9 + 2, { scale: 1, color: COL.gold });
  drawText(ctx, `${res.rounds[0]}  -  ${res.rounds[1]}`, 248, 104, {
    scale: 3, color: '#ffe36e', shadow: '#0a0714',
  });
  drawText(ctx, winner.char.quote, 248, 130, {
    scale: 1, color: '#d8cfff', wrapWidth: 204,
  });
  if (res.perfect) {
    drawText(ctx, 'PERFECT WIN!', 248, 166, {
      scale: 1, color: '#7ee081', shadow: '#0a0714',
    });
  }
  drawText(ctx, 'BEST OF THREE', 248, 188, { scale: 1, color: '#7f74a8' });

  const labels = ['REMATCH', 'FIGHTERS', 'TITLE'];
  for (let i = 0; i < 3; i++) {
    const r = resultButtonRect(i);
    drawButton(ctx, r, labels[i], { active: i === game.resultIndex, color: COL.gold });
  }
}

// ---------------------------------------------------------------- pause / howto

export function renderPause(ctx, game) {
  ctx.fillStyle = 'rgba(6,4,14,0.78)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 140, 46, 200, 182, '#191430', COL.gold);
  drawText(ctx, 'PAUSED', 240, 58, { scale: 2, align: 'center', color: COL.gold });
  const labels = ['RESUME', 'RESTART ROUND', audio.muted ? 'SOUND: OFF' : 'SOUND: ON', 'QUIT TO TITLE'];
  for (let i = 0; i < labels.length; i++) {
    drawButton(ctx, pauseItemRect(i), labels[i], { active: i === game.pauseIndex, color: COL.gold });
  }
  drawText(ctx, game.isTouch ? 'TAP AN OPTION' : 'ESC: RESUME', 240, 196, {
    scale: 1, align: 'center', color: '#8f85b5',
  });
}

export function renderHowto(ctx, game) {
  ctx.fillStyle = 'rgba(6,4,14,0.85)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 28, 22, 424, 226, '#191430', '#5a4c8c');
  drawText(ctx, 'HOW TO PLAY', 240, 34, { scale: 2, align: 'center', color: COL.gold });

  const line = (txt, x, y, col = '#cfc4ff') => drawText(ctx, txt, x, y, { scale: 1, color: col });

  drawText(ctx, 'PLAYER 1', 50, 58, { scale: 1, color: COL.cyan });
  line('MOVE      A / D', 50, 70);
  line('JUMP      W', 50, 81);
  line('CROUCH    S', 50, 92);
  line('PUNCH     J', 50, 103);
  line('KICK      K', 50, 114);
  line('BLOCK     L', 50, 125);
  line('SPECIAL   U', 50, 136, COL.gold);

  drawText(ctx, 'PLAYER 2', 258, 58, { scale: 1, color: COL.magenta });
  line('MOVE      ARROWS', 258, 70);
  line('JUMP      UP', 258, 81);
  line('CROUCH    DOWN', 258, 92);
  line('PUNCH     ,  /  NUM 1', 258, 103);
  line('KICK      .  /  NUM 2', 258, 114);
  line('BLOCK     /  /  NUM 3', 258, 125);
  line('SPECIAL   R-SHIFT / NUM 0', 258, 136, COL.gold);

  ctx.fillStyle = '#2e2650';
  ctx.fillRect(44, 152, 392, 1);

  drawText(ctx, 'TIPS', 50, 160, { scale: 1, color: COL.gold });
  line('• HOLD BLOCK TO REDUCE DAMAGE TO A CHIP', 50, 172);
  line('• SPECIAL COSTS 50 METER. AT 100 IT BECOMES A SUPER!', 50, 183);
  line('• KNOCK THEM OUT TWICE TO WIN THE MATCH', 50, 194);
  line(game.isTouch
    ? 'TOUCH: USE THE ON-SCREEN PAD AND ACTION BUTTONS'
    : 'P: PAUSE     M: MUTE     ESC: BACK', 50, 205, '#8f85b5');

  drawText(ctx, game.isTouch ? 'TAP TO CLOSE' : 'CLICK OR PRESS ENTER TO CLOSE', 240, 224, {
    scale: 1, align: 'center', color: '#b9aee0',
  });
}
