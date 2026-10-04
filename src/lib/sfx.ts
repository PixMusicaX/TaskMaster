// Synthesized UI sounds (Web Audio) — no audio files to download.
// The context is created on the first user gesture, as browsers require.

const MUTE_KEY = "sfx_muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const listeners = new Set<() => void>();

function readMuted() {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

let muted = typeof window !== "undefined" ? readMuted() : false;

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try { localStorage.setItem(MUTE_KEY, value ? "1" : "0"); } catch { /* storage unavailable */ }
  listeners.forEach(l => l());
}

export function subscribeMuted(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function ensureContext() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  const compressor = ctx.createDynamicsCompressor();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(compressor).connect(ctx.destination);
  return ctx;
}

// Call once on mount: unlocks audio on the first tap/click
export function initSfx() {
  if (typeof window === "undefined") return;
  const unlock = () => ensureContext();
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
}

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  slideTo?: number;
}

function tone(freq: number, start: number, duration: number, { type = "sine", gain = 0.15, attack = 0.005, slideTo }: ToneOptions = {}) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(env).connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

interface NoiseOptions {
  gain?: number;
  type?: BiquadFilterType;
  freq?: number;
  // Sweep the filter to this frequency over the burst
  freqTo?: number;
  q?: number;
}

// A burst of filtered white noise (swooshes, slashes, TV static)
function noise(start: number, duration: number, { gain = 0.12, type = "bandpass", freq = 2000, freqTo, q = 1 }: NoiseOptions = {}) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + start;
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t0);
  if (freqTo) filter.frequency.exponentialRampToValueAtTime(freqTo, t0 + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.02, duration / 4));
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(env).connect(master);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

// Today's Persona style (lib/persona.ts), which swaps in that game's flavour of each sound
function persona(): string | null {
  return typeof document === "undefined" ? null : document.documentElement.getAttribute("data-persona");
}

function play(fn: () => void) {
  if (muted || typeof window === "undefined") return;
  if (!ensureContext()) return;
  fn();
}

function vibrate(pattern: number | number[]) {
  if (muted) return;
  navigator.vibrate?.(pattern);
}

// Persona-day sounds: a slash and a jazzy stab for P5, TV blips for P4, glassy bells for P3
const personaSfx = {
  complete(style: string) {
    if (style === "p5") {
      noise(0, 0.12, { freq: 5000, freqTo: 1800, q: 0.8, gain: 0.14 });
      tone(1760, 0.02, 0.08, { type: "square", gain: 0.06 });
      tone(2637, 0.07, 0.12, { type: "square", gain: 0.05 });
    } else if (style === "p4") {
      tone(988, 0, 0.07, { type: "square", gain: 0.07 });
      tone(1319, 0.07, 0.12, { type: "square", gain: 0.07 });
      noise(0, 0.05, { type: "highpass", freq: 6000, gain: 0.05 });
    } else {
      tone(1568, 0, 0.6, { type: "sine", gain: 0.1 });
      tone(2349, 0.05, 0.7, { type: "sine", gain: 0.05 });
      tone(3136, 0.1, 0.5, { type: "sine", gain: 0.025 });
    }
  },
  levelUp(style: string) {
    if (style === "p5") {
      // Cm9 stab, then a run up
      noise(0, 0.25, { freq: 3000, freqTo: 900, gain: 0.12 });
      [261.63, 311.13, 392, 466.16, 587.33].forEach(f => tone(f, 0.05, 0.4, { type: "sawtooth", gain: 0.035 }));
      [783.99, 932.33, 1174.66, 1567.98].forEach((f, i) => tone(f, 0.3 + i * 0.06, 0.18, { type: "square", gain: 0.04 }));
    } else if (style === "p4") {
      [659.25, 783.99, 987.77, 1318.5, 1567.98].forEach((f, i) => tone(f, i * 0.07, 0.16, { type: "square", gain: 0.06 }));
      tone(2093, 0.4, 0.35, { type: "triangle", gain: 0.06 });
    } else {
      [587.33, 880, 1174.66, 1760].forEach((f, i) => {
        tone(f, i * 0.11, 0.9, { type: "sine", gain: 0.08 });
        tone(f, i * 0.11 + 0.25, 0.7, { type: "sine", gain: 0.025 });
      });
    }
  },
  rankUp(style: string) {
    if (style === "p5") {
      noise(0, 0.5, { freq: 6000, freqTo: 400, gain: 0.15 });
      [130.81, 196, 233.08, 293.66, 349.23].forEach(f => tone(f, 0.35, 1.6, { type: "sawtooth", gain: 0.03, attack: 0.02 }));
      [1046.5, 1244.5, 1568, 1864.7, 2093].forEach((f, i) => tone(f, 0.8 + i * 0.07, 0.25, { type: "square", gain: 0.035 }));
    } else if (style === "p4") {
      noise(0, 0.3, { type: "highpass", freq: 4000, gain: 0.08 });
      [523.25, 659.25, 783.99, 1046.5].forEach(f => tone(f, 0.3, 1.4, { type: "square", gain: 0.035, attack: 0.05 }));
      [1318.5, 1568, 2093, 2637].forEach((f, i) => tone(f, 0.6 + i * 0.08, 0.3, { type: "triangle", gain: 0.05 }));
    } else {
      [293.66, 440, 587.33, 880].forEach(f => tone(f, 0, 2.2, { type: "sine", gain: 0.06, attack: 0.5 }));
      [1174.66, 1396.9, 1760, 2349.3].forEach((f, i) => tone(f, 0.6 + i * 0.14, 1, { type: "sine", gain: 0.04 }));
    }
  },
};

export const sfx = {
  // Bright two-note blip
  complete() {
    const style = persona();
    play(() => {
      if (style) return personaSfx.complete(style);
      tone(1318.5, 0, 0.09, { type: "triangle", gain: 0.12 });
      tone(1975.5, 0.06, 0.14, { type: "triangle", gain: 0.1 });
    });
    vibrate(8);
  },
  // Soft falling note for unchecking
  undo() {
    play(() => tone(520, 0, 0.16, { type: "sine", gain: 0.07, slideTo: 330 }));
  },
  // Rising major arpeggio with a shimmer tail
  levelUp() {
    const style = persona();
    play(() => {
      if (style) return personaSfx.levelUp(style);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.28, { type: "triangle", gain: 0.13 }));
      tone(2093, 0.34, 0.7, { type: "sine", gain: 0.06 });
      tone(3136, 0.4, 0.6, { type: "sine", gain: 0.03 });
    });
    vibrate([14, 40, 14, 40, 24]);
  },
  // Swelling chord with a sparkle run
  rankUp() {
    const style = persona();
    play(() => {
      if (style) return personaSfx.rankUp(style);
      [261.63, 392, 523.25, 659.25].forEach(f => tone(f, 0, 1.8, { type: "triangle", gain: 0.09, attack: 0.35 }));
      [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => tone(f, 0.45 + i * 0.07, 0.4, { type: "sine", gain: 0.05 }));
    });
    vibrate([20, 60, 20, 60, 60]);
  },
  // Persona days: the page wipe
  swoosh() {
    const style = persona();
    play(() => {
      if (style === "p4") noise(0, 0.3, { type: "highpass", freq: 3000, gain: 0.07 });
      else if (style === "p5") noise(0, 0.32, { freq: 600, freqTo: 5000, q: 1.4, gain: 0.12 });
      else noise(0, 0.5, { freq: 900, freqTo: 3200, q: 2, gain: 0.06 });
    });
  },
  // Persona days: the opening splash
  personaIntro() {
    const style = persona();
    play(() => {
      if (style === "p5") {
        noise(0, 0.4, { freq: 800, freqTo: 6000, gain: 0.12 });
        [196, 233.08, 293.66, 349.23].forEach(f => tone(f, 0.45, 0.6, { type: "sawtooth", gain: 0.035 }));
      } else if (style === "p4") {
        noise(0, 1, { type: "highpass", freq: 2500, gain: 0.06 });
        tone(15000, 0, 1.2, { type: "sine", gain: 0.01 });
        tone(880, 0.8, 0.3, { type: "square", gain: 0.05 });
      } else {
        [220, 329.63, 440].forEach(f => tone(f, 0, 2.4, { type: "sine", gain: 0.06, attack: 0.6 }));
        tone(1318.5, 0.6, 1.4, { type: "sine", gain: 0.03 });
      }
    });
  },
};
