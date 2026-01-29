import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

function hash2(ix: number, iy: number, seed: number) {
  let n = (ix | 0) * 374761393 + (iy | 0) * 668265263 + (seed | 0) * 1442695041;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const r00 = hash2(xi, yi, seed);
  const r10 = hash2(xi + 1, yi, seed);
  const r01 = hash2(xi, yi + 1, seed);
  const r11 = hash2(xi + 1, yi + 1, seed);

  const u = smoothstep(xf);
  const v = smoothstep(yf);

  const a = lerp(r00, r10, u);
  const b = lerp(r01, r11, u);
  return lerp(a, b, v);
}

export const evalNoise: TopOpEval = ({ nodeId, params, ctx }) => {
  const p = params && params.kind === "noise" ? params : null;

  const seed = p ? p.seed : 1;
  const scale = p ? Math.max(2, p.scale) : 18;
  const speed = p ? p.speed : 0.8;
  const contrast = p ? p.contrast : 1.2;

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const g = get2d(out, true);

  const img = g.createImageData(ctx.w, ctx.h);
  const data = img.data;

  const t = ctx.now * 0.001 * speed;

  for (let y = 0; y < ctx.h; y++) {
    for (let x = 0; x < ctx.w; x++) {
      const nx = (x + t * 14) / scale;
      const ny = (y + t * 9) / scale;

      const n1 = valueNoise(nx, ny, seed);
      const n2 = valueNoise(nx * 2.0, ny * 2.0, seed + 17) * 0.5;
      let v = n1 * 0.75 + n2 * 0.25;

      v = (v - 0.5) * contrast + 0.5;
      v = clamp01(v);

      const c = (v * 255) | 0;
      const idx = (y * ctx.w + x) * 4;
      data[idx + 0] = c;
      data[idx + 1] = c;
      data[idx + 2] = c;
      data[idx + 3] = 255;
    }
  }

  g.putImageData(img, 0, 0);
  return out;
};
