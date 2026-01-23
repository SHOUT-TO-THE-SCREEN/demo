import { useEffect, useMemo } from "react";
import type { Edge, Node } from "reactflow";
import { useStudioStore } from "../state/studioStore";
import type { NodeKind, RampParams } from "../state/studioStore";

type TDNodeData = { label: string; kind: NodeKind };

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

// 2D hash -> [0,1)
function hash2(ix: number, iy: number, seed: number) {
  let n = (ix | 0) * 374761393 + (iy | 0) * 668265263 + (seed | 0) * 1442695041;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const r00 = hash2(xi, yi, seed);
  const r10 = hash2(xi + 1, yi, seed);
  const r01 = hash2(xi, yi + 1, seed);
  const r11 = hash2(xi + 1, yi + 1, seed);

  const u = smoothstep(xf);
  const v = smoothstep(yf);

  const a = lerp(r00, r10, u);
  const b = lerp(r01, r11, u);
  return lerp(a, b, v);
}

function ensureCanvas(cache: Map<string, HTMLCanvasElement>, key: string, w: number, h: number) {
  const c = cache.get(key) ?? document.createElement("canvas");
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  if (!cache.has(key)) cache.set(key, c);
  return c;
}

function buildRampLUTCanvas(cache: Map<string, HTMLCanvasElement>, nodeId: string, ramp: RampParams) {
  const lut = ensureCanvas(cache, `lut:${nodeId}`, 256, 1);
  const ctx = lut.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);

  const stops = [...ramp.stops].sort((a, b) => a.t - b.t);
  for (const s of stops) g.addColorStop(clamp01(s.t), s.color);

  ctx.clearRect(0, 0, 256, 1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 1);
  return lut;
}

export function usePreviewRuntime(nodes: Node<TDNodeData>[], edges: Edge[]) {
  const previewCanvasByNodeId = useStudioStore((s) => s.previewCanvasByNodeId);
  const paramsById = useStudioStore((s) => s.paramsById);
  const viewerCanvas = useStudioStore((s) => s.viewerCanvas);

  const kindById = useMemo(() => {
    const m: Record<string, NodeKind> = {};
    for (const n of nodes) m[n.id] = n.data?.kind;
    return m;
  }, [nodes]);

  // targetId -> (handle -> sourceId)
  const inputMap = useMemo(() => {
    const m: Record<string, Record<string, string>> = {};
    for (const e of edges) {
      const t = e.target;
      const th = (e.targetHandle || "in").toString();
      if (!m[t]) m[t] = {};
      m[t][th] = e.source;
    }
    return m;
  }, [edges]);

  useEffect(() => {
    // Offscreen caches (재사용)
    const canvasCache = new Map<string, HTMLCanvasElement>();

    let raf = 0;

    // Viewer FPS sampling
    let fpsFrames = 0;
    let fpsLastT = performance.now();

    const loop = () => {
      const now = performance.now();

      // frame-local evaluation cache
      const evalCache = new Map<string, HTMLCanvasElement>();

      const evalTOP = (nodeId: string, w: number, h: number): HTMLCanvasElement | null => {
        if (evalCache.has(nodeId)) return evalCache.get(nodeId)!;

        const kind = kindById[nodeId];
        if (!kind) return null;

        // === NOISE ===
        if (kind === "noise") {
          const p = paramsById[nodeId];
          const seed = p && p.kind === "noise" ? p.seed : 1;
          const scale = p && p.kind === "noise" ? Math.max(2, p.scale) : 18;
          const speed = p && p.kind === "noise" ? p.speed : 0.8;
          const contrast = p && p.kind === "noise" ? p.contrast : 1.2;

          const out = ensureCanvas(canvasCache, `top:${nodeId}`, w, h);
          const ctx = out.getContext("2d", { willReadFrequently: true })!;
          const img = ctx.createImageData(w, h);
          const data = img.data;

          const t = (now * 0.001) * speed;

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const nx = (x + t * 14) / scale;
              const ny = (y + t * 9) / scale;

              const n1 = valueNoise(nx, ny, seed);
              const n2 = valueNoise(nx * 2.0, ny * 2.0, seed + 17) * 0.5;
              let v = n1 * 0.75 + n2 * 0.25;

              v = (v - 0.5) * contrast + 0.5;
              v = clamp01(v);

              const c = (v * 255) | 0;
              const idx = (y * w + x) * 4;
              data[idx + 0] = c;
              data[idx + 1] = c;
              data[idx + 2] = c;
              data[idx + 3] = 255;
            }
          }

          ctx.putImageData(img, 0, 0);
          evalCache.set(nodeId, out);
          return out;
        }

        // === RAMP (LUT) ===
        if (kind === "ramp") {
          const p = paramsById[nodeId];
          const ramp: RampParams =
            p && p.kind === "ramp"
              ? p
              : {
                  kind: "ramp",
                  interpolation: "linear",
                  stops: [
                    { id: "a", t: 0.0, color: "#000000" },
                    { id: "b", t: 0.45, color: "#ff8a00" },
                    { id: "c", t: 1.0, color: "#ffffff" },
                  ],
                };

          const lut = buildRampLUTCanvas(canvasCache, nodeId, ramp);
          evalCache.set(nodeId, lut);
          return lut;
        }

        // === LOOKUP ===
        if (kind === "lookup") {
          const p = paramsById[nodeId];
          const invert = p && p.kind === "lookup" ? p.invert : false;

          const srcId = inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
          const lutId = inputMap[nodeId]?.["lut"] ?? inputMap[nodeId]?.["1"];

          if (!srcId || !lutId) return null;

          const src = evalTOP(srcId, w, h);
          const lut = evalTOP(lutId, 256, 1);
          if (!src || !lut) return null;

          const srcCtx = src.getContext("2d", { willReadFrequently: true })!;
          const lutCtx = lut.getContext("2d", { willReadFrequently: true })!;

          const srcImg = srcCtx.getImageData(0, 0, w, h);
          const lutImg = lutCtx.getImageData(0, 0, 256, 1);

          const out = ensureCanvas(canvasCache, `top:${nodeId}`, w, h);
          const outCtx = out.getContext("2d", { willReadFrequently: true })!;
          const outImg = outCtx.createImageData(w, h);

          const sdata = srcImg.data;
          const ldata = lutImg.data;
          const odata = outImg.data;

          for (let i = 0; i < w * h; i++) {
            const si = i * 4;
            let v = sdata[si]; // 0..255 from R
            if (invert) v = 255 - v;

            const li = v * 4;
            odata[si + 0] = ldata[li + 0];
            odata[si + 1] = ldata[li + 1];
            odata[si + 2] = ldata[li + 2];
            odata[si + 3] = 255;
          }

          outCtx.putImageData(outImg, 0, 0);
          evalCache.set(nodeId, out);
          return out;
        }

        // === OUTPUT ===
        if (kind === "output") {
          const srcId = inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
          if (!srcId) return null;

          const p = paramsById[nodeId];
          const exposure = p && p.kind === "output" ? p.exposure : 1;

          const src = evalTOP(srcId, w, h);
          if (!src) return null;

          if (exposure === 1) {
            evalCache.set(nodeId, src);
            return src;
          }

          const srcCtx = src.getContext("2d", { willReadFrequently: true })!;
          const srcImg = srcCtx.getImageData(0, 0, w, h);

          const out = ensureCanvas(canvasCache, `top:${nodeId}`, w, h);
          const outCtx = out.getContext("2d", { willReadFrequently: true })!;
          const outImg = outCtx.createImageData(w, h);

          const sdata = srcImg.data;
          const odata = outImg.data;

          for (let i = 0; i < w * h; i++) {
            const si = i * 4;
            odata[si + 0] = Math.max(0, Math.min(255, (sdata[si + 0] * exposure) | 0));
            odata[si + 1] = Math.max(0, Math.min(255, (sdata[si + 1] * exposure) | 0));
            odata[si + 2] = Math.max(0, Math.min(255, (sdata[si + 2] * exposure) | 0));
            odata[si + 3] = 255;
          }

          outCtx.putImageData(outImg, 0, 0);
          evalCache.set(nodeId, out);
          return out;
        }

        return null;
      };

      // ===== Node previews =====
      for (const nodeId of Object.keys(previewCanvasByNodeId)) {
        const canvas = previewCanvasByNodeId[nodeId];
        if (!canvas) continue;

        const kind = kindById[nodeId];
        if (!kind) continue;

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        const w = canvas.clientWidth || 180;
        const h = canvas.clientHeight || 110;

        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        drawRoundedRect(ctx, 0, 0, w, h, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, 0.5, 0.5, w - 1, h - 1, 12);
        ctx.stroke();

        const vx = 10;
        const vy = 26;
        const vw = w - 20;
        const vh = h - 36;

        const rw = Math.max(96, Math.floor(vw));
        const rh = Math.max(64, Math.floor(vh));

        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "12px ui-sans-serif, system-ui";
        ctx.fillText(kind.toUpperCase(), 10, 18);

        const out = kind === "ramp" ? evalTOP(nodeId, 256, 1) : evalTOP(nodeId, rw, rh);

        if (out) {
          ctx.imageSmoothingEnabled = false;
          drawRoundedRect(ctx, vx, vy, vw, vh, 12);
          ctx.save();
          ctx.clip();
          ctx.drawImage(out, vx, vy, vw, vh);
          ctx.restore();
          ctx.imageSmoothingEnabled = true;
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.font = "11px ui-sans-serif, system-ui";
          ctx.fillText("No input", vx, vy + 14);
        }
      }

      // =========================
      // ✅ Viewer Surface (TD-style)
      // =========================
      {
        const s = useStudioStore.getState();
        const vc = viewerCanvas;

        const enabled = s.viewerEnabled;
        const mode = s.viewerMode;
        const targetId = s.viewerPinnedNodeId ?? s.selectedNodeId;

        if (vc) {
          const vctx = vc.getContext("2d");

          const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
          const vw = vc.clientWidth || 640;
          const vh = vc.clientHeight || 360;

          if (vc.width !== vw * dpr || vc.height !== vh * dpr) {
            vc.width = vw * dpr;
            vc.height = vh * dpr;
          }

          if (vctx) {
            vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            vctx.clearRect(0, 0, vw, vh);

            if (enabled && targetId) {
              const rw = Math.max(256, Math.floor(vw));
              const rh = Math.max(144, Math.floor(vh));

              const kind = kindById[targetId];
              const out = kind === "ramp" ? evalTOP(targetId, 256, 1) : evalTOP(targetId, rw, rh);

              if (out) {
                const sw = out.width;
                const sh = out.height;

                let dx = 0,
                  dy = 0,
                  dw = vw,
                  dh = vh;

                if (mode === "1:1") {
                  dw = sw;
                  dh = sh;
                  dx = Math.floor((vw - dw) / 2);
                  dy = Math.floor((vh - dh) / 2);
                } else {
                  const sAspect = sw / sh;
                  const dAspect = vw / vh;
                  const contain = mode === "fit";

                  if (contain) {
                    if (sAspect > dAspect) {
                      dw = vw;
                      dh = vw / sAspect;
                      dx = 0;
                      dy = (vh - dh) / 2;
                    } else {
                      dh = vh;
                      dw = vh * sAspect;
                      dy = 0;
                      dx = (vw - dw) / 2;
                    }
                  } else {
                    // cover
                    if (sAspect > dAspect) {
                      dh = vh;
                      dw = vh * sAspect;
                      dy = 0;
                      dx = (vw - dw) / 2;
                    } else {
                      dw = vw;
                      dh = vw / sAspect;
                      dx = 0;
                      dy = (vh - dh) / 2;
                    }
                  }
                }

                vctx.imageSmoothingEnabled = false;
                vctx.drawImage(out, dx, dy, dw, dh);
                vctx.imageSmoothingEnabled = true;

                fpsFrames++;
                if (now - fpsLastT >= 800) {
                  const fps = Math.round((fpsFrames * 1000) / (now - fpsLastT));
                  useStudioStore.getState().setViewerFps(fps);
                  fpsFrames = 0;
                  fpsLastT = now;
                }
              } else {
                useStudioStore.getState().setViewerFps(0);
              }
            } else {
              useStudioStore.getState().setViewerFps(0);
            }
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [previewCanvasByNodeId, paramsById, kindById, inputMap, viewerCanvas]);
}
