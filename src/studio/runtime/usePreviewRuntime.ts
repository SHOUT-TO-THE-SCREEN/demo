import { useEffect, useRef } from "react";
import { useReactFlow } from "reactflow";
import { useStudioStore } from "../state/studioStore";
import { TOP_REGISTRY } from "./registryTop";
import type { EvalCtx, EvalTOP } from "./typesRuntime";

import { beginChopFrame, evalChop } from "./opsChop/evalChop";
import { renderChopPreview } from "./opsChop/renderChopPreview";
import { bindMouseW, bindMouseWindow } from "./input/mouse";

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

function drawFit(
  g: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  dw: number,
  dh: number,
  mode: "fit" | "fill" | "1:1",
) {
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

  const canvasCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const mouseUnbindRef = useRef<null | (() => void)>(null);
  const mouseBoundCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    const unbindWin = bindMouseWindow();
    const loop = (now: number) => {
      if (!alive) return;

      const prevNow = lastRef.current || now;
      const dt = now - prevNow;
      lastRef.current = now;

      const s = useStudioStore.getState();
      const edges = rf.getEdges();
      const inputMap = buildInputMap(edges);

      if (dt > 0) s.setViewerFps(Math.round(1000 / dt));

      beginChopFrame();

      if (s.viewerCanvas && mouseBoundCanvasRef.current !== s.viewerCanvas) {
        if (mouseUnbindRef.current) mouseUnbindRef.current();
        mouseUnbindRef.current = bindMouseW(s.viewerCanvas);
        mouseBoundCanvasRef.current = s.viewerCanvas;
      }

      const evalCache = new Map<string, HTMLCanvasElement | null>();

      const evalTOP: EvalTOP = (nodeId, w, h) => {
        if (evalCache.has(nodeId)) return evalCache.get(nodeId)!;

        const kind = s.nodeKindById[nodeId];
        if (!kind) return null;

        if (s.bypassByNodeId[nodeId]) {
          const passthruId =
            inputMap[nodeId]?.["in"] ?? inputMap[nodeId]?.["0"];
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

      // Node preview
      for (const [nodeId, canvas] of Object.entries(s.previewCanvasByNodeId)) {
        if (!canvas) continue;

        const { w, h } = ensureCanvasSize(canvas);
        const g = canvas.getContext("2d", { willReadFrequently: false });
        if (!g) continue;

        g.clearRect(0, 0, w, h);

        const outTop = evalTOP(nodeId, w, h);
        if (outTop) {
          g.drawImage(outTop, 0, 0, w, h);
        } else {
          // CHOP 프리뷰는 노드 종류별로 렌더링 모드를 분기한다.
          // - mouseIn: tx/ty 테이블
          // - 그 외: 라인 프리뷰(채널을 tx/ty로 오해하지 않도록)
          const kind = s.nodeKindById[nodeId];
          const chop = evalChop(nodeId, inputMap);

          // mouseIn, math는 table로 좌표/값이 보이게
          renderChopPreview(chop, canvas, {
            mode: kind === "mouseIn" || kind === "math" ? "table" : "line",
          });
        }
      }

      // Viewer
      if (s.viewerEnabled && s.viewerCanvas) {
        const canvas = s.viewerCanvas;
        const { w, h } = ensureCanvasSize(canvas);
        const g = canvas.getContext("2d", { willReadFrequently: false });
        if (g) {
          g.clearRect(0, 0, w, h);

          const targetNodeId =
            s.viewerNodeId ?? s.displayNodeId ?? s.selectedNodeId;
          if (targetNodeId) {
            const outTop = evalTOP(targetNodeId, w, h);
            if (outTop) {
              drawFit(g, outTop, w, h, s.viewerMode);
            } else {
              const kind = s.nodeKindById[targetNodeId];
              const chop = evalChop(targetNodeId, inputMap);

              renderChopPreview(chop, canvas, {
                mode: kind === "mouseIn" || kind === "math" ? "table" : "line",
              });
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      unbindWin();
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      if (mouseUnbindRef.current) mouseUnbindRef.current();
      mouseUnbindRef.current = null;
      mouseBoundCanvasRef.current = null;
    };
  }, [rf]);
}
