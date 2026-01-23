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
  // ✅ selection
  selectedNodeId: string | null;
  selectedNodeIds: string[]; // multi-select ids

  // ===== Viewer (전역) =====
  viewerEnabled: boolean;

  // (구형 pin 개념 - 호환용 유지)
  viewerPinnedNodeId: string | null;

  // ✅ TD-style flags
  viewerNodeId: string | null; // Viewer Flag (V)
  displayNodeId: string | null; // Display Flag (D)
  bypassByNodeId: Record<string, boolean>; // Bypass Flag (B)

  viewerMode: ViewerMode;
  viewerOpacity: number; // 0~1
  viewerFps: number;

  // Viewer surface (TD-style: runtime renders directly here)
  viewerCanvas: HTMLCanvasElement | null;

  // ===== actions =====
  setViewerEnabled: (v: boolean) => void;
  toggleViewer: () => void;

  // pin/unpin (호환용): 내부적으로 viewerNodeId도 같이 맞춰둠
  pinViewerToNode: (nodeId: string) => void;
  unpinViewer: () => void;

  setViewerMode: (m: ViewerMode) => void;
  setViewerOpacity: (v: number) => void;
  setViewerFps: (fps: number) => void;

  registerViewerCanvas: (canvas: HTMLCanvasElement | null) => void;

  // ✅ TD-style flags actions
  setViewerNodeId: (nodeId: string | null) => void;
  setDisplayNodeId: (nodeId: string | null) => void;
  toggleBypass: (nodeId: string) => void;

  // ===== graph data =====
  nodeKindById: Record<string, NodeKind>;
  paramsById: Record<string, NodeParams>;
  previewCanvasByNodeId: Record<string, HTMLCanvasElement | null>;

  // ✅ selection actions
  setSelectedNodeId: (id: string | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  clearSelection: () => void;

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
  // selection defaults
  selectedNodeId: null,
  selectedNodeIds: [],

  // Viewer defaults
  viewerEnabled: true,

  // legacy pin
  viewerPinnedNodeId: null,

  // ✅ TD flags
  viewerNodeId: null,
  displayNodeId: null,
  bypassByNodeId: {},

  viewerMode: "fit",
  viewerOpacity: 0.22,
  viewerFps: 0,

  viewerCanvas: null,

  setViewerEnabled: (v) => set({ viewerEnabled: v }),
  toggleViewer: () => set((s) => ({ viewerEnabled: !s.viewerEnabled })),

  // legacy pin (호환용) — 실제로는 viewer flag처럼 동작하도록 맞춤
  pinViewerToNode: (nodeId) =>
    set({
      viewerPinnedNodeId: nodeId,
      viewerNodeId: nodeId,
    }),
  unpinViewer: () =>
    set({
      viewerPinnedNodeId: null,
      viewerNodeId: null,
    }),

  setViewerMode: (m) => set({ viewerMode: m }),
  setViewerOpacity: (v) => set({ viewerOpacity: Math.min(0.6, Math.max(0.05, +v.toFixed(2))) }),
  setViewerFps: (fps) => set({ viewerFps: fps }),

  registerViewerCanvas: (canvas) => set({ viewerCanvas: canvas }),

  // ✅ TD flags actions
  setViewerNodeId: (nodeId) => set({ viewerNodeId: nodeId, viewerPinnedNodeId: null }),
  setDisplayNodeId: (nodeId) => set({ displayNodeId: nodeId }),
  toggleBypass: (nodeId) =>
    set((s) => {
      const cur = Boolean(s.bypassByNodeId[nodeId]);
      return { bypassByNodeId: { ...s.bypassByNodeId, [nodeId]: !cur } };
    }),

  nodeKindById: {},
  paramsById: {},
  previewCanvasByNodeId: {},

  // ✅ selection actions
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids, selectedNodeId: ids[0] ?? null }),
  clearSelection: () => set({ selectedNodeIds: [], selectedNodeId: null }),

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
