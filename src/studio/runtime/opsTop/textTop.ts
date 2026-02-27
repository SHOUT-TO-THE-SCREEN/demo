import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

export const evalTextTop: TopOpEval = ({ nodeId, params, ctx }) => {
  const p = params?.kind === "textTop" ? params : null;

  const text       = p?.text       ?? "Hello";
  const fontSize   = p?.fontSize   ?? 48;
  const fontFamily = p?.fontFamily ?? "sans-serif";
  const color      = p?.color      ?? "#ffffff";
  const align      = p?.align      ?? "center";
  const bold       = p?.bold       ?? false;
  const italic     = p?.italic     ?? false;
  const posX       = p?.posX       ?? 0.5;   // 0=left .. 1=right
  const posY       = p?.posY       ?? 0.5;   // 0=top  .. 1=bottom

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const g = get2d(out);

  g.save();
  g.clearRect(0, 0, ctx.w, ctx.h);

  // Build font string
  const style = `${italic ? "italic " : ""}${bold ? "bold " : ""}`;
  g.font = `${style}${fontSize}px ${fontFamily}`;
  g.fillStyle = color;
  g.textAlign = align as CanvasTextAlign;
  g.textBaseline = "middle";

  const x = posX * ctx.w;
  const lineHeight = fontSize * 1.3;
  const lines = text.split("\n");
  const totalH = lines.length * lineHeight;
  const startY = posY * ctx.h - totalH / 2 + lineHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    g.fillText(lines[i], x, startY + i * lineHeight);
  }

  g.restore();
  return out;
};
