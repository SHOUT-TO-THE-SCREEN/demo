import { useEffect, useMemo } from "react";
import type { Edge, Node } from "reactflow";
import { useStudioStore } from "../state/studioStore";
import type { NodeKind } from "../state/studioStore";

type TDNodeData = { label: string; kind: NodeKind };

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function usePreviewRuntime(nodes: Node<TDNodeData>[], edges: Edge[]) {
  const previewCanvasByNodeId = useStudioStore((s) => s.previewCanvasByNodeId);
  const paramsById = useStudioStore((s) => s.paramsById);

  // 노드 id → kind 빠른 조회
  const kindById = useMemo(() => {
    const m: Record<string, NodeKind> = {};
    for (const n of nodes) m[n.id] = n.data?.kind;
    return m;
  }, [nodes]);

  useEffect(() => {
    let raf = 0;
    let t0 = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = (now - t0) / 1000;
      t0 = now;

      // edges는 아직 실제 데이터 플로우에 안 씀(MVP). 나중에 토폴로지/런타임으로 연결.
      void edges;

      for (const nodeId of Object.keys(previewCanvasByNodeId)) {
        const canvas = previewCanvasByNodeId[nodeId];
        if (!canvas) continue;

        const kind = kindById[nodeId];
        if (!kind) continue;

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        // DPI 스케일
        const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        const w = canvas.clientWidth || 180;
        const h = canvas.clientHeight || 110;

        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        } else {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // bg
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        drawRoundedRect(ctx, 0, 0, w, h, 12);
        ctx.fill();

        // frame
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, 0.5, 0.5, w - 1, h - 1, 12);
        ctx.stroke();

        // render per kind
        if (kind === "audioIn") {
          const p = paramsById[nodeId];
          const gain = p && p.kind === "audioIn" ? p.gain : 1;

          ctx.strokeStyle = "rgba(255,255,255,0.75)";
          ctx.lineWidth = 1.2;

          ctx.beginPath();
          const mid = h * 0.55;
          for (let x = 0; x < w; x++) {
            const u = x / w;
            const y = mid + Math.sin(u * Math.PI * 2 * 2 + now * 0.004) * (h * 0.18) * gain;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.font = "12px ui-sans-serif, system-ui";
          ctx.fillText("MIC", 10, 18);
        }

        if (kind === "fft") {
          const p = paramsById[nodeId];
          const smoothing = p && p.kind === "fft" ? p.smoothing : 0.85;
          const intensity = p && p.kind === "fft" ? p.intensity : 1;

          const bars = 28;
          const pad = 10;
          const bw = (w - pad * 2) / bars;

          // pseudo-spectrum (나중에 실데이터로 교체)
          for (let i = 0; i < bars; i++) {
            const u = i / (bars - 1);
            const base = 0.25 + 0.75 * Math.pow(u, 0.7);
            const wobble = 0.5 + 0.5 * Math.sin(now * 0.005 + u * 10);
            const amp = (base * wobble) * intensity;

            const hh = (h - 28) * (amp * (0.65 + smoothing * 0.35));
            const x = pad + i * bw + bw * 0.15;
            const y = h - 10 - hh;

            ctx.fillStyle = "rgba(255,255,255,0.78)";
            ctx.fillRect(x, y, bw * 0.7, hh);
          }

          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.font = "12px ui-sans-serif, system-ui";
          ctx.fillText("FFT", 10, 18);
        }

        if (kind === "output") {
          const p = paramsById[nodeId];
          const exposure = p && p.kind === "output" ? p.exposure : 1;

          const g = ctx.createLinearGradient(0, 0, w, h);
          g.addColorStop(0, `rgba(255,255,255,${0.10 * exposure})`);
          g.addColorStop(1, `rgba(255,255,255,${0.02 * exposure})`);
          ctx.fillStyle = g;
          drawRoundedRect(ctx, 10, 26, w - 20, h - 36, 12);
          ctx.fill();

          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.font = "12px ui-sans-serif, system-ui";
          ctx.fillText("OUT", 10, 18);
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [previewCanvasByNodeId, paramsById, kindById, edges]);
}
