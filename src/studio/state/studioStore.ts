import { create } from "zustand";

export type NodeKind =
  | "audioIn"
  | "fft"
  | "mouseIn"
  | "math"
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
  | "null"
  | "webcamIn"
  | "movieIn"
  | "videoDeviceIn"
  // ─── SOP ────────────────────────────────────────────────────────────────
  | "sphereSop"
  | "gridSop"
  | "noiseSop"
  // ─── CHOP (generators) ──────────────────────────────────────────────────
  | "noiseCh"
  | "lfo"
  | "movieAudioIn";

export type RampStop = { id: string; t: number; color: string };

export type RampParams = {
  kind: "ramp";
  stops: RampStop[];
  interpolation: "linear" | "smoothstep" | "smooth";
};

export type NodeParams =
  | {
      kind: "audioIn";
      numSamples: number;
      gain: number;
      channelMode: "mono" | "stereo";
    }
  | { kind: "fft"; smoothing: number; intensity: number }
  // ✅ CHOP
  | {
      kind: "mouseIn";
      numSamples: number;
      sampleRate: number;
      mode: "hold" | "history";
    }
  | {
      kind: "math";
      tab: "multadd" | "range";
      preAdd: number;
      multiply: number;
      postAdd: number;
      fromLow: number;
      fromHigh: number;
      toLow: number;
      toHigh: number;
      clamp: boolean;
    }
  // ✅ TOP/ETC
  | {
      kind: "noise";
      seed: number;
      scale: number;
      speed: number;
      contrast: number;
    }
  | RampParams
  | { kind: "lookup"; invert: boolean }
  | { kind: "output"; exposure: number }
  | { kind: "constant"; color: string }
  | { kind: "transform"; tx: number; ty: number; rotate: number; scale: number }
  | { kind: "level"; brightness: number; contrast: number; gamma: number }
  | { kind: "hsvAdjust"; hue: number; saturation: number; value: number }
  | { kind: "blur"; mode: "box" | "gaussian"; radius: number }
  | { kind: "edgeDetect"; threshold: number; invert: boolean }
  | {
      kind: "over" | "add" | "multiply" | "screen" | "subtract";
      opacity: number;
    }
  // ✅ 유틸/입력
  | { kind: "null" }
  | { kind: "webcamIn"; deviceId: string | null }
  | { kind: "movieIn"; src: string; speed: number; loop: boolean }
  | { kind: "videoDeviceIn"; deviceId: string | null }
  // ─── SOP ────────────────────────────────────────────────────────────────
  | { kind: "sphereSop"; radius: number; rows: number; cols: number }
  | { kind: "gridSop"; width: number; height: number; rows: number; cols: number }
  | { kind: "noiseSop"; amplitude: number; frequency: number; speed: number; seed: number }
  // ─── CHOP generators ────────────────────────────────────────────────────
  | { kind: "noiseCh"; seed: number; period: number; amplitude: number; numChannels: number; numSamples: number }
  | { kind: "lfo"; waveform: "sine" | "square" | "ramp" | "triangle"; frequency: number; amplitude: number; offset: number; numSamples: number }
  | { kind: "movieAudioIn"; src: string; gain: number; numSamples: number; loop: boolean };

export type ViewerMode = "fit" | "fill" | "1:1";

type SpawnImpl =
  | ((kind: NodeKind, clientX?: number, clientY?: number) => void)
  | null;

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
    patch: Partial<Extract<NodeParams, { kind: K }>>,
  ) => void;

  spawnImpl: SpawnImpl;
  setSpawnImpl: (impl: SpawnImpl) => void;
  spawnNode: (kind: NodeKind, clientX?: number, clientY?: number) => void;

  registerPreviewCanvas: (
    nodeId: string,
    canvas: HTMLCanvasElement | null,
  ) => void;
};

const clampOpacity = (v: number) =>
  Math.min(0.6, Math.max(0.05, +v.toFixed(2)));

function defaultParams(kind: NodeKind): NodeParams {
  if (kind === "audioIn")
    return { kind, numSamples: 256, gain: 1, channelMode: "mono" };
  if (kind === "fft") return { kind, smoothing: 0.85, intensity: 1 };

  // ✅ CHOP defaults
  if (kind === "mouseIn")
    return { kind, numSamples: 256, sampleRate: 60, mode: "history" };
  if (kind === "math")
    return {
      kind,
      tab: "multadd",
      preAdd: 0,
      multiply: 1,
      postAdd: 0,
      fromLow: 0,
      fromHigh: 1,
      toLow: 0,
      toHigh: 1,
      clamp: false,
    };

  if (kind === "noise")
    return { kind, seed: 1, scale: 18, speed: 0.8, contrast: 1.2 };

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
  if (kind === "output") return { kind, exposure: 1 };

  if (kind === "constant") return { kind, color: "#000000" };
  if (kind === "transform") return { kind, tx: 0, ty: 0, rotate: 0, scale: 1 };
  if (kind === "level") return { kind, brightness: 0, contrast: 1, gamma: 1 };
  if (kind === "hsvAdjust") return { kind, hue: 0, saturation: 1, value: 1 };
  if (kind === "blur") return { kind, mode: "gaussian", radius: 4 };
  if (kind === "edgeDetect") return { kind, threshold: 0, invert: false };

  if (
    kind === "over" ||
    kind === "add" ||
    kind === "multiply" ||
    kind === "screen" ||
    kind === "subtract"
  )
    return { kind, opacity: 1 };

  if (kind === "null") return { kind };
  if (kind === "webcamIn") return { kind, deviceId: null };
  if (kind === "movieIn") return { kind, src: "", speed: 1, loop: true };
  if (kind === "videoDeviceIn") return { kind, deviceId: null };

  // ─── SOP defaults ───────────────────────────────────────────────────────
  if (kind === "sphereSop") return { kind, radius: 1.0, rows: 20, cols: 20 };
  if (kind === "gridSop") return { kind, width: 2.0, height: 2.0, rows: 20, cols: 20 };
  if (kind === "noiseSop") return { kind, amplitude: 0.3, frequency: 2.5, speed: 0.5, seed: 0 };

  // ─── CHOP generator defaults ────────────────────────────────────────────
  if (kind === "noiseCh") return { kind, seed: 0, period: 1, amplitude: 1, numChannels: 1, numSamples: 120 };
  if (kind === "lfo") return { kind, waveform: "sine", frequency: 1, amplitude: 1, offset: 0, numSamples: 120 };
  if (kind === "movieAudioIn") return { kind, src: "", gain: 1, numSamples: 256, loop: true };

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
    set({ viewerPinnedNodeId: nodeId, viewerNodeId: nodeId }),
  unpinViewer: () => set({ viewerPinnedNodeId: null, viewerNodeId: null }),

  setViewerMode: (m) => set({ viewerMode: m }),
  setViewerOpacity: (v) => set({ viewerOpacity: clampOpacity(v) }),
  setViewerFps: (fps) => set({ viewerFps: fps }),

  registerViewerCanvas: (canvas) => set({ viewerCanvas: canvas }),

  setViewerNodeId: (nodeId) =>
    set({ viewerNodeId: nodeId, viewerPinnedNodeId: null }),
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
  setSelectedNodeIds: (ids) =>
    set({ selectedNodeIds: ids, selectedNodeId: ids[0] ?? null }),
  clearSelection: () => set({ selectedNodeIds: [], selectedNodeId: null }),

  setNodeKind: (id, kind) =>
    set((s) => ({ nodeKindById: { ...s.nodeKindById, [id]: kind } })),

  // studioStore.ts

  ensureNodeParams: (id, kind) =>
    set((s) => {
      const prev = s.paramsById[id];

      // ✅ kind 기록은 항상 최신으로
      const nextKindById =
        s.nodeKindById[id] === kind
          ? s.nodeKindById
          : { ...s.nodeKindById, [id]: kind };

      // ✅ params가 없으면 생성
      if (!prev) {
        return {
          nodeKindById: nextKindById,
          paramsById: { ...s.paramsById, [id]: defaultParams(kind) },
        };
      }

      // ✅ params.kind가 다르면 교정 (병합/복사/초기화 꼬임 방지)
      if (prev.kind !== kind) {
        return {
          nodeKindById: nextKindById,
          paramsById: { ...s.paramsById, [id]: defaultParams(kind) },
        };
      }

      // ✅ 이미 정상
      if (nextKindById === s.nodeKindById) return s;
      return { nodeKindById: nextKindById };
    }),

  setParam: (id, kind, patch) =>
    set((s) => {
      const prev = s.paramsById[id];
      const base =
        prev && prev.kind === kind ? prev : defaultParams(kind as any);
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
