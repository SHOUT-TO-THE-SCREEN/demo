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

  // TDNode.tsx의 Handle 부분만 교체

const k = data.kind;

// lookup: in/lut/out
{k === "lookup" && (
  <>
    <Handle id="in" type="target" position={Position.Left} className="tdHandle tdHandle--in" style={{ top: "38%" }} />
    <Handle id="lut" type="target" position={Position.Left} className="tdHandle tdHandle--in" style={{ top: "72%" }} />
    <Handle id="out" type="source" position={Position.Right} className="tdHandle tdHandle--out" />
  </>
)}

// noise, ramp: out
{(k === "noise" || k === "ramp") && (
  <Handle id="out" type="source" position={Position.Right} className="tdHandle tdHandle--out" />
)}

// output: in
{k === "output" && (
  <Handle id="in" type="target" position={Position.Left} className="tdHandle tdHandle--in" />
)}

// audioIn/fft: 기존처럼 좌/우 1개씩 쓰려면 id만 붙여도 됨
{(k === "audioIn" || k === "fft") && (
  <>
    <Handle id="in" type="target" position={Position.Left} className="tdHandle tdHandle--in" />
    <Handle id="out" type="source" position={Position.Right} className="tdHandle tdHandle--out" />
  </>
)}


  return (
    <div className={`tdNode ${selected ? "tdNode--selected" : ""}`}>
      <div className="tdNode__hdr">
        <div className="tdNode__title">{data.label}</div>
        <div className="tdNode__tag">{data.kind}</div>
      </div>

      <div className="tdNode__thumb">
        <canvas ref={canvasRef} className="tdNode__canvas" />
      </div>

      {/* ===== Inputs ===== */}
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

      {k === "output" && (
        <Handle id="in" type="target" position={Position.Left} className="tdHandle tdHandle--in" />
      )}

      {/* ===== Outputs ===== */}
      {(k === "noise" || k === "ramp" || k === "lookup") && (
        <Handle id="out" type="source" position={Position.Right} className="tdHandle tdHandle--out" />
      )}
    </div>
  );
}
