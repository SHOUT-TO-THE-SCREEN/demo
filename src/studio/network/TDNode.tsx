import { useCallback, useEffect, useRef } from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position, useReactFlow } from "reactflow";

import "./network.css";
import "./tdnode.css";

import { useStudioStore } from "../state/studioStore";
import type { NodeKind } from "../state/studioStore";

type TDNodeData = { label: string; kind: NodeKind };

const MIN_W = 220;
const MIN_H = 170;

declare global {
  interface Window {
    __tdResizeCleanup?: (() => void) | null;
  }
}

// 파일 로드 시점에 이전 리스너가 남아있다면 즉시 정리
if (typeof window !== "undefined" && window.__tdResizeCleanup) {
  try {
    window.__tdResizeCleanup();
  } catch {}
  window.__tdResizeCleanup = null;
}

// (같은 파일 안에서 세션 1개만 허용)
let activeResizeCleanup: null | (() => void) = null;

export default function TDNode(props: NodeProps<TDNodeData>) {
  const { id, data, selected } = props;

  const rf = useReactFlow();

  const ensureNodeParams = useStudioStore((s) => s.ensureNodeParams);
  const registerPreviewCanvas = useStudioStore((s) => s.registerPreviewCanvas);

  // Viewer global
  const viewerEnabled = useStudioStore((s) => s.viewerEnabled);
  const toggleViewer = useStudioStore((s) => s.toggleViewer);
  const setViewerEnabled = useStudioStore((s) => s.setViewerEnabled);

  // TD flags
  const viewerNodeId = useStudioStore((s) => s.viewerNodeId);
  const displayNodeId = useStudioStore((s) => s.displayNodeId);
  const bypassByNodeId = useStudioStore((s) => s.bypassByNodeId);

  const setViewerNodeId = useStudioStore((s) => s.setViewerNodeId);
  const setDisplayNodeId = useStudioStore((s) => s.setDisplayNodeId);
  const toggleBypass = useStudioStore((s) => s.toggleBypass);

  const isV = viewerNodeId === id;
  const isD = displayNodeId === id;
  const isB = Boolean(bypassByNodeId[id]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ensureNodeParams(id, data.kind);
  }, [ensureNodeParams, id, data.kind]);

  useEffect(() => {
    registerPreviewCanvas(id, canvasRef.current);
    return () => registerPreviewCanvas(id, null);
  }, [registerPreviewCanvas, id]);

  // ✅ 컴포넌트 언마운트 시 남은 세션 정리
  useEffect(() => {
    return () => {
      if (activeResizeCleanup) {
        try {
          activeResizeCleanup();
        } catch {}
        activeResizeCleanup = null;
      }
      if (typeof window !== "undefined" && window.__tdResizeCleanup) {
        try {
          window.__tdResizeCleanup();
        } catch {}
        window.__tdResizeCleanup = null;
      }
    };
  }, []);

  const k = data.kind;

  const stop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onToggleViewer = (e: any) => {
    stop(e);
    toggleViewer();
  };

  const onToggleV = (e: any) => {
    stop(e);
    if (!viewerEnabled) setViewerEnabled(true);
    setViewerNodeId(isV ? null : id);
  };

  const onToggleD = (e: any) => {
    stop(e);
    setDisplayNodeId(isD ? null : id);
  };

  const onToggleB = (e: any) => {
    stop(e);
    toggleBypass(id);
  };

  /** =========================
   *  ✅ TD-style Resize (Hard cleanup)
   *  ========================= */
  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      stop(e);

      // ✅ 이전 세션이 남아있으면 무조건 종료
      if (activeResizeCleanup) {
        try {
          activeResizeCleanup();
        } catch {}
        activeResizeCleanup = null;
      }

      // ✅ 혹시 window 전역 cleanup이 남아있으면 먼저 종료
      if (typeof window !== "undefined" && window.__tdResizeCleanup) {
        try {
          window.__tdResizeCleanup();
        } catch {}
        window.__tdResizeCleanup = null;
      }

      // Undo 스냅샷을 NetworkEditor에 요청
      window.dispatchEvent(new CustomEvent("td:pushHistory"));

      const handleEl = e.currentTarget as HTMLElement;
      const pointerId = e.pointerId;

      const startX = e.clientX;
      const startY = e.clientY;

      const rect = rootRef.current?.getBoundingClientRect();
      const startW = Math.max(MIN_W, Math.round(rect?.width ?? MIN_W));
      const startH = Math.max(MIN_H, Math.round(rect?.height ?? MIN_H));

      try {
        handleEl.setPointerCapture(pointerId);
      } catch {}

      let alive = true;

      const onMove = (ev: PointerEvent) => {
        if (!alive) return;

        // 버튼이 0인데 up이 안 온 경우 강제 종료
        if ((ev.buttons ?? 1) === 0) {
          cleanup();
          return;
        }

        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        const nextW = Math.max(MIN_W, Math.round(startW + dx));
        const nextH = Math.max(MIN_H, Math.round(startH + dy));

        rf.setNodes((ns) =>
          ns.map((n) => {
            if (n.id !== id) return n;
            return {
              ...n,
              style: {
                ...(n.style ?? {}),
                width: nextW,
                height: nextH,
              },
            };
          })
        );
      };

      const onUp = (_ev: Event) => cleanup();
      const onBlur = () => cleanup();

      const cleanup = () => {
        if (!alive) return;
        alive = false;

        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onUp as any, true);
        window.removeEventListener("pointercancel", onUp as any, true);
        window.removeEventListener("blur", onBlur, true);

        try {
          handleEl.releasePointerCapture(pointerId);
        } catch {}

        if (activeResizeCleanup === cleanupFn) activeResizeCleanup = null;
        if (typeof window !== "undefined" && window.__tdResizeCleanup === cleanupFn) window.__tdResizeCleanup = null;
      };

      const cleanupFn = () => cleanup();

      // ✅ capture 단계(true): ReactFlow 내부 핸들러보다 먼저 받도록
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp as any, true);
      window.addEventListener("pointercancel", onUp as any, true);
      window.addEventListener("blur", onBlur, true);

      // ✅ 세션 등록
      activeResizeCleanup = cleanupFn;
      if (typeof window !== "undefined") window.__tdResizeCleanup = cleanupFn;
    },
    [id, rf]
  );

  return (
    <div ref={rootRef} className={`tdNode ${selected ? "tdNode--selected" : ""}`}>
      <div className="tdNode__hdr">
        <div className="tdNode__hdrLeft">
          <div className="tdNode__title">{data.label}</div>
          <div className="tdNode__tag">{k}</div>
        </div>

        {/* TD-style flags */}
        <div className="tdNode__flags" onPointerDown={stop}>
          {/* Global Viewer On/Off */}
          <button className={`tdNode__flagBtn ${viewerEnabled ? "isOn" : ""}`} title="Viewer On/Off" onClick={onToggleViewer}>
            👁
          </button>

          {/* Display Flag */}
          <button className={`tdNode__flagBtn ${isD ? "isOn" : ""}`} title="Display Flag (D)" onClick={onToggleD}>
            D
          </button>

          {/* Viewer Flag */}
          <button className={`tdNode__flagBtn ${isV ? "isOn" : ""}`} title="Viewer Flag (V)" onClick={onToggleV}>
            V
          </button>

          {/* Bypass Flag */}
          <button className={`tdNode__flagBtn ${isB ? "isOn" : ""}`} title="Bypass Flag (B)" onClick={onToggleB}>
            B
          </button>
        </div>
      </div>

      <div className="tdNode__thumb">
        <canvas ref={canvasRef} className="tdNode__canvas" />
      </div>

      {/* ✅ Resize handle (bottom-right) */}
      <div className="tdNode__resizeHandle" title="Resize" onPointerDown={onResizePointerDown} />

      {/* Inputs */}
      {k === "lookup" && (
        <>
          <Handle
            id="in"
            type="target"
            position={Position.Left}
            className="tdHandle tdHandle--in"
            style={{ top: "38%" }}
          />
          <Handle
            id="lut"
            type="target"
            position={Position.Left}
            className="tdHandle tdHandle--in"
            style={{ top: "72%" }}
          />
        </>
      )}

      {(k === "fft" || k === "output") && (
        <Handle id="in" type="target" position={Position.Left} className="tdHandle tdHandle--in" />
      )}

      {/* Outputs */}
      {(k === "audioIn" || k === "fft" || k === "noise" || k === "ramp" || k === "lookup") && (
        <Handle id="out" type="source" position={Position.Right} className="tdHandle tdHandle--out" />
      )}
    </div>
  );
}
