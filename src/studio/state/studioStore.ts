import { create } from "zustand";

export type NodeKind = "audioIn" | "fft" | "noise" | "output";

export type NodeParams =
  | { kind: "audioIn"; gain: number }
  | { kind: "fft"; smoothing: number; intensity: number }
  | { kind: "noise"; seed: number; scale: number; speed: number; contrast: number }
  | { kind: "output"; exposure: number };

type SpawnImpl = ((kind: NodeKind, clientX?: number, clientY?: number) => void) | null;

type StudioState = {
  selectedNodeId: string | null;

  nodeKindById: Record<string, NodeKind>;
  paramsById: Record<string, NodeParams>;

  previewCanvasByNodeId: Record<string, HTMLCanvasElement | null>;

  setSelectedNodeId: (id: string | null) => void;
  setNodeKind: (id: string, kind: NodeKind) => void;

  ensureNodeParams: (id: string, kind: NodeKind) => void;
  setParam: <K extends NodeParams["kind"]>(
    id: string,
    kind: K,
    patch: Partial<Extract<NodeParams, { kind: K }>>
  ) => void;

  spawnImpl: SpawnImpl;
  setSpawnImpl: (impl: SpawnImpl) => void;
  spawnNode: (kind: NodeKind, clientX?: number, clientY?: number) => void;

  registerPreviewCanvas: (nodeId: string, canvas: HTMLCanvasElement | null) => void;
};

function defaultParams(kind: NodeKind): NodeParams {
  if (kind === "audioIn") return { kind, gain: 1 };
  if (kind === "fft") return { kind, smoothing: 0.85, intensity: 1 };
  if (kind === "noise") return { kind, seed: 1, scale: 18, speed: 0.8, contrast: 1.2 };
  return { kind, exposure: 1 };
}

export const useStudioStore = create<StudioState>((set, get) => ({
  selectedNodeId: null,

  nodeKindById: {},
  paramsById: {},

  previewCanvasByNodeId: {},

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setNodeKind: (id, kind) =>
    set((s) => ({
      nodeKindById: { ...s.nodeKindById, [id]: kind },
    })),

  ensureNodeParams: (id, kind) =>
    set((s) => {
      if (s.paramsById[id]) return s;
      return { paramsById: { ...s.paramsById, [id]: defaultParams(kind) } };
    }),

  setParam: (id, kind, patch) =>
    set((s) => {
      const prev = s.paramsById[id];
      const base = prev && prev.kind === kind ? prev : defaultParams(kind);
      return {
        paramsById: {
          ...s.paramsById,
          [id]: { ...base, ...patch } as NodeParams,
        },
      };
    }),

  spawnImpl: null,
  setSpawnImpl: (impl) => set({ spawnImpl: impl }),
  spawnNode: (kind, clientX, clientY) => {
    const fn = get().spawnImpl;
    if (fn) fn(kind, clientX, clientY);
  },

  registerPreviewCanvas: (nodeId, canvas) =>
    set((s) => ({
      previewCanvasByNodeId: { ...s.previewCanvasByNodeId, [nodeId]: canvas },
    })),
}));
