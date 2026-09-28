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

function play(fn: () => void) {
  if (muted || typeof window === "undefined") return;
  if (!ensureContext()) return;
  fn();
}

function vibrate(pattern: number | number[]) {
  if (muted) return;
  navigator.vibrate?.(pattern);
}

export const sfx = {
  // Bright two-note blip
  complete() {
    play(() => {
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
    play(() => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.28, { type: "triangle", gain: 0.13 }));
      tone(2093, 0.34, 0.7, { type: "sine", gain: 0.06 });
      tone(3136, 0.4, 0.6, { type: "sine", gain: 0.03 });
    });
    vibrate([14, 40, 14, 40, 24]);
  },
  // Swelling chord with a sparkle run
  rankUp() {
    play(() => {
      [261.63, 392, 523.25, 659.25].forEach(f => tone(f, 0, 1.8, { type: "triangle", gain: 0.09, attack: 0.35 }));
      [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => tone(f, 0.45 + i * 0.07, 0.4, { type: "sine", gain: 0.05 }));
    });
    vibrate([20, 60, 20, 60, 60]);
  },
};
