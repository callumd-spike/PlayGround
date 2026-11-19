// Chiptune-style audio engine (WebAudio, no external assets).
class ChipAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('critterclash_muted') === '1'; } catch (e) {}
    this.track = null;
    this.timer = null;
    this.step = 0;
    this.vol = 0.5;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.vol;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('critterclash_muted', m ? '1' : '0'); } catch (e) {}
    if (this.master) this.master.gain.value = m ? 0 : this.vol;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  tone(freq, dur, opts = {}) {
    if (!this.ctx || this.muted) return;
    const { type = 'square', vol = 0.06, slide = null, delay = 0 } = opts;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  noise(dur, opts = {}) {
    if (!this.ctx || this.muted) return;
    const { vol = 0.08, delay = 0, hp = 1200, lp = 9000 } = opts;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = (hp + lp) / 2;
    bp.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t0);
  }

  jump() { this.tone(280, 0.12, { type: 'square', vol: 0.035, slide: 620 }); }
  swing() { this.noise(0.08, { vol: 0.035, hp: 500, lp: 2400 }); }
  hit() {
    this.noise(0.09, { vol: 0.11, hp: 300, lp: 2200 });
    this.tone(140, 0.08, { type: 'square', vol: 0.05, slide: 60 });
  }
  heavy() {
    this.noise(0.16, { vol: 0.15, hp: 160, lp: 1500 });
    this.tone(90, 0.18, { type: 'sawtooth', vol: 0.07, slide: 40 });
  }
  block() {
    this.tone(880, 0.05, { type: 'square', vol: 0.04, slide: 1200 });
    this.noise(0.05, { vol: 0.03, hp: 2000, lp: 7000 });
  }
  ko() {
    this.tone(420, 0.5, { type: 'sawtooth', vol: 0.09, slide: 60 });
    this.noise(0.4, { vol: 0.12, hp: 120, lp: 900 });
    this.tone(210, 0.6, { type: 'square', vol: 0.05, slide: 50, delay: 0.08 });
  }
  special() {
    const seq = [440, 554, 659, 880, 1108];
    seq.forEach((f, i) => this.tone(f, 0.09, { type: 'square', vol: 0.045, delay: i * 0.045 }));
  }
  superMove() {
    const seq = [523, 659, 784, 1046, 1318, 1568];
    seq.forEach((f, i) => this.tone(f, 0.12, { type: 'square', vol: 0.05, delay: i * 0.05 }));
    this.noise(0.5, { vol: 0.08, hp: 400, lp: 5000 });
  }
  deny() { this.tone(160, 0.08, { type: 'square', vol: 0.035, slide: 110 }); }
  select() { this.tone(660, 0.05, { type: 'square', vol: 0.045 }); this.tone(990, 0.06, { type: 'square', vol: 0.035, delay: 0.05 }); }
  move() { this.tone(440, 0.03, { type: 'square', vol: 0.025 }); }
  confirm() { this.tone(523, 0.06, { type: 'square', vol: 0.05 }); this.tone(784, 0.1, { type: 'square', vol: 0.05, delay: 0.06 }); }
  round() {
    this.tone(392, 0.12, { type: 'square', vol: 0.06 });
    this.tone(523, 0.2, { type: 'square', vol: 0.06, delay: 0.14 });
  }
  timeUp() {
    this.tone(880, 0.15, { type: 'square', vol: 0.05 });
    this.tone(660, 0.15, { type: 'square', vol: 0.05, delay: 0.16 });
    this.tone(440, 0.4, { type: 'square', vol: 0.05, delay: 0.32 });
  }
  fanfare() {
    const seq = [
      [523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.3],
      [784, 0.1], [1046, 0.4],
    ];
    let t = 0;
    for (const [f, d] of seq) {
      this.tone(f, d, { type: 'square', vol: 0.06, delay: t });
      t += d * 0.85;
    }
  }

  noteFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  playTrack(name) {
    if (!this.ctx) { this.pendingTrack = name; return; }
    if (this.track === name) return;
    this.stopTrack();
    this.track = name;
    this.step = 0;
    if (!name) return;
    const bpm = name === 'fight' ? 148 : 96;
    const ms = 60000 / bpm / 4;
    this.timer = setInterval(() => this.tick(), ms);
    this.tick();
  }

  stopTrack() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  tick() {
    if (!this.ctx || this.muted) { this.step++; return; }
    const s = this.step;
    if (this.track === 'menu') {
      const roots = [45, 41, 48, 43];
      const chord = [0, 3, 7, 10];
      const bar = Math.floor(s / 16) % 4;
      const root = roots[bar];
      if (s % 16 === 0) this.tone(this.noteFreq(root - 12), 0.7, { type: 'triangle', vol: 0.05 });
      if (s % 4 === 0) this.tone(this.noteFreq(root), 0.2, { type: 'triangle', vol: 0.025 });
      if (s % 2 === 0) {
        const idx = (s / 2) % 4;
        const oct = idx === 3 ? 24 : 12;
        this.tone(this.noteFreq(root + chord[idx] + oct), 0.12, { type: 'square', vol: 0.017 });
      }
      if (s % 8 === 6) this.noise(0.04, { vol: 0.012, hp: 4000, lp: 9000 });
    } else if (this.track === 'fight') {
      const bassSeq = [33, 33, 36, 33, 31, 31, 36, 38];
      const i = Math.floor(s / 2) % 8;
      if (s % 2 === 0) this.tone(this.noteFreq(bassSeq[i]), 0.11, { type: 'square', vol: 0.038 });
      if (s % 8 === 0 || s % 8 === 3) this.noise(0.09, { vol: 0.045, hp: 60, lp: 260 });
      if (s % 4 === 2) this.noise(0.03, { vol: 0.018, hp: 6000, lp: 12000 });
      if (s % 16 === 12) {
        this.tone(this.noteFreq(57 + (s % 32 === 12 ? 0 : 3)), 0.1, { type: 'square', vol: 0.02 });
      }
      if (s % 32 === 16) {
        this.tone(this.noteFreq(69), 0.18, { type: 'sawtooth', vol: 0.015 });
        this.tone(this.noteFreq(72), 0.18, { type: 'sawtooth', vol: 0.015 });
      }
    }
    this.step++;
  }
}

export const audio = new ChipAudio();
