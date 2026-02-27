import { makeChop } from "./types";
import type { Chop } from "./types";

const NUM_BANDS = 64;

// ─── smoothing state per node ─────────────────────────────────────────────────
const smoothBuf = new Map<string, Float32Array>();

// ─── Cooley-Tukey radix-2 in-place FFT ───────────────────────────────────────
function fftInplace(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }
  // Butterfly passes
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wR = Math.cos(ang), wI = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let uR = 1, uI = 0;
      for (let k = 0; k < (len >> 1); k++) {
        const eR = re[i + k], eI = im[i + k];
        const oR = re[i + k + (len >> 1)] * uR - im[i + k + (len >> 1)] * uI;
        const oI = re[i + k + (len >> 1)] * uI + im[i + k + (len >> 1)] * uR;
        re[i + k] = eR + oR;
        im[i + k] = eI + oI;
        re[i + k + (len >> 1)] = eR - oR;
        im[i + k + (len >> 1)] = eI - oI;
        const nR = uR * wR - uI * wI;
        uI = uR * wI + uI * wR;
        uR = nR;
      }
    }
  }
}

// ─── main eval ────────────────────────────────────────────────────────────────
export function evalFftChop(
  nodeId: string,
  inChop: Chop,
  smoothing: number,
  intensity: number,
): Chop {
  const out = makeChop(1, NUM_BANDS, inChop.sampleRate || 60);

  const input = inChop.channels[0];
  if (!input || input.length < 2) return out;

  // Next power-of-2 size ≥ input.length
  let n = 1;
  while (n < input.length) n <<= 1;

  const re = new Float32Array(n);
  const im = new Float32Array(n);

  // Apply Hanning window
  const len = Math.min(input.length, n);
  for (let i = 0; i < len; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (len - 1)));
    re[i] = input[i] * w;
  }

  fftInplace(re, im);

  // Extract magnitude spectrum, binned into NUM_BANDS
  const half = n / 2;
  let prev = smoothBuf.get(nodeId);
  if (!prev || prev.length !== NUM_BANDS) {
    prev = new Float32Array(NUM_BANDS);
    smoothBuf.set(nodeId, prev);
  }

  const ch = out.channels[0];
  const sm = Math.max(0, Math.min(0.99, smoothing));

  for (let b = 0; b < NUM_BANDS; b++) {
    const lo = Math.floor((b * half) / NUM_BANDS);
    const hi = Math.max(lo + 1, Math.floor(((b + 1) * half) / NUM_BANDS));
    let mag = 0;
    for (let j = lo; j < hi; j++) {
      const m = Math.sqrt(re[j] * re[j] + im[j] * im[j]) / n;
      if (m > mag) mag = m;
    }
    mag = Math.min(1, mag * intensity * 30);
    prev[b] = prev[b] * sm + mag * (1 - sm);
    ch[b] = prev[b];
  }

  return out;
}
