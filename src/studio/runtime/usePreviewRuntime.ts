import { useEffect, useMemo } from "react";
import type { Edge, Node } from "reactflow";
import { useStudioStore } from "../state/studioStore";
import type { NodeKind } from "../state/studioStore";

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

export function usePreviewRuntime(nodes: Node<TDNodeData>[], edges: Edge[]) {
  const previewCanvasByNodeId = useStudioStore((s) => s.previewCanvasByNodeId);
  const paramsById = useStudioStore((s) => s.paramsById);

  const kindById = useMemo(() => {
    const m: Record<string, NodeKind> = {};
    for (const n of nodes) m[n.id] = n.data?.kind;
    return m;
  }, [nodes]);

  useEffect(() => {
    void edges;

    // Offscreen(재사용) 버퍼: 매 프레임 생성 금지
    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d", { willReadFrequently: true });

    let raf = 0;

    const loop = () => {
      const now = performance.now();

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

        // base panel
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        drawRoundedRect(ctx, 0, 0, w, h, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, 0.5, 0.5, w - 1, h - 1, 12);
        ctx.stroke();

        // === NOISE ===
        if (kind === "noise") {
          const p = paramsById[nodeId];
          const seed = p && p.kind === "noise" ? p.seed : 1;
          const scale = p && p.kind === "noise" ? Math.max(2, p.scale) : 18;
          const speed = p && p.kind === "noise" ? p.speed : 0.8;
          const contrast = p && p.kind === "noise" ? p.contrast : 1.2;

          const rw = Math.max(48, Math.floor((w - 20) / 2));
          const rh = Math.max(32, Math.floor((h - 36) / 2));

          if (off.width !== rw || off.height !== rh) {
            off.width = rw;
            off.height = rh;
          }

          if (offCtx) {
            const img = offCtx.createImageData(rw, rh);
            const data = img.data;

            const t = (now * 0.001) * speed;

            for (let y = 0; y < rh; y++) {
              for (let x = 0; x < rw; x++) {
                const nx = (x + t * 14) / scale;
                const ny = (y + t * 9) / scale;

                const n1 = valueNoise(nx, ny, seed);
                const n2 = valueNoise(nx * 2.0, ny * 2.0, seed + 17) * 0.5;
                let v = n1 * 0.75 + n2 * 0.25;

                v = (v - 0.5) * contrast + 0.5;
                v = clamp01(v);

                const c = (v * 255) | 0;
                const idx = (y * rw + x) * 4;
                data[idx + 0] = c;
                data[idx + 1] = c;
                data[idx + 2] = c;
                data[idx + 3] = 255;
              }
            }

            offCtx.putImageData(img, 0, 0);

            ctx.imageSmoothingEnabled = false;
            drawRoundedRect(ctx, 10, 26, w - 20, h - 36, 12);
            ctx.save();
            ctx.clip();
            ctx.drawImage(off, 10, 26, w - 20, h - 36);
            ctx.restore();
            ctx.imageSmoothingEnabled = true;

            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.font = "12px ui-sans-serif, system-ui";
            ctx.fillText("NOISE", 10, 18);
          }
        }

        // 필요하면 여기에서 fft/audio/output 렌더를 확장하면 됨
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [previewCanvasByNodeId, paramsById, kindById, edges]);
}
