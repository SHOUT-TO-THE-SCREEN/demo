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

  // ✅ Viewer 관련: store에 추가될 예정 (없어도 타입 에러 안 나게 any 처리)
  const viewerEnabled = useStudioStore((s: any) => s.viewerEnabled ?? true);
  const viewerPinnedNodeId = useStudioStore((s: any) => s.viewerPinnedNodeId ?? null);
  const toggleViewer = useStudioStore((s: any) => s.toggleViewer);
  const pinViewerToNode = useStudioStore((s: any) => s.pinViewerToNode);
  const clearViewerPin = useStudioStore((s: any) => s.clearViewerPin);

  const isPinned = viewerPinnedNodeId === id;

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
    if (typeof toggleViewer === "function") toggleViewer();
  };

  const onTogglePin = (e: any) => {
    stop(e);
    if (isPinned) {
      if (typeof clearViewerPin === "function") clearViewerPin();
    } else {
      if (typeof pinViewerToNode === "function") pinViewerToNode(id);
    }
  };

  return (
    <div className={`tdNode ${selected ? "tdNode--selected" : ""}`}>
      <div className="tdNode__hdr">
        <div className="tdNode__hdrLeft">
          <div className="tdNode__title">{data.label}</div>
          <div className="tdNode__tag">{k}</div>
        </div>

        {/* ✅ TD 느낌 플래그 영역 */}
        <div className="tdNode__flags" onPointerDown={stop}>
          {/* Viewer On/Off */}
          <button
            className={`tdNode__flagBtn ${viewerEnabled ? "isOn" : ""}`}
            title="Viewer On/Off"
            onClick={onToggleViewer}
          >
            👁
          </button>

          {/* Pin this node to background viewer */}
          <button
            className={`tdNode__flagBtn ${isPinned ? "isOn" : ""}`}
            title="Display: pin this node to Background Viewer"
            onClick={onTogglePin}
          >
            ⬚
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
