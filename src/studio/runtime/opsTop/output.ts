import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export const evalOutput: TopOpEval = ({ nodeId, params, ctx, evalTOP, inputMap }) => {
  const srcId = inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
  if (!srcId) return null;

  const src = evalTOP(srcId, ctx.w, ctx.h);
  if (!src) return null;

  const p = params && params.kind === "output" ? params : null;
  const exposure = p ? p.exposure : 1; // 0..?

  // exposure=1이면 그냥 passthrough
  if (Math.abs(exposure - 1) < 1e-6) return src;

  const sctx = get2d(src, true);
  const simg = sctx.getImageData(0, 0, ctx.w, ctx.h);
  const sd = simg.data;

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const octx = get2d(out, true);
  const oimg = octx.createImageData(ctx.w, ctx.h);
  const od = oimg.data;

  for (let i = 0; i < ctx.w * ctx.h; i++) {
    const k = i * 4;
    od[k + 0] = clamp255(sd[k + 0] * exposure) | 0;
    od[k + 1] = clamp255(sd[k + 1] * exposure) | 0;
    od[k + 2] = clamp255(sd[k + 2] * exposure) | 0;
    od[k + 3] = sd[k + 3];
  }

  octx.putImageData(oimg, 0, 0);
  return out;
};
