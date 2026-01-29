import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const evalLevel: TopOpEval = ({ nodeId, params, ctx, evalTOP, inputMap }) => {
  const srcId = inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
  if (!srcId) return null;

  const src = evalTOP(srcId, ctx.w, ctx.h);
  if (!src) return null;

  const p = params && params.kind === "level" ? params : null;

  // 권장 범위: brightness(-1..1), contrast(0..3), gamma(0.1..5)
  const brightness = p ? p.brightness : 0;
  const contrast = p ? p.contrast : 1;
  const gamma = p ? Math.max(0.1, p.gamma) : 1;
  const invGamma = 1 / gamma;

  const sctx = get2d(src, true);
  const simg = sctx.getImageData(0, 0, ctx.w, ctx.h);

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const octx = get2d(out, true);
  const oimg = octx.createImageData(ctx.w, ctx.h);

  const s = simg.data;
  const o = oimg.data;

  for (let i = 0; i < ctx.w * ctx.h; i++) {
    const k = i * 4;
    for (let ch = 0; ch < 3; ch++) {
      let v = s[k + ch] / 255;
      v = (v - 0.5) * contrast + 0.5; // contrast
      v = v + brightness;             // brightness
      v = clamp01(v);
      v = Math.pow(v, invGamma);      // gamma
      o[k + ch] = (clamp01(v) * 255) | 0;
    }
    o[k + 3] = s[k + 3];
  }

  octx.putImageData(oimg, 0, 0);
  return out;
};
