import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

const deg2rad = (d: number) => (d * Math.PI) / 180;

export const evalTransform: TopOpEval = ({ nodeId, params, ctx, evalTOP, inputMap }) => {
  const srcId = inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
  if (!srcId) return null;

  const src = evalTOP(srcId, ctx.w, ctx.h);
  if (!src) return null;

  const p = params && params.kind === "transform" ? params : null;
  const tx = p ? p.tx : 0;
  const ty = p ? p.ty : 0;
  const rotateDeg = p ? p.rotate : 0;
  const scale = p ? Math.max(0.001, p.scale) : 1;

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const g = get2d(out);

  g.save();
  g.clearRect(0, 0, ctx.w, ctx.h);

  // 중심 기준 변환
  g.translate(ctx.w / 2 + tx, ctx.h / 2 + ty);
  g.rotate(deg2rad(rotateDeg));
  g.scale(scale, scale);

  g.drawImage(src, -ctx.w / 2, -ctx.h / 2, ctx.w, ctx.h);

  g.restore();
  return out;
};
