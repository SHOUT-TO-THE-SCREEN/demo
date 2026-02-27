import type { NodeKind, NodeParams } from "../state/studioStore";

export type EvalCtx = {
  now: number;
  w: number;
  h: number;
  cache: Map<string, HTMLCanvasElement>;
};

export type EvalTOP = (nodeId: string, w: number, h: number) => HTMLCanvasElement | null;

export type TopOpEval = (args: {
  nodeId: string;
  kind: NodeKind;
  params: NodeParams | undefined;
  evalTOP: EvalTOP;
  inputMap: Record<string, Record<string, string>>;
  ctx: EvalCtx;
  bypassed: boolean;
}) => HTMLCanvasElement | null;

// ─── SOP ──────────────────────────────────────────────────────────────────────

export type SopGeometry = {
  positions: Float32Array; // 3 floats per vertex [x,y,z, ...]
  normals: Float32Array;   // 3 floats per vertex [nx,ny,nz, ...]
  indices: Uint32Array;    // 3 ints per triangle
  vertexCount: number;
  faceCount: number;
};

export type EvalSOP = (nodeId: string) => SopGeometry | null;

export type SopOpEval = (args: {
  nodeId: string;
  kind: NodeKind;
  params: NodeParams | undefined;
  evalSOP: EvalSOP;
  inputMap: Record<string, Record<string, string>>;
  ctx: EvalCtx;
}) => SopGeometry | null;
