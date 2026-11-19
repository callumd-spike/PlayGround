// Combat simulation: movement, attacks, projectiles, AI, rounds.
import { W, GROUND } from './layout.js';
import { ROSTER, STAGE_INFO } from './characters.js';
import { audio } from './audio.js';

const GRAV = 0.52;
const ROUND_FRAMES = 60 * 60;

const ATTACKS = {
  punch: { startup: 5, active: 4, recovery: 9, dmg: 5, reach: 27, yoff: -50, w: 22, h: 18, kb: 2.2, hitstun: 13, meter: 6, heavy: false },
  kick: { startup: 9, active: 5, recovery: 15, dmg: 10, reach: 34, yoff: -34, w: 26, h: 20, kb: 4.2, hitstun: 18, meter: 8, heavy: true },
};

const SPECIAL_PROJ = { startup: 16, active: 0, recovery: 26, dmg: 16, kb: 5, hitstun: 22, meter: 0, yoff: -46, reach: 26, w: 20, h: 20, projectile: true, heavy: true };
const SPECIAL_MELEE = { startup: 14, active: 9, recovery: 24, dmg: 18, kb: 8, hitstun: 26, meter: 0, yoff: -44, reach: 42, w: 40, h: 48, dash: 3.4, heavy: true };

const AI_LEVELS = [
  { react: 26, aggro: 0.45, block: 0.2 },
  { react: 16, aggro: 0.65, block: 0.4 },
  { react: 10, aggro: 0.85, block: 0.65 },
];

function makeFighter(charIdx, player, x) {
  const ch = ROSTER[charIdx];
  return {
    char: ch, chIdx: charIdx, player,
    x, y: GROUND, vx: 0, vy: 0,
    facing: player === 0 ? 1 : -1,
    hp: ch.hp, maxHp: ch.hp, hpDisplay: ch.hp,
    meter: 0, meterDisplay: 0,
    state: 'idle', onGround: true, crouching: false, blocking: false,
    attack: null, hitstun: 0, blockstun: 0, invuln: 0,
    animT: player * 37, prevIn: {},
    combo: 0, comboTimer: 0, koT: 0, roundsWon: 0,
    pushW: ch.hurtW * ch.scale * 0.9,
    height: ch.height * ch.scale,
  };
}

export function startMatch(game, picks, stage) {
  game.stage = stage;
  game.fighters = [makeFighter(picks[0], 0, 150), makeFighter(picks[1], 1, 330)];
  game.round = 1;
  game.projectiles = [];
  game.particles = [];
  game.floats = [];
  game.afterimages = [];
  game.result = null;
  game.paused = false;
  game.hitstop = 0;
  game.shake = 0;
  game.flash = 0;
  game.ai = { timer: 0, action: 'approach', actionT: 0 };
  game.cpuInput = {};
  startRound(game);
}

export function startRound(game) {
  const positions = [150, 330];
  game.fighters.forEach((f, i) => {
    f.x = positions[i];
    f.y = GROUND;
    f.vx = 0; f.vy = 0;
    f.facing = i === 0 ? 1 : -1;
    f.hp = f.maxHp;
    f.hpDisplay = f.maxHp;
    f.state = 'idle';
    f.onGround = true;
    f.crouching = false;
    f.blocking = false;
    f.attack = null;
    f.hitstun = 0;
    f.blockstun = 0;
    f.invuln = 0;
    f.combo = 0;
    f.comboTimer = 0;
    f.koT = 0;
    f.prevIn = {};
  });
  game.timer = ROUND_FRAMES;
  game.fightLock = 95;
  game.roundOver = false;
  game.roundOverT = 0;
  game.koWinner = null;
  game.projectiles = [];
  game.particles = [];
  game.floats = [];
  game.afterimages = [];
  game.buffers = [{}, {}];
  game.hitstop = 0;
  game.shake = 0;
  game.flash = 0;
  game.announce = {
    text: `ROUND ${game.round}`,
    sub: (STAGE_INFO[game.stage] || STAGE_INFO.dojo).name,
    t: 0, dur: 58, size: 4, color: '#ffe36e',
  };
}

export function updateFight(game, in1, in2, isCpu) {
  if (game.paused) return;

  for (const f of game.fighters) {
    f.hpDisplay += (f.hp - f.hpDisplay) * 0.08;
    if (Math.abs(f.hpDisplay - f.hp) < 0.2) f.hpDisplay = f.hp;
    f.meterDisplay += (f.meter - f.meterDisplay) * 0.14;
  }
  if (game.announce) game.announce.t++;

  if (game.hitstop > 0) {
    game.hitstop--;
    tickParticles(game);
    tickFloats(game);
    tickAfterimages(game);
    decayFx(game);
    return;
  }

  if (game.fightLock > 0) {
    game.fightLock--;
    if (game.fightLock === 35) {
      game.fightLock = 0;
      game.announce = { text: 'FIGHT!', sub: '', t: 0, dur: 50, size: 5, color: '#ff8a3d' };
      audio.round();
    }
  }

  const [f1, f2] = game.fighters;

  if (isCpu && !game.roundOver) updateCPU(game, f2, f1, in2);

  updateFighter(game, f1, f2, in1);
  updateFighter(game, f2, f1, in2);

  if (!game.roundOver) {
    resolveAttack(game, f1, f2);
    resolveAttack(game, f2, f1);
    updateProjectiles(game);
    resolvePush(game);
  }

  tickParticles(game);
  tickFloats(game);
  tickAfterimages(game);

  if (!game.roundOver && game.fightLock <= 0) {
    game.timer--;
    if (game.timer <= 0) timeUp(game);
  }

  if (game.roundOver) {
    game.roundOverT++;
    if (game.koWinner && game.roundOverT % 10 === 0) {
      const w = game.koWinner;
      burst(game, w.x + (Math.random() - 0.5) * 60, w.y - 60 - Math.random() * 50,
        ['#ffe36e', '#ff5ea8', '#5ff0e0', '#ffffff'][Math.floor(Math.random() * 4)],
        1, { speed: 1.2, life: 60, size: 2, grav: 0.03 });
    }
    if (game.roundOverT >= 118) {
      if (game.koWinner && game.koWinner.roundsWon >= 2) {
        endMatch(game, game.koWinner);
        return;
      }
      if (!game.koWinner && game.round >= 5) {
        const [a, b] = game.fighters;
        endMatch(game, a.roundsWon >= b.roundsWon ? a : b);
        return;
      }
      game.round++;
      startRound(game);
      return;
    }
  }

  decayFx(game);
}

function decayFx(game) {
  game.shake *= 0.88;
  if (game.shake < 0.3) game.shake = 0;
  game.flash *= 0.86;
  if (game.flash < 0.01) game.flash = 0;
}

// ---------------------------------------------------------------- fighter update

function updateFighter(game, f, opp, inp) {
  f.animT++;

  if (f.state === 'ko') {
    f.koT++;
    f.vy = Math.min(f.vy + GRAV, 14);
    f.x += f.vx;
    f.y += f.vy;
    f.vx *= 0.985;
    if (f.y >= GROUND) {
      if (f.vy > 2.4 && f.koT < 55) {
        f.vy = -f.vy * 0.34;
        f.y = GROUND;
        burst(game, f.x, GROUND, '#e8dcc0', 5, { speed: 1.5, life: 18, size: 2, up: 1 });
      } else {
        f.y = GROUND;
        f.vy = 0;
        f.vx *= 0.82;
      }
    }
    f.x = Math.max(26, Math.min(W - 26, f.x));
    f.prevIn = { ...inp };
    return;
  }

  if (game.roundOver) {
    f.state = f.state === 'win' ? 'win' : 'idle';
    f.facing = opp.x >= f.x ? 1 : -1;
    f.vx *= 0.85;
    f.x += f.vx;
    if (!f.onGround) {
      f.vy = Math.min(f.vy + GRAV, 14);
      f.y += f.vy;
      if (f.y >= GROUND) { f.y = GROUND; f.vy = 0; f.onGround = true; }
    }
    f.x = Math.max(26, Math.min(W - 26, f.x));
    f.prevIn = { ...inp };
    return;
  }

  if (f.hitstun > 0) f.hitstun--;
  if (f.blockstun > 0) f.blockstun--;
  if (f.invuln > 0) f.invuln--;
  if (f.comboTimer > 0) {
    f.comboTimer--;
    if (f.comboTimer === 0) f.combo = 0;
  }

  const locked = game.fightLock > 0;
  const stunned = f.hitstun > 0 || f.blockstun > 0;
  const busy = stunned || !!f.attack || locked;

  if (!busy && !f.attack) f.facing = opp.x >= f.x ? 1 : -1;

  f.blocking = !locked && f.hitstun <= 0 && f.onGround && !f.attack && !!inp.block;
  f.crouching = !locked && f.hitstun <= 0 && f.onGround && !f.attack && !f.blocking && !!inp.down;

  const canMove = !busy && !f.blocking && !f.crouching;
  let dir = 0;
  if (canMove) dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);

  if (canMove) {
    if (dir !== 0) {
      const mul = (dir === f.facing ? 1 : 0.8) * (f.onGround ? 1 : 0.92);
      f.vx = dir * f.char.speed * mul;
    } else if (f.onGround) {
      f.vx *= 0.55;
    }
  } else if (f.onGround) {
    f.vx *= stunned ? 0.9 : 0.78;
  }

  // jump
  if (!busy && !f.blocking && f.onGround && inp.up && !f.prevIn.up) {
    f.vy = -f.char.jump;
    f.onGround = false;
    f.state = 'jump';
    audio.jump();
    burst(game, f.x, GROUND, '#d8c8a8', 4, { speed: 1.2, life: 14, size: 1, up: 1 });
  }

  // start attacks
  if (!busy && !f.blocking) {
    if (inp.special && !f.prevIn.special) startSpecial(game, f);
    else if (inp.punch && !f.prevIn.punch) startAttack(game, f, 'punch');
    else if (inp.kick && !f.prevIn.kick) startAttack(game, f, 'kick');
  }

  // attack progression
  if (f.attack) {
    const a = f.attack;
    a.frame++;
    if (a.name === 'special' && a.data.projectile && !a.spawned && a.frame >= a.data.startup) {
      a.spawned = true;
      spawnProjectile(game, f, a.isSuper);
    }
    if (a.name === 'special' && a.data.dash && a.frame <= a.data.startup + a.data.active) {
      f.vx = f.facing * a.data.dash;
      if (a.frame % 3 === 0) {
        game.afterimages.push({
          char: f.char, x: f.x, y: f.y, facing: f.facing, state: 'idle',
          animT: f.animT, onGround: f.onGround, crouching: false, blocking: false,
          hitstun: 0, attack: null, life: 10, maxLife: 10,
        });
      }
    }
    if (a.frame >= a.total) {
      f.attack = null;
      if (f.onGround) f.state = 'idle';
    }
  }

  // physics
  if (!f.onGround) f.vy = Math.min(f.vy + GRAV, 14);
  f.x += f.vx;
  f.y += f.vy;
  if (f.y >= GROUND) {
    if (!f.onGround) {
      burst(game, f.x, GROUND, '#d8c8a8', 5, { speed: 1.6, life: 16, size: 1, up: 1 });
    }
    f.y = GROUND;
    f.vy = 0;
    f.onGround = true;
    if (f.state === 'jump') f.state = 'idle';
  } else {
    f.onGround = false;
  }
  f.x = Math.max(26, Math.min(W - 26, f.x));

  // resolve state
  if (f.hitstun > 0) f.state = 'hit';
  else if (f.attack) f.state = 'attack';
  else if (!f.onGround) f.state = 'jump';
  else if (f.blocking) f.state = 'block';
  else if (f.crouching) f.state = 'crouch';
  else if (Math.abs(f.vx) > 0.35) f.state = 'walk';
  else f.state = 'idle';

  f.prevIn = { ...inp };
}

function startAttack(game, f, name) {
  const base = ATTACKS[name];
  f.attack = {
    name, frame: 0, data: { ...base },
    total: base.startup + base.active + base.recovery,
    hasHit: false,
  };
  f.state = 'attack';
  f.crouching = false;
  f.blocking = false;
  if (f.onGround) f.vx *= 0.25;
  audio.swing();
}

function startSpecial(game, f) {
  const ch = f.char;
  if (f.meter < 50) {
    audio.deny();
    addFloat(game, f.x, f.y - f.height - 4, 'NO METER', '#8f85b5', 1);
    return;
  }
  const isSuper = f.meter >= 100;
  const base = ch.special.type === 'projectile' ? SPECIAL_PROJ : SPECIAL_MELEE;
  const data = {
    ...base,
    dmg: ch.special.dmg * (isSuper ? 1.8 : 1),
    reach: base.reach * (isSuper ? 1.12 : 1),
    w: base.w * (isSuper ? 1.25 : 1),
    h: base.h * (isSuper ? 1.2 : 1),
    kb: base.kb * (isSuper ? 1.35 : 1),
  };
  f.attack = {
    name: 'special', frame: 0, data,
    total: data.startup + data.active + data.recovery,
    hasHit: false, spawned: false, isSuper,
  };
  f.meter -= isSuper ? 100 : 50;
  f.invuln = 12;
  f.state = 'attack';
  f.crouching = false;
  f.blocking = false;
  if (f.onGround) f.vx *= 0.2;
  if (isSuper) {
    game.flash = 0.62;
    game.hitstop = 10;
    game.shake = 5;
    audio.superMove();
    game.announce = { text: 'SUPER!', sub: ch.special.name, t: 0, dur: 48, size: 3, color: '#ffe36e' };
    burst(game, f.x, f.y - f.height * 0.6, ch.special.color, 18, { speed: 3.5, life: 30, size: 2 });
  } else {
    audio.special();
    burst(game, f.x, f.y - f.height * 0.6, ch.special.color, 8, { speed: 2, life: 20, size: 2 });
  }
}

function spawnProjectile(game, f, superMove) {
  const ch = f.char;
  const s = ch.scale;
  const style = ch.special.style;
  const r = (style === 'beam' ? 6 : 7.5) * (superMove ? 1.8 : 1) * (0.9 + s * 0.1);
  const speed = (style === 'laser' ? 5.6 : 4.5) * (superMove ? 1.3 : 1);
  game.projectiles.push({
    x: f.x + f.facing * (30 * s),
    y: f.y - ch.height * s * 0.56 + 2,
    vx: f.facing * speed,
    r,
    dmg: ch.special.dmg * (superMove ? 1.8 : 1),
    owner: f,
    life: 130,
    age: 0,
    color: ch.special.color,
    style,
    super: superMove,
    dead: false,
  });
  burst(game, f.x + f.facing * 24, f.y - ch.height * s * 0.55, ch.special.color, 10, { speed: 2.4, life: 20, size: 2 });
}

// ---------------------------------------------------------------- hitboxes

function hurtboxOf(f) {
  const s = f.char.scale;
  const lift = (f.char.bodyLift || 0) * s;
  let h = f.char.height * s - lift;
  if (f.crouching) h -= 10 * s;
  const w = f.char.hurtW * s;
  return { x: f.x - w / 2, y: f.y - h, w, h };
}

function hitboxOf(f) {
  const d = f.attack.data;
  const s = f.char.scale;
  let yoff = d.yoff;
  if (!f.onGround) yoff += 6;
  if (f.crouching) yoff += 8;
  const w = d.w * s;
  const h = d.h * s;
  const x = f.facing > 0 ? f.x + d.reach * s - w * 0.25 : f.x - d.reach * s - w * 0.75;
  return { x, y: f.y + yoff * s, w, h };
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveAttack(game, a, d) {
  if (!a.attack || a.attack.hasHit) return;
  if (game.fightLock > 0) return;
  const ad = a.attack;
  const dt = ad.data;
  if (ad.frame < dt.startup || ad.frame >= dt.startup + dt.active) return;
  if (d.state === 'ko') return;

  const hb = hitboxOf(a);
  const hurt = hurtboxOf(d);
  if (!intersects(hb, hurt)) return;

  ad.hasHit = true;
  if (ad.data.dash) a.vx = 0;
  applyHit(game, a, d, {
    dmg: dt.dmg,
    kb: dt.kb,
    hitstun: dt.hitstun,
    meter: dt.meter,
    heavy: dt.heavy,
    special: ad.name === 'special',
    color: a.char.special.color,
    x: Math.max(hb.x, hurt.x) + Math.min(hb.x + hb.w, hurt.x + hurt.w) / 2,
    y: Math.max(hb.y, hurt.y) + Math.min(hb.y + hb.h, hurt.y + hurt.h) / 2,
  });
}

function updateProjectiles(game) {
  for (const p of game.projectiles) {
    p.age++;
    p.x += p.vx;
    p.life--;
    if (p.age % 2 === 0) {
      burst(game, p.x - Math.sign(p.vx) * p.r * 0.8, p.y + (Math.random() - 0.5) * p.r,
        p.color, 1, { speed: 0.5, life: 14, size: 1, grav: 0 });
    }
    if (p.x < -40 || p.x > W + 40 || p.life <= 0) { p.dead = true; continue; }
    const target = p.owner.player === 0 ? game.fighters[1] : game.fighters[0];
    if (target.state === 'ko') continue;
    const box = { x: p.x - p.r * 0.8, y: p.y - p.r * 0.8, w: p.r * 1.6, h: p.r * 1.6 };
    if (intersects(box, hurtboxOf(target))) {
      p.dead = true;
      applyHit(game, p.owner, target, {
        dmg: p.dmg, kb: p.super ? 8 : 5.5, hitstun: 22,
        meter: 7, heavy: true, special: true, color: p.color,
        x: p.x, y: p.y,
      });
    }
  }
  game.projectiles = game.projectiles.filter((p) => !p.dead);
}

function applyHit(game, a, d, hit) {
  if (d.state === 'ko' || d.invuln > 0) return;
  const fromFront = (a.x - d.x) * d.facing >= 0;
  const blocked = d.blocking && d.onGround && fromFront;
  let dmg = hit.dmg * a.char.power;
  if (blocked) dmg *= 0.16;
  dmg = Math.max(1, Math.round(dmg));

  if (blocked) {
    d.hp = Math.max(0, d.hp - dmg);
    d.blockstun = 10;
    d.vx = a.facing * 1.6;
    a.vx = -a.facing * 0.9;
    a.meter = Math.min(100, a.meter + (hit.meter || 5) * 0.3);
    d.meter = Math.min(100, d.meter + 2);
    game.hitstop = 3;
    game.shake = Math.max(game.shake, 2);
    burst(game, hit.x, hit.y, '#8ff7ff', 6, { speed: 2, life: 18, size: 2, dir: a.facing > 0 ? Math.PI : 0, spread: 1.4 });
    addFloat(game, hit.x, hit.y - 8, 'BLOCK', '#8ff7ff', 1);
    audio.block();
    return;
  }

  const wasStunned = d.hitstun > 0;
  d.hp = Math.max(0, d.hp - dmg);
  d.attack = null;
  d.blocking = false;
  d.crouching = false;
  d.hitstun = Math.round(hit.hitstun * (1.15 - d.char.weight * 0.2));
  d.blockstun = 0;
  d.vx = a.facing * hit.kb * (1.2 - d.char.weight * 0.28);
  if (!d.onGround) d.vy = Math.min(d.vy, -2.2);
  d.state = 'hit';

  a.combo = wasStunned ? a.combo + 1 : 1;
  a.comboTimer = 100;
  a.meter = Math.min(100, a.meter + (hit.meter || 6));
  d.meter = Math.min(100, d.meter + 3);

  game.hitstop = hit.special ? 9 : hit.heavy ? 8 : 6;
  game.shake = Math.max(game.shake, hit.special ? 7 : hit.heavy ? 5.5 : 4);
  if (hit.special) game.flash = Math.max(game.flash, 0.18);

  const sparkCols = ['#ffffff', '#ffe36e', hit.color || '#ff9f43'];
  for (let i = 0; i < 10; i++) {
    game.particles.push({
      x: hit.x, y: hit.y,
      vx: a.facing * (0.8 + Math.random() * 3.4) + (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 4.5,
      life: 14 + Math.random() * 14, maxLife: 28,
      size: Math.random() < 0.35 ? 3 : 2,
      color: sparkCols[Math.floor(Math.random() * sparkCols.length)],
      grav: 0.12,
    });
  }
  addFloat(game, d.x, d.y - d.height - 6, String(dmg), dmg >= 12 ? '#ffd75e' : '#ffffff', dmg >= 12 ? 2 : 1);

  if (hit.heavy) audio.heavy(); else audio.hit();

  if (d.hp <= 0) knockout(game, d, a);
}

function knockout(game, loser, winner) {
  if (game.roundOver) return;
  loser.hp = 0;
  loser.state = 'ko';
  loser.koT = 0;
  loser.attack = null;
  loser.hitstun = 0;
  loser.blockstun = 0;
  loser.onGround = false;
  loser.vy = -4.6;
  loser.vx = winner.facing * 3.6;
  winner.state = 'win';
  winner.attack = null;
  winner.roundsWon++;
  game.roundOver = true;
  game.roundOverT = 0;
  game.koWinner = winner;
  game.hitstop = 15;
  game.shake = 12;
  game.flash = 0.5;
  game.announce = {
    text: 'K.O.',
    sub: `${winner.char.name} WINS THE ROUND`,
    t: 0, dur: 112, size: 6, color: '#ffe36e',
  };
  audio.ko();
  burst(game, loser.x, loser.y - loser.height * 0.6, '#ffe36e', 26, { speed: 5, life: 40, size: 2 });
}

function timeUp(game) {
  if (game.roundOver) return;
  const [f1, f2] = game.fighters;
  game.roundOver = true;
  game.roundOverT = 0;
  audio.timeUp();
  if (f1.hp === f2.hp) {
    game.koWinner = null;
    game.announce = { text: 'DRAW', sub: 'NOBODY WINS THIS ONE', t: 0, dur: 110, size: 5, color: '#b9aee0' };
    game.shake = 5;
    return;
  }
  const winner = f1.hp > f2.hp ? f1 : f2;
  const loser = winner === f1 ? f2 : f1;
  winner.roundsWon++;
  winner.state = 'win';
  winner.attack = null;
  loser.hp = 0;
  loser.state = 'ko';
  loser.koT = 0;
  loser.attack = null;
  loser.onGround = false;
  loser.vy = -4;
  loser.vx = -loser.facing * 3;
  game.koWinner = winner;
  game.hitstop = 12;
  game.shake = 8;
  game.announce = {
    text: 'TIME UP',
    sub: `${winner.char.name} WINS THE ROUND`,
    t: 0, dur: 112, size: 5, color: '#ff8a3d',
  };
}

function endMatch(game, winner) {
  game.scene = 'result';
  const [f1, f2] = game.fighters;
  game.result = {
    winner,
    winnerIdx: winner.player,
    rounds: [f1.roundsWon, f2.roundsWon],
    perfect: winner.hp >= winner.maxHp,
  };
  game.resultIndex = 0;
  game.particles = [];
  game.hitstop = 0;
  game.flash = 0;
  audio.stopTrack();
  audio.fanfare();
}

function resolvePush(game) {
  const [a, b] = game.fighters;
  if (a.state === 'ko' || b.state === 'ko') return;
  const minDist = (a.pushW + b.pushW) / 2;
  const dx = b.x - a.x;
  const ad = Math.abs(dx);
  if (ad < minDist && Math.abs(a.y - b.y) < 60) {
    const push = (minDist - ad) / 2;
    const s = dx === 0 ? 1 : Math.sign(dx);
    a.x -= push * s;
    b.x += push * s;
    a.x = Math.max(26, Math.min(W - 26, a.x));
    b.x = Math.max(26, Math.min(W - 26, b.x));
  }
}

// ---------------------------------------------------------------- fx

export function burst(game, x, y, color, count, opts = {}) {
  const { speed = 2.5, life = 24, size = 2, grav = 0.12, dir = null, spread = Math.PI * 2, up = 0 } = opts;
  for (let i = 0; i < count; i++) {
    if (game.particles.length > 260) break;
    const ang = dir == null ? Math.random() * Math.PI * 2 : dir + (Math.random() - 0.5) * spread;
    const sp = speed * (0.35 + Math.random());
    game.particles.push({
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - up * Math.random() * 2,
      life: life * (0.5 + Math.random() * 0.7),
      maxLife: life,
      size: Math.random() < 0.25 ? size + 1 : size,
      color, grav,
    });
  }
}

function addFloat(game, x, y, text, color, scale = 1) {
  game.floats.push({ x, y, text, color, scale, life: 42, vy: -0.75 });
}

function tickParticles(game) {
  for (const p of game.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.grav;
    p.vx *= 0.98;
    p.life--;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

function tickFloats(game) {
  for (const f of game.floats) {
    f.y += f.vy;
    f.vy *= 0.96;
    f.life--;
  }
  game.floats = game.floats.filter((f) => f.life > 0);
}

function tickAfterimages(game) {
  for (const a of game.afterimages) a.life--;
  game.afterimages = game.afterimages.filter((a) => a.life > 0);
}

// ---------------------------------------------------------------- CPU

function updateCPU(game, f, opp, inp) {
  const ai = game.ai;
  if (game.roundOver || game.fightLock > 0) return;
  const level = AI_LEVELS[game.diff] || AI_LEVELS[1];
  const dist = Math.abs(opp.x - f.x);

  ai.timer--;
  if (ai.timer <= 0) {
    ai.timer = level.react + Math.random() * 22;
    const r = Math.random();
    if (dist > 145) {
      ai.action = r < 0.22 ? 'special' : r < 0.38 ? 'jumpIn' : 'approach';
    } else if (dist > 72) {
      ai.action = r < 0.4 ? 'approach' : r < 0.58 ? 'special' : r < 0.74 ? 'jumpIn' : 'block';
    } else {
      ai.action = r < 0.52 ? 'attack' : r < 0.68 ? 'block' : r < 0.82 ? 'retreat' : 'attack';
    }
    ai.actionT = 10 + Math.random() * 20;
  }
  ai.actionT--;

  if (opp.attack && dist < 100 && Math.random() < level.block * 0.16) {
    ai.action = 'block';
    ai.actionT = Math.max(ai.actionT, 9);
  }

  const toward = Math.sign(opp.x - f.x) || 1;
  const hold = (d) => {
    if (d > 0) inp.right = true;
    else if (d < 0) inp.left = true;
  };

  switch (ai.action) {
    case 'approach':
      hold(toward);
      if (Math.random() < 0.004) inp.up = true;
      break;
    case 'retreat':
      hold(-toward);
      break;
    case 'block':
      inp.block = true;
      break;
    case 'jumpIn':
      if (f.onGround && ai.actionT > 10) inp.up = true;
      hold(toward);
      if (!f.onGround && dist < 95 && Math.random() < 0.18) inp.kick = true;
      break;
    case 'attack':
      if (dist < 88) {
        if (Math.random() < 0.14) {
          if (Math.random() < 0.62) inp.punch = true;
          else inp.kick = true;
        }
      } else hold(toward);
      break;
    case 'special':
      if (f.meter >= 50 && dist < 185) {
        inp.special = true;
        ai.action = 'wait';
      } else hold(toward);
      break;
    default:
      break;
  }

  if (f.meter >= 100 && dist < 200 && Math.random() < 0.012) inp.special = true;
}
