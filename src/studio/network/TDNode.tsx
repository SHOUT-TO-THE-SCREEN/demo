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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    ensureNodeParams(id, data.kind);
  }, [ensureNodeParams, id, data.kind]);

  useEffect(() => {
    registerPreviewCanvas(id, canvasRef.current);
    return () => registerPreviewCanvas(id, null);
  }, [registerPreviewCanvas, id]);

  return (
    <div className={`tdNode ${selected ? "tdNode--selected" : ""}`}>
      <div className="tdNode__hdr">
        <div className="tdNode__title">{data.label}</div>
        <div className="tdNode__tag">{data.kind}</div>
      </div>

      <div className="tdNode__thumb">
        <canvas ref={canvasRef} className="tdNode__canvas" />
      </div>

      <Handle type="target" position={Position.Left} className="tdHandle tdHandle--in" />
      <Handle type="source" position={Position.Right} className="tdHandle tdHandle--out" />
    </div>
  );
}
