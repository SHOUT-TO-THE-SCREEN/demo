import { create } from "zustand";

export type NodeKind =
  | "audioIn"
  | "fft"
  | "noise"
  | "ramp"
  | "lookup"
  | "output"
  | "constant"
  | "transform"
  | "level"
  | "hsvAdjust"
  | "blur"
  | "edgeDetect"
  | "over"
  | "add"
  | "multiply"
  | "screen"
  | "subtract"
  // ✅ TDNode에서 이미 비교 중인 kind들 (타입에 추가)
  | "null"
  | "mouseIn"
  | "webcamIn"
  | "movieIn"
  | "videoDeviceIn";

export type RampStop = { id: string; t: number; color: string };
// ✅ ramp.ts에서 "smooth"를 쓰는 케이스 대비 alias 포함
export type RampParams = {
  kind: "ramp";
  stops: RampStop[];
  interpolation: "linear" | "smoothstep" | "smooth";
};

export type NodeParams =
  | { kind: "audioIn"; gain: number }
  | { kind: "fft"; smoothing: number; intensity: number }
  | { kind: "noise"; seed: number; scale: number; speed: number; contrast: number }
  | RampParams
  | { kind: "lookup"; invert: boolean }
  | { kind: "output"; exposure: number }
  | { kind: "constant"; color: string }
  | { kind: "transform"; tx: number; ty: number; rotate: number; scale: number }
  | { kind: "level"; brightness: number; contrast: number; gamma: number }
  | { kind: "hsvAdjust"; hue: number; saturation: number; value: number }
  | { kind: "blur"; mode: "box" | "gaussian"; radius: number }
  | { kind: "edgeDetect"; threshold: number; invert: boolean }
  | { kind: "over" | "add" | "multiply" | "screen" | "subtract"; opacity: number }
  // ✅ 신규/유틸 kind들
  | { kind: "null" }
  | { kind: "mouseIn"; smoothing: number }
  | { kind: "webcamIn"; deviceId: string | null }
  | { kind: "movieIn"; src: string; speed: number; loop: boolean }
  | { kind: "videoDeviceIn"; deviceId: string | null };

export type ViewerMode = "fit" | "fill" | "1:1";

type SpawnImpl = ((kind: NodeKind, clientX?: number, clientY?: number) => void) | null;

type StudioState = {
  selectedNodeId: string | null;
  selectedNodeIds: string[];

  viewerEnabled: boolean;
  viewerPinnedNodeId: string | null;

  viewerNodeId: string | null;
  displayNodeId: string | null;
  bypassByNodeId: Record<string, boolean>;

  viewerMode: ViewerMode;
  viewerOpacity: number;
  viewerFps: number;

  viewerCanvas: HTMLCanvasElement | null;

  setViewerEnabled: (v: boolean) => void;
  toggleViewer: () => void;

  pinViewerToNode: (nodeId: string) => void;
  unpinViewer: () => void;

  setViewerMode: (m: ViewerMode) => void;
  setViewerOpacity: (v: number) => void;
  setViewerFps: (fps: number) => void;

  registerViewerCanvas: (canvas: HTMLCanvasElement | null) => void;

  setViewerNodeId: (nodeId: string | null) => void;
  setDisplayNodeId: (nodeId: string | null) => void;
  toggleBypass: (nodeId: string) => void;

  nodeKindById: Record<string, NodeKind>;
  paramsById: Record<string, NodeParams>;
  previewCanvasByNodeId: Record<string, HTMLCanvasElement | null>;

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

  if (kind === "constant") return { kind, color: "#000000" };
  if (kind === "transform") return { kind, tx: 0, ty: 0, rotate: 0, scale: 1 };
  if (kind === "level") return { kind, brightness: 0, contrast: 1, gamma: 1 };
  if (kind === "hsvAdjust") return { kind, hue: 0, saturation: 1, value: 1 };
  if (kind === "blur") return { kind, mode: "gaussian", radius: 4 };
  if (kind === "edgeDetect") return { kind, threshold: 0, invert: false };

  if (kind === "over" || kind === "add" || kind === "multiply" || kind === "screen" || kind === "subtract")
    return { kind, opacity: 1 };

  // ✅ 유틸/입력 노드 기본값
  if (kind === "null") return { kind };
  if (kind === "mouseIn") return { kind, smoothing: 0.2 };
  if (kind === "webcamIn") return { kind, deviceId: null };
  if (kind === "movieIn") return { kind, src: "", speed: 1, loop: true };
  if (kind === "videoDeviceIn") return { kind, deviceId: null };

  // fallback
  return { kind: "output", exposure: 1 };
}

export const useStudioStore = create<StudioState>((set, get) => ({
  selectedNodeId: null,
  selectedNodeIds: [],

  viewerEnabled: true,
  viewerPinnedNodeId: null,

  viewerNodeId: null,
  displayNodeId: null,
  bypassByNodeId: {},

  viewerMode: "fit",
  viewerOpacity: 0.22,
  viewerFps: 0,

  viewerCanvas: null,

  setViewerEnabled: (v) => set({ viewerEnabled: v }),
  toggleViewer: () => set((s) => ({ viewerEnabled: !s.viewerEnabled })),

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
      const base = prev && prev.kind === kind ? prev : defaultParams(kind as any);
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
