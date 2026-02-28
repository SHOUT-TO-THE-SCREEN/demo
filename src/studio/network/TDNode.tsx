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

if (typeof window !== "undefined" && window.__tdResizeCleanup) {
  try {
    window.__tdResizeCleanup();
  } catch {}
  window.__tdResizeCleanup = null;
}

let activeResizeCleanup: null | (() => void) = null;

export default function TDNode(props: NodeProps<TDNodeData>) {
  const { id, data, selected } = props;

  const rf = useReactFlow();

  const ensureNodeParams = useStudioStore((s) => s.ensureNodeParams);
  const registerPreviewCanvas = useStudioStore((s) => s.registerPreviewCanvas);

  const viewerEnabled = useStudioStore((s) => s.viewerEnabled);
  const toggleViewer = useStudioStore((s) => s.toggleViewer);
  const setViewerEnabled = useStudioStore((s) => s.setViewerEnabled);

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

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      stop(e);

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
              style: { ...(n.style ?? {}), width: nextW, height: nextH },
            };
          }),
        );
      };

      const onUp = () => cleanup();
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
        if (
          typeof window !== "undefined" &&
          window.__tdResizeCleanup === cleanupFn
        ) {
          window.__tdResizeCleanup = null;
        }
      };

      const cleanupFn = () => cleanup();

      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp as any, true);
      window.addEventListener("pointercancel", onUp as any, true);
      window.addEventListener("blur", onBlur, true);

      activeResizeCleanup = cleanupFn;
      if (typeof window !== "undefined") window.__tdResizeCleanup = cleanupFn;
    },
    [id, rf],
  );

  const isComposite =
    k === "over" ||
    k === "add" ||
    k === "multiply" ||
    k === "screen" ||
    k === "subtract";
  const isLookup = k === "lookup";

  const hasIn1 =
    k === "fft" ||
    k === "math" ||
    k === "output" ||
    k === "null" ||
    k === "transform" ||
    k === "level" ||
    k === "hsvAdjust" ||
    k === "blur" ||
    k === "edgeDetect" ||
    k === "noiseSop" ||
    k === "mergeSop";

  const hasOut =
    k === "audioIn" ||
    k === "mouseIn" ||
    k === "webcamIn" ||
    k === "fft" ||
    k === "math" ||
    k === "noise" ||
    k === "ramp" ||
    k === "lookup" ||
    k === "constant" ||
    k === "textTop" ||
    k === "movieIn" ||
    k === "videoDeviceIn" ||
    k === "transform" ||
    k === "level" ||
    k === "hsvAdjust" ||
    k === "blur" ||
    k === "edgeDetect" ||
    k === "null" ||
    k === "sphereSop" ||
    k === "gridSop" ||
    k === "noiseSop" ||
    k === "torusSop" ||
    k === "mergeSop" ||
    k === "noiseCh" ||
    k === "lfo" ||
    k === "movieAudioIn" ||
    k === "handsChop" ||
    isComposite;

  const hasChopIn = k === "noiseSop" || k === "transform";

  const setNodeKind = useStudioStore((s) => s.setNodeKind);

  useEffect(() => {
    setNodeKind(id, data.kind);
    ensureNodeParams(id, data.kind);
  }, [setNodeKind, ensureNodeParams, id, data.kind]);
  useEffect(() => {
    const s = useStudioStore.getState();
    console.log(
      "[kind-check]",
      id,
      "data.kind=",
      data.kind,
      "params.kind=",
      s.paramsById[id]?.kind,
      "nodeKindById=",
      s.nodeKindById[id],
    );
  }, [id, data.kind]);
  return (
    <div
      ref={rootRef}
      className={`tdNode ${selected ? "tdNode--selected" : ""}`}
    >
      {/* Header (CSS: tdNode__hdr / tdNode__hdrLeft / tdNode__tag / tdNode__title) */}
      <div className="tdNode__hdr" onPointerDown={stop}>
        <div className="tdNode__hdrLeft">
          <div className="tdNode__tag">{String(data.kind).toUpperCase()}</div>
          <div className="tdNode__title">{data.label}</div>
        </div>

        <div className="tdNode__flags" onPointerDown={stop}>
          <button
            className={`tdNode__flagBtn ${viewerEnabled ? "isOn" : ""}`}
            title="Viewer On/Off"
            onClick={onToggleViewer}
          >
            👁
          </button>

          <button
            className={`tdNode__flagBtn ${isD ? "isOn" : ""}`}
            title="Display Flag (D)"
            onClick={onToggleD}
          >
            D
          </button>

          <button
            className={`tdNode__flagBtn ${isV ? "isOn" : ""}`}
            title="Viewer Flag (V)"
            onClick={onToggleV}
          >
            V
          </button>

          <button
            className={`tdNode__flagBtn ${isB ? "isOn" : ""}`}
            title="Bypass Flag (B)"
            onClick={onToggleB}
          >
            B
          </button>
        </div>
      </div>

      {/* Thumb */}
      <div className="tdNode__thumb">
        <canvas ref={canvasRef} className="tdNode__canvas" />
      </div>

      {/* Resize */}
      <div
        className="tdNode__resizeHandle"
        title="Resize"
        onPointerDown={onResizePointerDown}
      />

      {/* Inputs */}
      {isLookup && (
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

      {isComposite && (
        <>
          <Handle
            id="a"
            type="target"
            position={Position.Left}
            className="tdHandle tdHandle--in"
            style={{ top: "38%" }}
          />
          <Handle
            id="b"
            type="target"
            position={Position.Left}
            className="tdHandle tdHandle--in"
            style={{ top: "72%" }}
          />
        </>
      )}

      {k === "mergeSop" && (
        <>
          <Handle
            id="in"
            type="target"
            position={Position.Left}
            className="tdHandle tdHandle--in"
            style={{ top: "38%" }}
          />
          <Handle
            id="in1"
            type="target"
            position={Position.Left}
            className="tdHandle tdHandle--in"
            style={{ top: "72%" }}
          />
        </>
      )}

      {hasIn1 && !isComposite && !isLookup && k !== "mergeSop" && (
        <Handle
          id="in"
          type="target"
          position={Position.Left}
          className="tdHandle tdHandle--in"
        />
      )}

      {/* CHOP drive input */}
      {hasChopIn && (
        <Handle
          id="chop"
          type="target"
          position={Position.Left}
          className="tdHandle tdHandle--chop"
          style={{ top: "78%" }}
          title="CHOP drive"
        />
      )}

      {/* Outputs */}
      {hasOut && (
        <Handle
          id="out"
          type="source"
          position={Position.Right}
          className="tdHandle tdHandle--out"
        />
      )}
    </div>
  );
}
