import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

function boxBlur1D(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, radius: number, horizontal: boolean) {
  const channels = 4;
  const window = radius * 2 + 1;

  if (horizontal) {
    for (let y = 0; y < h; y++) {
      // 누적합(슬라이딩 윈도우)
      let sum = [0, 0, 0, 0];
      for (let x = -radius; x <= radius; x++) {
        const xx = Math.max(0, Math.min(w - 1, x));
        const i = (y * w + xx) * channels;
        sum[0] += src[i + 0];
        sum[1] += src[i + 1];
        sum[2] += src[i + 2];
        sum[3] += src[i + 3];
      }

      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * channels;
        dst[o + 0] = (sum[0] / window) | 0;
        dst[o + 1] = (sum[1] / window) | 0;
        dst[o + 2] = (sum[2] / window) | 0;
        dst[o + 3] = (sum[3] / window) | 0;

        const xRemove = Math.max(0, x - radius);
        const xAdd = Math.min(w - 1, x + radius + 1);

        const iR = (y * w + xRemove) * channels;
        const iA = (y * w + xAdd) * channels;

        sum[0] += src[iA + 0] - src[iR + 0];
        sum[1] += src[iA + 1] - src[iR + 1];
        sum[2] += src[iA + 2] - src[iR + 2];
        sum[3] += src[iA + 3] - src[iR + 3];
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      let sum = [0, 0, 0, 0];
      for (let y = -radius; y <= radius; y++) {
        const yy = Math.max(0, Math.min(h - 1, y));
        const i = (yy * w + x) * channels;
        sum[0] += src[i + 0];
        sum[1] += src[i + 1];
        sum[2] += src[i + 2];
        sum[3] += src[i + 3];
      }

      for (let y = 0; y < h; y++) {
        const o = (y * w + x) * channels;
        dst[o + 0] = (sum[0] / window) | 0;
        dst[o + 1] = (sum[1] / window) | 0;
        dst[o + 2] = (sum[2] / window) | 0;
        dst[o + 3] = (sum[3] / window) | 0;

        const yRemove = Math.max(0, y - radius);
        const yAdd = Math.min(h - 1, y + radius + 1);

        const iR = (yRemove * w + x) * channels;
        const iA = (yAdd * w + x) * channels;

        sum[0] += src[iA + 0] - src[iR + 0];
        sum[1] += src[iA + 1] - src[iR + 1];
        sum[2] += src[iA + 2] - src[iR + 2];
        sum[3] += src[iA + 3] - src[iR + 3];
      }
    }
  }
}

function runBoxBlur(data: Uint8ClampedArray, w: number, h: number, radius: number, passes: number) {
  const tmp = new Uint8ClampedArray(data.length);
  const tmp2 = new Uint8ClampedArray(data.length);
  tmp.set(data);

  for (let p = 0; p < passes; p++) {
    boxBlur1D(tmp, tmp2, w, h, radius, true);
    boxBlur1D(tmp2, tmp, w, h, radius, false);
  }

  data.set(tmp);
}

export const evalBlur: TopOpEval = ({ nodeId, params, ctx, evalTOP, inputMap }) => {
  const srcId = inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
  if (!srcId) return null;

  const src = evalTOP(srcId, ctx.w, ctx.h);
  if (!src) return null;

  const p = params && params.kind === "blur" ? params : null;
  const radius = p ? Math.max(0, Math.floor(p.radius)) : 0;
  const mode = p ? p.mode : "box"; // "box" | "gaussian"

  if (radius === 0) return src;

  const sctx = get2d(src, true);
  const simg = sctx.getImageData(0, 0, ctx.w, ctx.h);

  // gaussian은 box blur 3-pass 근사
  const passes = mode === "gaussian" ? 3 : 1;

  runBoxBlur(simg.data, ctx.w, ctx.h, radius, passes);

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const octx = get2d(out, true);
  octx.putImageData(simg, 0, 0);
  return out;
};
