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
