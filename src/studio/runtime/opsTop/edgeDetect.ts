import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export const evalEdgeDetect: TopOpEval = ({ nodeId, params, ctx, evalTOP, inputMap }) => {
  const srcId = inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
  if (!srcId) return null;

  const src = evalTOP(srcId, ctx.w, ctx.h);
  if (!src) return null;

  const p = params && params.kind === "edgeDetect" ? params : null;
  const threshold = p ? Math.max(0, Math.min(255, p.threshold)) : 0; // 0..255
  const invert = p ? p.invert : false;

  const sctx = get2d(src, true);
  const simg = sctx.getImageData(0, 0, ctx.w, ctx.h);
  const s = simg.data;

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const octx = get2d(out, true);
  const oimg = octx.createImageData(ctx.w, ctx.h);
  const o = oimg.data;

  const w = ctx.w;
  const h = ctx.h;

  // Sobel kernels
  // gx = [-1 0 1; -2 0 2; -1 0 1]
  // gy = [ 1 2 1;  0 0 0; -1 -2 -1]
  const lum = (i: number) => {
    const r = s[i + 0], g = s[i + 1], b = s[i + 2];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b);
  };

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - 1);
    const y2 = Math.min(h - 1, y + 1);

    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - 1);
      const x2 = Math.min(w - 1, x + 1);

      const i00 = (y0 * w + x0) * 4;
      const i10 = (y * w + x0) * 4;
      const i20 = (y2 * w + x0) * 4;

      const i02 = (y0 * w + x2) * 4;
      const i12 = (y * w + x2) * 4;
      const i22 = (y2 * w + x2) * 4;

      const i01 = (y0 * w + x) * 4;
      const i21 = (y2 * w + x) * 4;

      const gx =
        -1 * lum(i00) + 1 * lum(i02) +
        -2 * lum(i10) + 2 * lum(i12) +
        -1 * lum(i20) + 1 * lum(i22);

      const gy =
         1 * lum(i00) + 2 * lum(i01) + 1 * lum(i02) +
        -1 * lum(i20) - 2 * lum(i21) - 1 * lum(i22);

      let mag = Math.sqrt(gx * gx + gy * gy);
      if (threshold > 0) mag = mag >= threshold ? 255 : 0;

      const v = invert ? 255 - mag : mag;

      const k = (y * w + x) * 4;
      const vv = clamp255(v) | 0;
      o[k + 0] = vv;
      o[k + 1] = vv;
      o[k + 2] = vv;
      o[k + 3] = 255;
    }
  }

  octx.putImageData(oimg, 0, 0);
  return out;
};
