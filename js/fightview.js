// In-fight world + HUD rendering.
import { W, H, GROUND, COL, panel, ellFill, starShape } from './layout.js';
import { drawText } from './font.js';
import { drawStage } from './stages.js';
import { drawFighter, drawShadow } from './sprites.js';

export function renderFight(ctx, game) {
  const shake = game.shake;
  ctx.save();
  if (shake > 0.25) {
    ctx.translate(Math.round((Math.random() * 2 - 1) * shake), Math.round((Math.random() * 2 - 1) * shake));
  }
  drawStage(ctx, game.stage, game.time / 60);

  const [f1, f2] = game.fighters;
  if (!f1 || !f2) { ctx.restore(); return; }

  drawShadow(ctx, f1.char, f1, GROUND);
  drawShadow(ctx, f2.char, f2, GROUND);

  // afterimages
  for (const a of game.afterimages) {
    ctx.globalAlpha = (a.life / a.maxLife) * 0.28;
    drawFighter(ctx, a.char, a, 1);
  }
  ctx.globalAlpha = 1;

  drawFighter(ctx, f1.char, f1);
  drawFighter(ctx, f2.char, f2);

  // projectiles
  for (const p of game.projectiles) drawProjectile(ctx, p, game.time);

  // particles
  for (const p of game.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // damage numbers
  for (const fl of game.floats) {
    const a = Math.min(1, fl.life / 18);
    drawText(ctx, fl.text, fl.x, fl.y, {
      scale: fl.scale || 1, align: 'center', color: fl.color,
      outline: '#0a0714', outlineWidth: 1, alpha: a,
    });
  }

  // name tags above fighters
  const tag = (f, label, col) => {
    const lift = (f.char.bodyLift || 0) * f.char.scale;
    const y = f.y - f.char.height * f.char.scale + lift - 12;
    ctx.globalAlpha = 0.75;
    drawText(ctx, label, f.x, y, { scale: 1, align: 'center', color: col, shadow: '#0a0714' });
    ctx.globalAlpha = 1;
  };
  tag(f1, 'P1', COL.cyan);
  tag(f2, game.mode === 'cpu' ? 'CPU' : 'P2', COL.magenta);

  ctx.restore();

  if (game.flash > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.75, game.flash)})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawHUD(ctx, game);
  drawAnnounce(ctx, game);
}

function drawProjectile(ctx, p, t) {
  const r = p.r;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ellFill(ctx, p.x, p.y, r * 1.9, r * 1.9, p.color);
  ctx.globalAlpha = 1;

  if (p.style === 'laser' || p.style === 'beam') {
    const len = r * (p.style === 'beam' ? 5 : 3.4);
    const th = r * (p.style === 'beam' ? 1.5 : 1.0);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - len / 2, p.y - th * 1.4, len, th * 2.8);
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - len / 2, p.y - th * 0.7, len, th * 1.4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.x - len / 2, p.y - th * 0.25, len, th * 0.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.x + (p.vx > 0 ? len / 2 : -len / 2) - 2, p.y - 2, 4, 4);
  } else if (p.style === 'star') {
    starShape(ctx, p.x, p.y, r * 1.3, r * 0.55, 5, t * 0.15, p.color, '#3a1f10');
    ellFill(ctx, p.x, p.y, r * 0.3, r * 0.3, '#ffffff');
  } else if (p.style === 'ink') {
    ellFill(ctx, p.x, p.y, r, r * 0.9, p.color);
    ellFill(ctx, p.x - r * 0.3, p.y - r * 0.35, r * 0.45, r * 0.4, '#ff9fb8');
    // drips
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - r * 0.5, p.y + r * 0.6, 2, 3);
    ctx.fillRect(p.x + r * 0.2, p.y + r * 0.75, 2, 2);
    ellFill(ctx, p.x, p.y, r * 0.25, r * 0.25, '#ffffff');
  } else if (p.style === 'claw') {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, -0.8, 0.8);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.7, -0.7, 0.7);
    ctx.stroke();
    ellFill(ctx, p.x + r * 0.5, p.y, 3, 3, '#ffffff');
  } else if (p.style === 'tail' || p.style === 'stinger') {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const x = p.x - p.vx * 2 + i * (r * 0.45);
      const y = p.y + Math.sin(t * 0.2 + i) * 3;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ellFill(ctx, p.x, p.y, r * 0.7, r * 0.7, p.color);
    ellFill(ctx, p.x, p.y, r * 0.3, r * 0.3, '#ffffff');
  } else {
    // bubble
    ctx.fillStyle = p.color;
    ellFill(ctx, p.x, p.y, r, r, p.color);
    ctx.globalAlpha = 0.55;
    ellFill(ctx, p.x - r * 0.3, p.y - r * 0.3, r * 0.35, r * 0.35, '#ffffff');
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  }

  // trail sparkle
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffffff';
  const tx = p.x - Math.sign(p.vx || 1) * (r + 4);
  ctx.fillRect(Math.round(tx), Math.round(p.y + Math.sin(t * 0.4) * 3), 2, 2);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawHealthBar(ctx, f, x, y, w, h, mirror) {
  ctx.fillStyle = '#0a0712';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#3a1626';
  ctx.fillRect(x, y, w, h);
  const ghost = Math.max(0, Math.min(1, f.hpDisplay / f.maxHp));
  const cur = Math.max(0, Math.min(1, f.hp / f.maxHp));
  const gw = Math.round(w * ghost);
  const cw = Math.round(w * cur);
  ctx.fillStyle = '#f4e9d0';
  if (mirror) ctx.fillRect(x + w - gw, y, gw, h); else ctx.fillRect(x, y, gw, h);
  const col = cur > 0.5 ? '#7ee081' : cur > 0.25 ? '#ffd75e' : '#ff5b6e';
  ctx.fillStyle = col;
  if (mirror) ctx.fillRect(x + w - cw, y, cw, h); else ctx.fillRect(x, y, cw, h);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  if (mirror) ctx.fillRect(x + w - cw, y, cw, 2); else ctx.fillRect(x, y, cw, 2);
  ctx.fillStyle = 'rgba(10,7,18,0.32)';
  for (let i = 1; i < 10; i++) ctx.fillRect(x + Math.round((w * i) / 10), y, 1, h);
  ctx.fillStyle = '#0a0712';
  ctx.fillRect(x - 1, y - 1, w + 2, 1);
  ctx.fillRect(x - 1, y + h, w + 2, 1);
  ctx.fillRect(x - 1, y, 1, h);
  ctx.fillRect(x + w, y, 1, h);
}

function drawMeter(ctx, f, x, y, w, h, mirror, tag) {
  ctx.fillStyle = '#0a0712';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#241a3a';
  ctx.fillRect(x, y, w, h);
  const pct = Math.max(0, Math.min(1, (f.meterDisplay || 0) / 100));
  const mw = Math.round(w * pct);
  const col = f.meter >= 100 ? '#ffe36e' : f.meter >= 50 ? '#c47cff' : '#7b5cff';
  ctx.fillStyle = col;
  if (mirror) ctx.fillRect(x + w - mw, y, mw, h); else ctx.fillRect(x, y, mw, h);
  if (mw > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    if (mirror) ctx.fillRect(x + w - mw, y, mw, 1); else ctx.fillRect(x, y, mw, 1);
  }
  ctx.fillStyle = '#0a0712';
  ctx.fillRect(x + Math.round(w * 0.5), y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  drawText(ctx, 'SPECIAL', mirror ? x + w : x, y - 9, {
    scale: 1, align: mirror ? 'right' : 'left', color: '#8f85b5',
  });
  const blink = Math.sin(performance.now() * 0.008) > -0.3;
  if (f.meter >= 100 && blink) {
    drawText(ctx, 'SUPER READY!', mirror ? x : x + w, y - 9, {
      scale: 1, align: mirror ? 'left' : 'right', color: COL.gold, shadow: '#0a0714',
    });
  } else if (f.meter >= 50) {
    drawText(ctx, 'READY', mirror ? x : x + w, y - 9, {
      scale: 1, align: mirror ? 'left' : 'right', color: '#c47cff',
    });
  }
  drawText(ctx, tag, mirror ? x + w : x, y + h + 2, {
    scale: 1, align: mirror ? 'right' : 'left', color: '#5b5180',
  });
}

function drawHUD(ctx, game) {
  const [f1, f2] = game.fighters;
  if (!f1 || !f2) return;

  // top bar
  ctx.fillStyle = 'rgba(10,7,20,0.82)';
  ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = '#2e2650';
  ctx.fillRect(0, 43, W, 1);
  ctx.fillStyle = 'rgba(95,240,224,0.08)';
  ctx.fillRect(0, 0, W, 1);

  drawText(ctx, f1.char.name, 12, 6, { scale: 1, color: '#ffffff' });
  drawText(ctx, f1.char.title, 12, 15, { scale: 1, color: '#8f85b5' });
  drawHealthBar(ctx, f1, 12, 24, 190, 8, false);

  drawText(ctx, f2.char.name, 468, 6, { scale: 1, align: 'right', color: '#ffffff' });
  drawText(ctx, f2.char.title, 468, 15, { scale: 1, align: 'right', color: '#8f85b5' });
  drawHealthBar(ctx, f2, 278, 24, 190, 8, true);

  // timer
  panel(ctx, 220, 4, 40, 32, '#0b0918', '#5a4c8c');
  const secs = Math.max(0, Math.ceil(game.timer / 60));
  drawText(ctx, String(secs).padStart(2, '0'), 240, 8, {
    scale: 3, align: 'center', color: secs <= 10 ? '#ff5b6e' : '#ffe9a8', shadow: '#0a0714',
  });

  // tags + round pips
  drawText(ctx, 'P1', 12, 34, { scale: 1, color: COL.cyan });
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i < f1.roundsWon ? COL.gold : '#2a2244';
    ctx.fillRect(30 + i * 7, 35, 4, 4);
  }
  drawText(ctx, game.mode === 'cpu' ? 'CPU' : 'P2', 468, 34, {
    scale: 1, align: 'right', color: COL.magenta,
  });
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i < f2.roundsWon ? COL.gold : '#2a2244';
    ctx.fillRect(440 - i * 7, 35, 4, 4);
  }

  // meters
  drawMeter(ctx, f1, 12, 254, 150, 7, false, 'P1');
  drawMeter(ctx, f2, 318, 254, 150, 7, true, game.mode === 'cpu' ? 'CPU' : 'P2');

  // combos
  if (f1.combo >= 2 && f1.comboTimer > 0) {
    const pop = 1 + Math.min(0.6, f1.comboTimer / 90);
    drawText(ctx, `${f1.combo} HIT COMBO`, 16, 66, {
      scale: 2, color: COL.gold, outline: '#1b0f2a', outlineWidth: 1, shadow: '#0a0714',
    });
    ctx.fillStyle = 'rgba(255,227,110,0.5)';
    ctx.fillRect(16, 82, Math.min(140, 10 + f1.combo * 16 * pop), 1);
  }
  if (f2.combo >= 2 && f2.comboTimer > 0) {
    const pop = 1 + Math.min(0.6, f2.comboTimer / 90);
    drawText(ctx, `${f2.combo} HIT COMBO`, 464, 66, {
      scale: 2, align: 'right', color: COL.gold, outline: '#1b0f2a', outlineWidth: 1, shadow: '#0a0714',
    });
    ctx.fillStyle = 'rgba(255,227,110,0.5)';
    ctx.fillRect(464 - Math.min(140, 10 + f2.combo * 16 * pop), 82, Math.min(140, 10 + f2.combo * 16 * pop), 1);
  }
}

function drawAnnounce(ctx, game) {
  const a = game.announce;
  if (!a || a.t >= a.dur) return;
  const fade = Math.max(0, Math.min(1, a.t / 5, (a.dur - a.t) / 12));
  const size = a.size || 4;
  const y = a.y != null ? a.y : 96;
  drawText(ctx, a.text, 240, y, {
    scale: size, align: 'center', color: a.color || COL.gold,
    outline: '#1b0f2a', outlineWidth: 2, shadow: '#0a0714', alpha: fade,
  });
  if (a.sub) {
    drawText(ctx, a.sub, 240, y + size * 9 + 6, {
      scale: 1, align: 'center', color: '#e0d8ff',
      outline: '#1b0f2a', outlineWidth: 1, shadow: '#0a0714', alpha: fade,
    });
  }
}
