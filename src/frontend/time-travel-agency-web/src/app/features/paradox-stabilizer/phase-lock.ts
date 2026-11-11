import { ParadoxType } from '../../core/models/paradox.model';

/**
 * "Phase Lock" — the field stabilisation mini-game. A paradox shows up as a distorted temporal wave;
 * the agent tunes frequency, phase and amplitude of the agency's counter-wave until both resonate.
 * Pure functions only, so the rules are unit-testable and the component just renders them.
 */

export interface WaveParams {
  /** Cycles across the viewport. */
  frequency: number;
  /** Degrees, 0–359. */
  phase: number;
  /** 0.3–1 of the half height. */
  amplitude: number;
}

export interface PhaseLockPuzzle {
  target: WaveParams;
  start: WaveParams;
  /** How fast the paradox's phase drifts (degrees per second) — the timeline keeps rewriting itself. */
  driftDegPerSec: number;
  timeLimitMs: number;
  type: ParadoxType;
}

export const RANGES = {
  frequency: { min: 1, max: 5, step: 0.05 },
  phase: { min: 0, max: 359, step: 1 },
  amplitude: { min: 0.3, max: 1, step: 0.01 },
} as const;

/** Resonance needed to count as locked, and how long it must be held. */
export const LOCK_THRESHOLD = 0.9;
export const LOCK_HOLD_MS = 1500;
const SAMPLES = 160;

interface TypeRules {
  /** Wave shape for u = angle in radians. Both waves share the shape, so only the parameters differ. */
  shape: (u: number) => number;
  driftDegPerSec: number;
  timeLimitMs: number;
  briefing: string;
}

export const TYPE_RULES: Record<ParadoxType, TypeRules> = {
  GrandFatherParadox: {
    shape: u => Math.sin(u),
    driftDegPerSec: 9,
    timeLimitMs: 45_000,
    briefing: 'The bloodline keeps rewriting itself — the paradox wave drifts. Chase its phase and lock on.',
  },
  BootstrapParadox: {
    shape: u => (Math.sin(u) + 0.35 * Math.sin(2 * u)) / 1.2,
    driftDegPerSec: 0,
    timeLimitMs: 40_000,
    briefing: 'A closed causal loop with an echo harmonic. It holds still — but the echo makes it deceptive.',
  },
  PredestinationParadox: {
    shape: u => Math.tanh(2.6 * Math.sin(u)),
    driftDegPerSec: 4,
    timeLimitMs: 45_000,
    briefing: 'Fate has hardened into square edges. Match its rhythm before the loop sets permanently.',
  },
  InformationParadox: {
    shape: u => (Math.sin(u) + 0.25 * Math.sin(3 * u)) / 1.1,
    driftDegPerSec: 6,
    timeLimitMs: 45_000,
    briefing: 'Knowledge without origin leaks a third harmonic. Filter it out by matching the carrier wave.',
  },
};

/** Deterministic PRNG (mulberry32) seeded from the paradox GUID, so every paradox is its own puzzle. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const snap = (value: number, step: number) => Math.round(value / step) * step;

export function createPuzzle(seed: string, type: ParadoxType): PhaseLockPuzzle {
  const rnd = seededRandom(seed);
  const target: WaveParams = {
    frequency: snap(1.5 + rnd() * 3, RANGES.frequency.step),
    phase: Math.floor(rnd() * 360),
    amplitude: snap(0.45 + rnd() * 0.5, RANGES.amplitude.step),
  };
  // Start clearly out of tune so there is always something to do.
  const start: WaveParams = {
    frequency: snap(target.frequency > 3 ? 1.2 + rnd() * 0.8 : 3.8 + rnd() * 1, RANGES.frequency.step),
    phase: Math.floor((target.phase + 120 + rnd() * 120) % 360),
    amplitude: snap(target.amplitude > 0.65 ? 0.32 + rnd() * 0.1 : 0.85 + rnd() * 0.13, RANGES.amplitude.step),
  };
  const rules = TYPE_RULES[type] ?? TYPE_RULES.GrandFatherParadox;
  return { target, start, driftDegPerSec: rules.driftDegPerSec, timeLimitMs: rules.timeLimitMs, type };
}

/** The paradox wave at a given elapsed time (its phase drifts). */
export function targetAt(puzzle: PhaseLockPuzzle, elapsedMs: number): WaveParams {
  const phase = (puzzle.target.phase + (puzzle.driftDegPerSec * elapsedMs) / 1000) % 360;
  return { ...puzzle.target, phase };
}

/** Wave height in [-1, 1] at horizontal position x in [0, 1]. */
export function waveValue(type: ParadoxType, p: WaveParams, x: number): number {
  const shape = (TYPE_RULES[type] ?? TYPE_RULES.GrandFatherParadox).shape;
  return p.amplitude * shape(2 * Math.PI * p.frequency * x + (p.phase * Math.PI) / 180);
}

/**
 * Resonance between two waves in [0, 1]: 1 = identical, 0 = uncorrelated or opposed.
 * 1 − RMS(difference) / sqrt(power(a) + power(b)).
 */
export function resonance(type: ParadoxType, a: WaveParams, b: WaveParams): number {
  let diff = 0;
  let pa = 0;
  let pb = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const x = i / (SAMPLES - 1);
    const ya = waveValue(type, a, x);
    const yb = waveValue(type, b, x);
    diff += (ya - yb) ** 2;
    pa += ya * ya;
    pb += yb * yb;
  }
  const denom = Math.sqrt(pa + pb);
  if (denom === 0) return 0;
  return Math.max(0, Math.min(1, 1 - Math.sqrt(diff) / denom));
}

/** SVG path for a wave across a `width` × `height` viewport. */
export function wavePath(type: ParadoxType, p: WaveParams, width: number, height: number, points = 140): string {
  const mid = height / 2;
  const amp = height * 0.42;
  let d = '';
  for (let i = 0; i < points; i++) {
    const x = i / (points - 1);
    const y = mid - waveValue(type, p, x) * amp;
    d += `${i === 0 ? 'M' : 'L'}${(x * width).toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}
