import { useEffect, useRef } from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

import "./network.css";
import "./tdnode.css";

import { useStudioStore } from "../state/studioStore";
import type { NodeKind } from "../state/studioStore";

type TDNodeData = { label: string; kind: NodeKind };

export default function TDNode(props: NodeProps<TDNodeData>) {
  const { id, data, selected } = props;

  const ensureNodeParams = useStudioStore((s) => s.ensureNodeParams);
  const registerPreviewCanvas = useStudioStore((s) => s.registerPreviewCanvas);

  // Viewer global
  const viewerEnabled = useStudioStore((s) => s.viewerEnabled);
  const toggleViewer = useStudioStore((s) => s.toggleViewer);
  const setViewerEnabled = useStudioStore((s) => s.setViewerEnabled);

  // ✅ TD flags
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

  useEffect(() => {
    ensureNodeParams(id, data.kind);
  }, [ensureNodeParams, id, data.kind]);

  useEffect(() => {
    registerPreviewCanvas(id, canvasRef.current);
    return () => registerPreviewCanvas(id, null);
  }, [registerPreviewCanvas, id]);

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

  return (
    <div className={`tdNode ${selected ? "tdNode--selected" : ""}`}>
      <div className="tdNode__hdr">
        <div className="tdNode__hdrLeft">
          <div className="tdNode__title">{data.label}</div>
          <div className="tdNode__tag">{k}</div>
        </div>

        {/* ✅ TD-style flags */}
        <div className="tdNode__flags" onPointerDown={stop}>
          {/* Global Viewer On/Off */}
          <button
            className={`tdNode__flagBtn ${viewerEnabled ? "isOn" : ""}`}
            title="Viewer On/Off"
            onClick={onToggleViewer}
          >
            👁
          </button>

          {/* Display Flag */}
          <button
            className={`tdNode__flagBtn ${isD ? "isOn" : ""}`}
            title="Display Flag (D)"
            onClick={onToggleD}
          >
            D
          </button>

          {/* Viewer Flag */}
          <button
            className={`tdNode__flagBtn ${isV ? "isOn" : ""}`}
            title="Viewer Flag (V)"
            onClick={onToggleV}
          >
            V
          </button>

          {/* Bypass Flag */}
          <button
            className={`tdNode__flagBtn ${isB ? "isOn" : ""}`}
            title="Bypass Flag (B)"
            onClick={onToggleB}
          >
            B
          </button>
        </div>
      </div>

      <div className="tdNode__thumb">
        <canvas ref={canvasRef} className="tdNode__canvas" />
      </div>

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
