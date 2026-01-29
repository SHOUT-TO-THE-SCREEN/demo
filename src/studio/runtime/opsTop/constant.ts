import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

export const evalConstant: TopOpEval = ({ nodeId, params, ctx }) => {
  const p = params && params.kind === "constant" ? params : null;

  const color = p ? p.color : "#000000";

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const g = get2d(out);
  g.save();
  g.clearRect(0, 0, ctx.w, ctx.h);
  g.fillStyle = color;
  g.fillRect(0, 0, ctx.w, ctx.h);
  g.restore();

  return out;
};
