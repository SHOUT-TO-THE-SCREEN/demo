import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export const evalComposite: TopOpEval = ({ nodeId, kind, params, ctx, evalTOP, inputMap }) => {
  // 입력 네이밍 유연 대응
  const aId = inputMap[nodeId]?.["a"] ?? inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
  const bId = inputMap[nodeId]?.["b"] ?? inputMap[nodeId]?.["1"];
  if (!aId || !bId) return null;

  const A = evalTOP(aId, ctx.w, ctx.h);
  const B = evalTOP(bId, ctx.w, ctx.h);
  if (!A || !B) return null;

  // 공통 파라미터: opacity 0..1
  const p = params && (
    params.kind === "over" ||
    params.kind === "add" ||
    params.kind === "multiply" ||
    params.kind === "screen" ||
    params.kind === "subtract"
  ) ? params : null;

  const opacity = p ? Math.max(0, Math.min(1, p.opacity)) : 1;

  const actx = get2d(A, true);
  const bctx = get2d(B, true);

  const aimg = actx.getImageData(0, 0, ctx.w, ctx.h);
  const bimg = bctx.getImageData(0, 0, ctx.w, ctx.h);

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const octx = get2d(out, true);
  const oimg = octx.createImageData(ctx.w, ctx.h);

  const ad = aimg.data;
  const bd = bimg.data;
  const od = oimg.data;

  for (let i = 0; i < ctx.w * ctx.h; i++) {
    const k = i * 4;

    const ar = ad[k + 0], ag = ad[k + 1], ab = ad[k + 2], aa = ad[k + 3] / 255;
    const br = bd[k + 0], bg = bd[k + 1], bb = bd[k + 2], ba = bd[k + 3] / 255;

    let r = 0, g = 0, b = 0, a = 255;

    if (kind === "over") {
      // A over B (opacity는 A에 적용)
      const aA = aa * opacity;
      const inv = 1 - aA;

      r = ar * aA + br * inv;
      g = ag * aA + bg * inv;
      b = ab * aA + bb * inv;
      a = clamp255((aA + ba * inv) * 255);
    }

    if (kind === "add") {
      r = ar + br * opacity;
      g = ag + bg * opacity;
      b = ab + bb * opacity;
    }

    if (kind === "subtract") {
      r = ar - br * opacity;
      g = ag - bg * opacity;
      b = ab - bb * opacity;
    }

    if (kind === "multiply") {
      // lerp(A, A*B, opacity)
      r = ar * (1 - opacity) + (ar * (br / 255)) * opacity;
      g = ag * (1 - opacity) + (ag * (bg / 255)) * opacity;
      b = ab * (1 - opacity) + (ab * (bb / 255)) * opacity;
    }

    if (kind === "screen") {
      // lerp(A, screen(A,B), opacity)
      const sr = 255 - (255 - ar) * (255 - br) / 255;
      const sg = 255 - (255 - ag) * (255 - bg) / 255;
      const sb = 255 - (255 - ab) * (255 - bb) / 255;

      r = ar * (1 - opacity) + sr * opacity;
      g = ag * (1 - opacity) + sg * opacity;
      b = ab * (1 - opacity) + sb * opacity;
    }

    od[k + 0] = clamp255(r) | 0;
    od[k + 1] = clamp255(g) | 0;
    od[k + 2] = clamp255(b) | 0;
    od[k + 3] = a;
  }

  octx.putImageData(oimg, 0, 0);
  return out;
};
