import type { TopOpEval } from "../typesRuntime";
import { ensureCanvas, get2d } from "../canvas";

/**
 * studioStore.ts의 RampParams 형태를 기대:
 * {
 *   kind: "ramp",
 *   interpolation: "linear" | "smooth",
 *   stops: { id: string; t: number; color: string }[]
 * }
 */
function parseHexColor(hex: string) {
  // #RRGGBB
  const h = hex.replace("#", "");
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (t: number) => t * t * (3 - 2 * t);

export const evalRamp: TopOpEval = ({ nodeId, params, ctx }) => {
  const p = params && params.kind === "ramp" ? params : null;

  // stops 정렬 + 최소 2개 보장
  const stops = (p?.stops ?? []).slice().sort((a, b) => a.t - b.t);
  if (stops.length < 2) {
    // fallback
    stops.splice(0, stops.length,
      { id: "a", t: 0, color: "#000000" },
      { id: "b", t: 1, color: "#ffffff" }
    );
  }

  const interpolation = p?.interpolation ?? "linear";

  // 1x256 LUT 캔버스를 만들고, 최종 out에 stretch drawImage
  const lutW = 256;
  const lut = ensureCanvas(ctx.cache, `rampLUT:${nodeId}`, lutW, 1);
  const lg = get2d(lut, true);
  const img = lg.createImageData(lutW, 1);
  const d = img.data;

  // 각 x에서 구간 찾기
  let si = 0;
  for (let x = 0; x < lutW; x++) {
    const t = x / (lutW - 1);

    while (si < stops.length - 2 && t > stops[si + 1].t) si++;

    const s0 = stops[si];
    const s1 = stops[Math.min(stops.length - 1, si + 1)];

    const t0 = s0.t;
    const t1 = s1.t;
    const span = Math.max(1e-6, t1 - t0);
    let u = clamp01((t - t0) / span);
    if (interpolation === "smoothstep") u = smoothstep(u);

    const c0 = parseHexColor(s0.color);
    const c1 = parseHexColor(s1.color);

    const r = (c0.r + (c1.r - c0.r) * u) | 0;
    const g = (c0.g + (c1.g - c0.g) * u) | 0;
    const b = (c0.b + (c1.b - c0.b) * u) | 0;

    const k = x * 4;
    d[k + 0] = r;
    d[k + 1] = g;
    d[k + 2] = b;
    d[k + 3] = 255;
  }

  lg.putImageData(img, 0, 0);

  const out = ensureCanvas(ctx.cache, `top:${nodeId}`, ctx.w, ctx.h);
  const g = get2d(out);
  g.save();
  g.clearRect(0, 0, ctx.w, ctx.h);
  g.imageSmoothingEnabled = true;
  g.drawImage(lut, 0, 0, ctx.w, ctx.h); // stretch
  g.restore();

  return out;
};
