// Shared layout constants and tiny canvas helpers.
import { drawText } from './font.js';

export const W = 480;
export const H = 270;
export const GROUND = 232;

export const COL = {
  bg: '#0a0714',
  panel: '#191430',
  panelLight: '#241d42',
  border: '#4a3f74',
  cyan: '#5ff0e0',
  magenta: '#ff5ea8',
  gold: '#ffe36e',
  orange: '#ff9f43',
  text: '#f4f0ff',
  dim: '#9a90c4',
  dark: '#0d0918',
  red: '#ff5b6e',
  green: '#7ee081',
};

export const TITLE_ITEMS = 4;

export function titleItemRect(i) {
  return { x: 120, y: 132 + i * 24, w: 240, h: 20 };
}

export function gridCellRect(i) {
  const c = i % 4, r = Math.floor(i / 4);
  return { x: 16 + c * 54, y: 52 + r * 62, w: 50, h: 58 };
}

export const LOCK_RECT = { x: 354, y: 247, w: 112, h: 18 };

export function resultButtonRect(i) {
  return { x: 20 + i * 150, y: 238, w: 140, h: 22 };
}

export function pauseItemRect(i) {
  return { x: 150, y: 92 + i * 22, w: 180, h: 18 };
}

export function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function panel(ctx, x, y, w, h, fill = COL.panel, border = COL.border) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
}

export function ellFill(ctx, cx, cy, rx, ry, c) {
  cx = Math.round(cx); cy = Math.round(cy);
  rx = Math.max(1, Math.round(rx)); ry = Math.max(1, Math.round(ry));
  ctx.fillStyle = c;
  for (let dy = -ry; dy <= ry; dy++) {
    const k = 1 - (dy * dy) / (ry * ry);
    const w = Math.floor(rx * Math.sqrt(Math.max(0, k)));
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

export function starShape(ctx, cx, cy, R, r, points, rot, c, outline) {
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
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function drawButton(ctx, r, label, opts = {}) {
  const active = opts.active;
  const color = opts.color || COL.gold;
  ctx.fillStyle = active ? '#302552' : '#181229';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = active ? color : COL.border;
  ctx.fillRect(r.x, r.y, r.w, 1);
  ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
  ctx.fillRect(r.x, r.y, 1, r.h);
  ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
  if (active) {
    ctx.fillStyle = color;
    ctx.fillRect(r.x + 3, r.y + r.h / 2, 2, 1);
    ctx.fillRect(r.x + r.w - 5, r.y + r.h / 2, 2, 1);
  }
  drawText(ctx, label, r.x + r.w / 2, r.y + Math.floor((r.h - 7) / 2), {
    scale: 1, align: 'center', color: active ? color : COL.dim,
  });
  return r;
}
