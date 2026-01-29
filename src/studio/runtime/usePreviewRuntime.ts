import { useEffect, useRef } from "react";
import { useReactFlow } from "reactflow";
import { useStudioStore } from "../state/studioStore";
import { TOP_REGISTRY } from "./registryTop";
import type { EvalCtx, EvalTOP } from "./typesRuntime";

function buildInputMap(edges: any[]) {
  const map: Record<string, Record<string, string>> = {};
  for (const e of edges) {
    const tgt = e.target as string | undefined;
    const src = e.source as string | undefined;
    if (!tgt || !src) continue;

    const handle = (e.targetHandle as string | null) ?? "in";
    (map[tgt] ??= {})[handle] = src;
  }
  return map;
}

function ensureCanvasSize(c: HTMLCanvasElement) {
  const rect = c.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width || c.width || 1));
  const h = Math.max(1, Math.floor(rect.height || c.height || 1));
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  return { w, h };
}

function drawFit(g: CanvasRenderingContext2D, src: HTMLCanvasElement, dw: number, dh: number, mode: "fit" | "fill" | "1:1") {
  const sw = src.width || 1;
  const sh = src.height || 1;

  let scale = 1;
  if (mode === "fit") scale = Math.min(dw / sw, dh / sh);
  if (mode === "fill") scale = Math.max(dw / sw, dh / sh);
  if (mode === "1:1") scale = 1;

  const w = sw * scale;
  const h = sh * scale;
  const x = (dw - w) / 2;
  const y = (dh - h) / 2;

  g.drawImage(src, x, y, w, h);
}

export function usePreviewRuntime() {
  const rf = useReactFlow();
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  // OP 내부에서 쓰는 캔버스 캐시(프레임 간 재사용)
  const canvasCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    let alive = true;

    const loop = (now: number) => {
      if (!alive) return;

      const prevNow = lastRef.current || now;
      const dt = now - prevNow;
      lastRef.current = now;

      const s = useStudioStore.getState();
      const edges = rf.getEdges();
      const inputMap = buildInputMap(edges);

      // fps 표시(선택)
      if (dt > 0) s.setViewerFps(Math.round(1000 / dt));

      // 프레임 내 eval memo
      const evalCache = new Map<string, HTMLCanvasElement | null>();

      const evalTOP: EvalTOP = (nodeId, w, h) => {
        if (evalCache.has(nodeId)) return evalCache.get(nodeId)!;

        const kind = s.nodeKindById[nodeId];
        if (!kind) return null;

        // bypass: 입력을 그대로 통과
        if (s.bypassByNodeId[nodeId]) {
          const passthruId = inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
          if (passthruId) {
            const out = evalTOP(passthruId, w, h);
            evalCache.set(nodeId, out);
            return out;
          }
        }

        const op = TOP_REGISTRY[kind];
        if (!op) return null;

        const ctx: EvalCtx = {
          now,
          w,
          h,
          cache: canvasCacheRef.current,
        };

        const out = op({
          nodeId,
          kind,
          params: s.paramsById[nodeId],
          evalTOP,
          inputMap,
          ctx,
          bypassed: Boolean(s.bypassByNodeId[nodeId]),
        });

        evalCache.set(nodeId, out);
        return out;
      };

      // ===== Node preview draw =====
      for (const [nodeId, canvas] of Object.entries(s.previewCanvasByNodeId)) {
        if (!canvas) continue;

        const { w, h } = ensureCanvasSize(canvas);
        const g = canvas.getContext("2d", { willReadFrequently: false });
        if (!g) continue;

        g.clearRect(0, 0, w, h);

        const out = evalTOP(nodeId, w, h);
        if (out) g.drawImage(out, 0, 0, w, h);
      }

      // ===== Viewer draw =====
      if (s.viewerEnabled && s.viewerCanvas) {
        const canvas = s.viewerCanvas;
        const { w, h } = ensureCanvasSize(canvas);
        const g = canvas.getContext("2d", { willReadFrequently: false });
        if (g) {
          g.clearRect(0, 0, w, h);

          const targetNodeId = s.viewerNodeId ?? s.displayNodeId ?? s.selectedNodeId;
          if (targetNodeId) {
            const out = evalTOP(targetNodeId, w, h);
            if (out) drawFit(g, out, w, h, s.viewerMode);
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [rf]);
}
