import { useEffect, useRef } from "react";
import { useReactFlow } from "reactflow";
import { useStudioStore } from "../state/studioStore";
import { TOP_REGISTRY } from "./registryTop";
import { SOP_REGISTRY, SOP_KINDS } from "./registrySop";
import type { EvalCtx, EvalTOP, EvalSOP, SopGeometry } from "./typesRuntime";

import { beginChopFrame, evalChop } from "./opsChop/evalChop";
import { renderChopPreview } from "./opsChop/renderChopPreview";
import { renderSopPreview } from "./opsSop/renderSopPreview";
import { bindMouseW, bindMouseWindow } from "./input/mouse";
import type { NodeParams } from "../state/studioStore";

// ─── Hex color → RGB tuple ────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ─── CHOP drive helper ────────────────────────────────────────────────────────
// Reads values from a CHOP connected via the "chop" handle and overrides params.
//
// Convention:
//   transform  – ch0/ch1 are treated as normalized 0..1 position and scaled to
//                ±(canvasW/2) and ±(canvasH/2) so that mouseIn "just works"
//                without needing an intermediate math CHOP.
//   noiseSop   – ch0 = mean of all samples (reacts to FFT band energy as well as
//                last LFO/noise value), ch1 = last sample → frequency,
//                ch2 = last sample → speed.
function applyChopDrive(
  nodeId: string,
  params: NodeParams | undefined,
  inputMap: Record<string, Record<string, string>>,
  canvasW: number = 400,
  canvasH: number = 400,
): NodeParams | undefined {
  const chopId = inputMap[nodeId]?.["chop"];
  if (!chopId) return params;

  const chop = evalChop(chopId, inputMap);
  if (!chop || chop.channels.length === 0) return params;

  // last sample of a channel (current value for time-series CHOPs)
  const val = (ch: number) => {
    const arr = chop.channels[ch];
    return arr && arr.length > 0 ? arr[arr.length - 1] : undefined;
  };

  // max of all samples — for FFT: strongest frequency band energy; for LFO/noise: peak value
  const valMax = (ch: number) => {
    const arr = chop.channels[ch];
    if (!arr || arr.length === 0) return undefined;
    let max = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
    return max;
  };

  if (!params) return params;

  if (params.kind === "noiseSop") {
    // valMax: FFT → peak band energy (0..1), LFO/noise → peak signal value (0..amplitude)
    const v0 = valMax(0), v1 = val(1), v2 = val(2);
    return {
      ...params,
      ...(v0 !== undefined && { amplitude: Math.max(0, v0) }),
      ...(v1 !== undefined && { frequency: Math.max(0, v1) }),
      ...(v2 !== undefined && { speed: Math.max(0, v2) }),
    };
  }

  if (params.kind === "transform") {
    // Treat ch0/ch1 as normalized 0..1 mouse/signal position.
    // Scale to ±half-canvas so the image moves across the full viewer.
    const v0 = val(0), v1 = val(1);
    return {
      ...params,
      ...(v0 !== undefined && { tx: (v0 * 2 - 1) * (canvasW / 2) }),
      ...(v1 !== undefined && { ty: (v1 * 2 - 1) * (canvasH / 2) }),
    };
  }

  return params;
}

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

      // ─── SOP evaluation ───────────────────────────────────────────────────
      const sopCache = new Map<string, SopGeometry | null>();

      const evalSOP: EvalSOP = (nodeId) => {
        if (sopCache.has(nodeId)) return sopCache.get(nodeId)!;

        const kind = s.nodeKindById[nodeId];
        if (!kind) return null;

        const op = SOP_REGISTRY[kind];
        if (!op) return null;

        const ctx: EvalCtx = { now, w: 0, h: 0, cache: canvasCacheRef.current };
        const drivenParams = applyChopDrive(nodeId, s.paramsById[nodeId], inputMap);
        const out = op({ nodeId, kind, params: drivenParams, evalSOP, inputMap, ctx });

        sopCache.set(nodeId, out);
        return out;
      };

      // ─── TOP evaluation ───────────────────────────────────────────────────
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

        const drivenParamsTOP = applyChopDrive(nodeId, s.paramsById[nodeId], inputMap, w, h);
        const out = op({
          nodeId,
          kind,
          params: drivenParamsTOP,
          evalTOP,
          inputMap,
          ctx,
          bypassed: Boolean(s.bypassByNodeId[nodeId]),
        });

        evalCache.set(nodeId, out);
        return out;
      };

      // ─── Node preview thumbnails ──────────────────────────────────────────
      for (const [nodeId, canvas] of Object.entries(s.previewCanvasByNodeId)) {
        if (!canvas) continue;

        const kind = s.nodeKindById[nodeId];

        // SOP preview
        if (kind && SOP_KINDS.has(kind)) {
          ensureCanvasSize(canvas);
          const geom = evalSOP(nodeId);
          if (geom) {
            const sopParams = s.paramsById[nodeId];
            const colorHex = (sopParams as any)?.color as string | undefined;
            const colorShadowHex = (sopParams as any)?.colorShadow as string | undefined;
            const tint: [number, number, number] = colorHex
              ? hexToRgb(colorHex)
              : kind === "noiseSop" ? [200, 215, 230]
              : kind === "gridSop" ? [180, 220, 200]
              : [220, 220, 225];
            const tintShadow: [number, number, number] = colorShadowHex
              ? hexToRgb(colorShadowHex)
              : [20, 20, 30];
            renderSopPreview(geom, canvas, now, tint, tintShadow);
          }
          continue;
        }

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
          const chop = evalChop(nodeId, inputMap);

          // mouseIn, math는 table로 좌표/값이 보이게
          renderChopPreview(chop, canvas, {
            mode: kind === "mouseIn" || kind === "math" ? "table" : "line",
          });
        }
      }

      // ─── Viewer ───────────────────────────────────────────────────────────
      if (s.viewerEnabled && s.viewerCanvas) {
        const canvas = s.viewerCanvas;
        const { w, h } = ensureCanvasSize(canvas);
        const g = canvas.getContext("2d", { willReadFrequently: false });
        if (g) {
          g.clearRect(0, 0, w, h);

          const targetNodeId =
            s.viewerNodeId ?? s.displayNodeId ?? s.selectedNodeId;
          if (targetNodeId) {
            const kind = s.nodeKindById[targetNodeId];

            // SOP viewer
            if (kind && SOP_KINDS.has(kind)) {
              const geom = evalSOP(targetNodeId);
              if (geom) {
                const sopParams = s.paramsById[targetNodeId];
                const colorHex = (sopParams as any)?.color as string | undefined;
                const colorShadowHex = (sopParams as any)?.colorShadow as string | undefined;
                const tint: [number, number, number] = colorHex
                  ? hexToRgb(colorHex)
                  : kind === "noiseSop" ? [200, 215, 230]
                  : kind === "gridSop" ? [180, 220, 200]
                  : [220, 220, 225];
                const tintShadow: [number, number, number] = colorShadowHex
                  ? hexToRgb(colorShadowHex)
                  : [20, 20, 30];
                renderSopPreview(geom, canvas, now, tint, tintShadow);
              }
            } else {
              const outTop = evalTOP(targetNodeId, w, h);
              if (outTop) {
                drawFit(g, outTop, w, h, s.viewerMode);
              } else {
                const chop = evalChop(targetNodeId, inputMap);
                renderChopPreview(chop, canvas, {
                  mode: kind === "mouseIn" || kind === "math" ? "table" : "line",
                });
              }
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
