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

  // ✅ Viewer 관련 (정식 store)
  const viewerEnabled = useStudioStore((s) => s.viewerEnabled);
  const viewerPinnedNodeId = useStudioStore((s) => s.viewerPinnedNodeId);
  const toggleViewer = useStudioStore((s) => s.toggleViewer);
  const setViewerEnabled = useStudioStore((s) => s.setViewerEnabled);
  const pinViewerToNode = useStudioStore((s) => s.pinViewerToNode);
  const unpinViewer = useStudioStore((s) => s.unpinViewer);

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
    toggleViewer();
  };

  const onTogglePin = (e: any) => {
    stop(e);
    if (isPinned) {
      unpinViewer();
    } else {
      // ✅ TD UX: 핀을 꽂는 순간 viewer가 꺼져있으면 자동 ON
      if (!viewerEnabled) setViewerEnabled(true);
      pinViewerToNode(id);
    }
  };

  return (
    <div className={`tdNode ${selected ? "tdNode--selected" : ""}`}>
      <div className="tdNode__hdr">
        <div className="tdNode__hdrLeft">
          <div className="tdNode__title">{data.label}</div>
          <div className="tdNode__tag">{k}</div>
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
            className={`tdNode__flagBtn ${isPinned ? "isOn" : ""}`}
            title={isPinned ? "Unpin from Viewer" : "Pin this node to Viewer"}
            onClick={onTogglePin}
          >
            ⬚
          </button>
        </div>
      </div>

      <div className="tdNode__thumb">
        <canvas ref={canvasRef} className="tdNode__canvas" />
      </div>

      {k === "lookup" && (
        <>
          <Handle id="in" type="target" position={Position.Left} className="tdHandle tdHandle--in" style={{ top: "38%" }} />
          <Handle id="lut" type="target" position={Position.Left} className="tdHandle tdHandle--in" style={{ top: "72%" }} />
        </>
      )}

      {(k === "fft" || k === "output") && (
        <Handle id="in" type="target" position={Position.Left} className="tdHandle tdHandle--in" />
      )}

      {(k === "audioIn" || k === "fft" || k === "noise" || k === "ramp" || k === "lookup") && (
        <Handle id="out" type="source" position={Position.Right} className="tdHandle tdHandle--out" />
      )}
    </div>
  );
}
