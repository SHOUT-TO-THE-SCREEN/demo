// TDNode.tsx

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

  // ✅ Viewer 관련 (정식 store 키에 맞춤)
  const viewerEnabled = useStudioStore((s) => s.viewerEnabled);
  const viewerPinnedNodeId = useStudioStore((s) => s.viewerPinnedNodeId);
  const toggleViewer = useStudioStore((s) => s.toggleViewer);
  const setViewerEnabled = useStudioStore((s) => s.setViewerEnabled); // 아래 2)에서 추가
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
      return;
    }

    // ✅ 핀을 꽂는 순간 Viewer가 꺼져있으면 자동으로 켜주기 (TD UX)
    if (!viewerEnabled) setViewerEnabled(true);

    pinViewerToNode(id);
  };

  const k = data.kind;

  return (
    <div className={`tdNode ${selected ? "tdNode--selected" : ""}`}>
      <div className="tdNode__hdr">
        <div className="tdNode__hdrLeft">
          <div className="tdNode__title">{data.label}</div>
          <div className="tdNode__tag">{k}</div>
        </div>

        {/* ✅ 플래그 영역: 노드에서 Viewer / Pin on/off */}
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

      {/* Inputs */}
      {k === "lookup" && (
        <>
          <Handle id="in" type="target" position={Position.Left} className="tdHandle tdHandle--in" style={{ top: "38%" }} />
          <Handle id="lut" type="target" position={Position.Left} className="tdHandle tdHandle--in" style={{ top: "72%" }} />
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
