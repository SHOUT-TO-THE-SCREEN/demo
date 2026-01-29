import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function rgbToHsv(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const hp = (h / 60) % 6;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;

  if (0 <= hp && hp < 1) { r = c; g = x; b = 0; }
  else if (1 <= hp && hp < 2) { r = x; g = c; b = 0; }
  else if (2 <= hp && hp < 3) { r = 0; g = c; b = x; }
  else if (3 <= hp && hp < 4) { r = 0; g = x; b = c; }
  else if (4 <= hp && hp < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const m = v - c;
  return { r: r + m, g: g + m, b: b + m };
}

export const evalHsvAdjust: TopOpEval = ({ nodeId, params, ctx, evalTOP, inputMap }) => {
  const srcId = inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
  if (!srcId) return null;

  const src = evalTOP(srcId, ctx.w, ctx.h);
  if (!src) return null;

  const p = params && params.kind === "hsvAdjust" ? params : null;

  // hue: -180..180 (deg), sat: 0..3 (mult), val: 0..3 (mult)
  const hue = p ? p.hue : 0;
  const sat = p ? p.saturation : 1;
  const val = p ? p.value : 1;

  const sctx = get2d(src, true);
  const simg = sctx.getImageData(0, 0, ctx.w, ctx.h);

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const octx = get2d(out, true);
  const oimg = octx.createImageData(ctx.w, ctx.h);

  const sdata = simg.data;
  const odata = oimg.data;

  for (let i = 0; i < ctx.w * ctx.h; i++) {
    const k = i * 4;

    const r = sdata[k + 0] / 255;
    const g = sdata[k + 1] / 255;
    const b = sdata[k + 2] / 255;

    const hsv = rgbToHsv(r, g, b);
    let nh = (hsv.h + hue) % 360;
    if (nh < 0) nh += 360;

    const ns = clamp01(hsv.s * sat);
    const nv = clamp01(hsv.v * val);

    const rgb = hsvToRgb(nh, ns, nv);

    odata[k + 0] = (clamp01(rgb.r) * 255) | 0;
    odata[k + 1] = (clamp01(rgb.g) * 255) | 0;
    odata[k + 2] = (clamp01(rgb.b) * 255) | 0;
    odata[k + 3] = sdata[k + 3];
  }

  octx.putImageData(oimg, 0, 0);
  return out;
};
