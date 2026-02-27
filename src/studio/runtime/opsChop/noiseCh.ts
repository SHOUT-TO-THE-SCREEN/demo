import { makeChop } from "./types";
import type { Chop } from "./types";

// ─── shared noise helpers ─────────────────────────────────────────────────────

function hash2(ix: number, iy: number, seed: number): number {
  let n = (ix | 0) * 374761393 + (iy | 0) * 668265263 + (seed | 0) * 1442695041;
  n = ((n ^ (n >>> 13)) * 1274126177) | 0;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}

function smoothstep(t: number) { return t * t * (3 - 2 * t); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function valueNoise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = smoothstep(xf), v = smoothstep(yf);
  return lerp(
    lerp(hash2(xi, yi, seed), hash2(xi + 1, yi, seed), u),
    lerp(hash2(xi, yi + 1, seed), hash2(xi + 1, yi + 1, seed), u),
    v,
  );
}

// ─── eval ─────────────────────────────────────────────────────────────────────

export type NoiseChParams = {
  seed: number;
  period: number;       // seconds per one noise cycle
  amplitude: number;    // output range: 0 → amplitude
  numChannels: number;  // 1–4
  numSamples: number;   // history length
};

export function evalNoiseCh(p: NoiseChParams): Chop {
  const { seed, period, amplitude, numChannels, numSamples } = p;
  const sr = 60;
  const out = makeChop(numChannels, numSamples, sr);
  const now = performance.now() * 0.001; // seconds

  for (let c = 0; c < numChannels; c++) {
    const ch = out.channels[c];
    for (let i = 0; i < numSamples; i++) {
      // tSample: from oldest (i=0) to newest (i=numSamples-1)
      const tSample = now - (numSamples - 1 - i) / sr;
      const x = tSample / Math.max(0.001, period);
      const y = c * 7.3 + seed * 0.13;
      ch[i] = amplitude * valueNoise2D(x, y, seed);
    }
  }

  return out;
}
