import { makeChop } from "./types";
import type { Chop } from "./types";

export type LfoParams = {
  waveform: "sine" | "square" | "ramp" | "triangle";
  frequency: number; // Hz
  amplitude: number; // peak amplitude
  offset: number;    // DC offset
  numSamples: number;
};

function lfoSample(waveform: string, phase: number): number {
  // phase is in cycles (can be fractional / negative), normalised inside
  const p = ((phase % 1) + 1) % 1; // 0..1
  switch (waveform) {
    case "sine":     return Math.sin(2 * Math.PI * p);
    case "square":   return p < 0.5 ? 1 : -1;
    case "ramp":     return 2 * p - 1;           // -1 → +1 sawtooth
    case "triangle": return 1 - Math.abs(4 * p - 2); // -1 → +1 triangle
    default:         return 0;
  }
}

export function evalLfo(p: LfoParams): Chop {
  const { waveform, frequency, amplitude, offset, numSamples } = p;
  const sr = 60;
  const out = makeChop(1, numSamples, sr);
  const ch = out.channels[0];
  const now = performance.now() * 0.001; // seconds

  for (let i = 0; i < numSamples; i++) {
    const tSample = now - (numSamples - 1 - i) / sr;
    const phase = tSample * frequency;
    ch[i] = amplitude * lfoSample(waveform, phase) + offset;
  }

  return out;
}
