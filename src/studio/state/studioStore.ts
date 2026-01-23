import { create } from "zustand";

export type NodeKind = "audioIn" | "fft" | "noise" | "ramp" | "lookup" | "output";

export type RampStop = { id: string; t: number; color: string };
export type RampParams = { kind: "ramp"; stops: RampStop[]; interpolation: "linear" | "smoothstep" };

export type NodeParams =
  | { kind: "audioIn"; gain: number }
  | { kind: "fft"; smoothing: number; intensity: number }
  | { kind: "noise"; seed: number; scale: number; speed: number; contrast: number }
  | RampParams
  | { kind: "lookup"; invert: boolean }
  | { kind: "output"; exposure: number };

export type ViewerMode = "fit" | "fill" | "1:1";

type SpawnImpl = ((kind: NodeKind, clientX?: number, clientY?: number) => void) | null;

type StudioState = {
  selectedNodeId: string | null;

  // ===== Viewer (정식) =====
  viewerEnabled: boolean;
  viewerPinnedNodeId: string | null;
  viewerMode: ViewerMode;
  viewerOpacity: number; // 0~1
  viewerFps: number;

  setViewerEnabled: (v: boolean) => void;
  toggleViewer: () => void;
  pinViewerToNode: (nodeId: string) => void;
  unpinViewer: () => void;
  setViewerMode: (m: ViewerMode) => void;
  setViewerOpacity: (v: number) => void;
  setViewerFps: (fps: number) => void;

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
  if (kind === "ramp")
    return {
      kind,
      interpolation: "linear",
      stops: [
        { id: "a", t: 0.0, color: "#000000" },
        { id: "b", t: 0.45, color: "#ff8a00" },
        { id: "c", t: 1.0, color: "#ffffff" },
      ],
    };
  if (kind === "lookup") return { kind, invert: false };
  return { kind, exposure: 1 };
}

export const useStudioStore = create<StudioState>((set, get) => ({
  selectedNodeId: null,

  // Viewer defaults
  viewerEnabled: true,
  viewerPinnedNodeId: null,
  viewerMode: "fit",
  viewerOpacity: 0.22,
  viewerFps: 0,

  setViewerEnabled: (v) => set({ viewerEnabled: v }),
  toggleViewer: () => set((s) => ({ viewerEnabled: !s.viewerEnabled })),
  pinViewerToNode: (nodeId) => set({ viewerPinnedNodeId: nodeId }),
  unpinViewer: () => set({ viewerPinnedNodeId: null }),
  setViewerMode: (m) => set({ viewerMode: m }),
  setViewerOpacity: (v) => set({ viewerOpacity: Math.min(0.6, Math.max(0.05, +v.toFixed(2))) }),
  setViewerFps: (fps) => set({ viewerFps: fps }),

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
