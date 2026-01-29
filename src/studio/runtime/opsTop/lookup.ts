import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export const evalLookup: TopOpEval = ({ nodeId, params, ctx, evalTOP, inputMap }) => {
  // 입력 2개: src(0/in), lut(1)
  const srcId = inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
  const lutId = inputMap[nodeId]?.["lut"] ?? inputMap[nodeId]?.["1"];
  if (!srcId || !lutId) return null;

  const src = evalTOP(srcId, ctx.w, ctx.h);
  const lut = evalTOP(lutId, 256, 1) ?? evalTOP(lutId, ctx.w, 1); // ramp면 256x1 또는 w x 1 형태로 사용
  if (!src || !lut) return null;

  const p = params && params.kind === "lookup" ? params : null;
  const invert = Boolean(p?.invert);

  // src 이미지
  const sctx = get2d(src, true);
  const simg = sctx.getImageData(0, 0, ctx.w, ctx.h);
  const sd = simg.data;

  // lut(1-row) 이미지
  const lctx = get2d(lut, true);
  const lw = lut.width;
  const limg = lctx.getImageData(0, 0, lw, 1);
  const ld = limg.data;

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const octx = get2d(out, true);
  const oimg = octx.createImageData(ctx.w, ctx.h);
  const od = oimg.data;

  for (let i = 0; i < ctx.w * ctx.h; i++) {
    const k = i * 4;

    const r = sd[k + 0];
    const g = sd[k + 1];
    const b = sd[k + 2];
    const a = sd[k + 3];

    // luminance 기반 index
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const t = invert ? 1 - lum : lum;

    const x = Math.max(0, Math.min(lw - 1, Math.round(t * (lw - 1))));
    const lk = x * 4;

    od[k + 0] = ld[lk + 0];
    od[k + 1] = ld[lk + 1];
    od[k + 2] = ld[lk + 2];
    od[k + 3] = a; // alpha는 원본 유지
  }

  octx.putImageData(oimg, 0, 0);
  return out;
};
