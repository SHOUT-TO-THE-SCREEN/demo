import { useEffect, useRef } from "react";
import { useReactFlow } from "reactflow";
import { useStudioStore } from "../state/studioStore";
import { TOP_REGISTRY } from "./registryTop";
import { SOP_REGISTRY, SOP_KINDS } from "./registrySop";
import type { EvalCtx, EvalTOP, EvalSOP, SopGeometry } from "./typesRuntime";

import { beginChopFrame, evalChop } from "./opsChop/evalChop";
import { renderChopPreview } from "./opsChop/renderChopPreview";
import { renderSopPreview } from "./opsSop/renderSopPreview";
import { getHandsVideo, getLastLandmarks } from "./opsChop/handsChop";
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
    // CHOP channels are normalized 0..1; scale to the full slider range so
    // a full-range CHOP (e.g. handsChop pinch) can reach the maximum value.
    // amplitude slider: 0..2, frequency slider: 0..10, speed slider: 0..3
    const v0 = valMax(0), v1 = val(1), v2 = val(2);
    return {
      ...params,
      ...(v0 !== undefined && { amplitude: Math.max(0, v0 * 2) }),
      ...(v1 !== undefined && { frequency: Math.max(0, v1 * 10) }),
      // ch2 = wrist tilt: 0.5 is neutral (upright), 0..1 → speed 0..3
    ...(v2 !== undefined && { speed: Math.max(0, v2 * 3) }),
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

// ─── handsChop 프리뷰: 웹캠 영상 + 랜드마크 점 ───────────────────────────────
function renderHandsPreview(canvas: HTMLCanvasElement, mirror: boolean) {
  const { w, h } = ensureCanvasSize(canvas);
  const g = canvas.getContext("2d")!;
  g.clearRect(0, 0, w, h);

  const video = getHandsVideo();
  if (!video || video.readyState < 2) {
    g.fillStyle = "rgba(255,255,255,0.06)";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.font = "10px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("카메라 연결 중…", w / 2, h / 2);
    return;
  }

  // 웹캠 프레임
  g.save();
  if (mirror) { g.translate(w, 0); g.scale(-1, 1); }
  g.drawImage(video, 0, 0, w, h);
  g.restore();

  // 랜드마크 점 오버레이
  const lm = getLastLandmarks();
  if (lm) {
    // 연결선 (손가락 뼈대)
    const CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4],       // 엄지
      [0,5],[5,6],[6,7],[7,8],       // 검지
      [0,9],[9,10],[10,11],[11,12],  // 중지
      [0,13],[13,14],[14,15],[15,16],// 약지
      [0,17],[17,18],[18,19],[19,20],// 새끼
      [5,9],[9,13],[13,17],          // 손바닥
    ];
    g.strokeStyle = "rgba(100,220,180,0.6)";
    g.lineWidth = 1;
    for (const [a, b] of CONNECTIONS) {
      const ax = mirror ? (1 - lm[a].x) * w : lm[a].x * w;
      const ay = lm[a].y * h;
      const bx = mirror ? (1 - lm[b].x) * w : lm[b].x * w;
      const by = lm[b].y * h;
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
    }

    // 관절 점
    for (let i = 0; i < lm.length; i++) {
      const x = mirror ? (1 - lm[i].x) * w : lm[i].x * w;
      const y = lm[i].y * h;
      const isKey = i === 0 || i === 4 || i === 8; // 손목/엄지끝/검지끝
      g.fillStyle = isKey ? "rgba(255,80,80,0.9)" : "rgba(100,220,180,0.85)";
      g.beginPath();
      g.arc(x, y, isKey ? 4 : 2.5, 0, Math.PI * 2);
      g.fill();
    }
  }
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

        // handsChop: 웹캠 영상 + 랜드마크 오버레이
        if (kind === "handsChop") {
          evalChop(nodeId, inputMap); // 웹캠 초기화 트리거
          const mirror = (s.paramsById[nodeId] as any)?.mirror ?? true;
          renderHandsPreview(canvas, mirror);
          continue;
        }

        const outTop = evalTOP(nodeId, w, h);
        if (outTop) {
          g.drawImage(outTop, 0, 0, w, h);
        } else {
          const chop = evalChop(nodeId, inputMap);
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
            } else if (kind === "handsChop") {
              evalChop(targetNodeId, inputMap); // 웹캠 초기화 트리거
              const mirror = (s.paramsById[targetNodeId] as any)?.mirror ?? true;
              renderHandsPreview(canvas, mirror);
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
