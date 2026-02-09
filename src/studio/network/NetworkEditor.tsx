import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import type { Connection, Edge, Node, Viewport, NodeChange, EdgeChange, OnSelectionChangeParams } from "reactflow";

import "reactflow/dist/style.css";
import "./network.css";

import TDNode from "./TDNode";
import OpCreatorDialog from "./OpCreatorDialog";

import { useStudioStore } from "../state/studioStore";
import { usePreviewRuntime } from "../runtime/usePreviewRuntime";
import type { NodeKind } from "../state/studioStore";

type TDNodeData = { label: string; kind: NodeKind };
type TDNodeType = Node<TDNodeData>;
type TDEdgeType = Edge;

const nodeTypes = { td: TDNode };

// ✅ 무한 dimensions 루프 방지용: ReactFlow 노드 래퍼에 기본 크기 부여
const DEFAULT_W = 260;
const DEFAULT_H = 180;

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function labelOf(kind: NodeKind) {
  return kind;
}

type Snapshot = {
  nodes: TDNodeType[];
  edges: TDEdgeType[];
};

function cloneSnapshot(nodes: TDNodeType[], edges: TDEdgeType[]): Snapshot {
  // Node/Edge는 plain object라 JSON clone로 충분
  return {
    nodes: JSON.parse(JSON.stringify(nodes)) as TDNodeType[],
    edges: JSON.parse(JSON.stringify(edges)) as TDEdgeType[],
  };
}

function isTypingTarget(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  const tag = el?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || el?.getAttribute?.("contenteditable") === "true";
}

export default function NetworkEditor() {
  return (
    <ReactFlowProvider>
      <NetworkEditorInner />
    </ReactFlowProvider>
  );
}

function NetworkEditorInner() {
  // =========================
  // Store hooks
  // =========================
  const setSelectedNodeId = useStudioStore((s) => s.setSelectedNodeId);
  const setSelectedNodeIds = useStudioStore((s) => s.setSelectedNodeIds);
  const clearSelection = useStudioStore((s) => s.clearSelection);

  const setNodeKind = useStudioStore((s) => s.setNodeKind);
  const ensureNodeParams = useStudioStore((s) => s.ensureNodeParams);

  const setSpawnImpl = useStudioStore((s) => s.setSpawnImpl);
  const spawnNode = useStudioStore((s) => s.spawnNode);

  // viewer flags cleanup helpers (삭제 시 정합성)
  const setViewerNodeId = useStudioStore((s) => s.setViewerNodeId);
  const setDisplayNodeId = useStudioStore((s) => s.setDisplayNodeId);

  // =========================
  // TD behavior: Space pan
  // =========================
  const [spaceDown, setSpaceDown] = useState(false);

  // =========================
  // Initial graph
  // =========================
  const initialNodes: TDNodeType[] = useMemo(
    () => [
      {
        id: "audio",
        type: "td",
        position: { x: 80, y: 120 },
        data: { label: "audioIn", kind: "audioIn" },
        style: { width: DEFAULT_W, height: DEFAULT_H },
        selected: false,
      },
      {
        id: "fft",
        type: "td",
        position: { x: 420, y: 120 },
        data: { label: "fft", kind: "fft" },
        style: { width: DEFAULT_W, height: DEFAULT_H },
        selected: false,
      },
      {
        id: "out",
        type: "td",
        position: { x: 760, y: 120 },
        data: { label: "output", kind: "output" },
        style: { width: DEFAULT_W, height: DEFAULT_H },
        selected: false,
      },
    ],
    []
  );

  const initialEdges: TDEdgeType[] = useMemo(
    () => [
      { id: "e1", source: "audio", target: "fft", animated: true },
      { id: "e2", source: "fft", target: "out", animated: true },
    ],
    []
  );

  const [nodes, setNodes, baseOnNodesChange] = useNodesState<TDNodeData>(initialNodes);
  const [edges, setEdges, baseOnEdgesChange] = useEdgesState<TDEdgeType>(initialEdges);

  const rf = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // =========================
  // History (Undo/Redo)
  // =========================
  const historyRef = useRef<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] });
  const applyingHistoryRef = useRef(false);

  const pushHistory = useCallback(() => {
    if (applyingHistoryRef.current) return;
    const h = historyRef.current;
    h.past.push(cloneSnapshot(nodes, edges));
    h.future = [];
    if (h.past.length > 80) h.past = h.past.slice(h.past.length - 80);
  }, [nodes, edges]);

  const applySnapshot = useCallback(
    (snap: Snapshot) => {
      applyingHistoryRef.current = true;
      try {
        setNodes(snap.nodes);
        setEdges(snap.edges);

        const ids = (snap.nodes ?? []).filter((n) => Boolean((n as any).selected)).map((n) => n.id);
        setSelectedNodeIds(ids);
        setSelectedNodeId(ids[0] ?? null);
      } finally {
        applyingHistoryRef.current = false;
      }
    },
    [setNodes, setEdges, setSelectedNodeIds, setSelectedNodeId]
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length === 0) return;

    const current = cloneSnapshot(nodes, edges);
    const prev = h.past.pop()!;
    h.future.unshift(current);

    applySnapshot(prev);
  }, [applySnapshot, nodes, edges]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.future.length === 0) return;

    const current = cloneSnapshot(nodes, edges);
    const next = h.future.shift()!;
    h.past.push(current);

    applySnapshot(next);
  }, [applySnapshot, nodes, edges]);

  // TDNode resize가 보내는 히스토리 푸시 이벤트 수신
  useEffect(() => {
    const onPush = () => pushHistory();
    window.addEventListener("td:pushHistory", onPush as any);
    return () => window.removeEventListener("td:pushHistory", onPush as any);
  }, [pushHistory]);

  // =========================
  // OP Creator state
  // =========================
  const [opOpen, setOpOpen] = useState(false);
  const [opAnchor, setOpAnchor] = useState<{ x: number; y: number } | null>(null);
  const [opQuery, setOpQuery] = useState("");
  const [opSel, setOpSel] = useState(0);

  const openOpCreator = useCallback((clientX: number, clientY: number) => {
    setOpAnchor({ x: clientX, y: clientY });
    setOpQuery("");
    setOpSel(0);
    setOpOpen(true);
  }, []);

  const closeOpCreator = useCallback(() => {
    setOpOpen(false);
    setOpAnchor(null);
    setOpQuery("");
    setOpSel(0);
  }, []);

  // =========================
  // Initial kind/params register
  // =========================
  useEffect(() => {
    initialNodes.forEach((n) => {
      setNodeKind(n.id, n.data.kind);
      ensureNodeParams(n.id, n.data.kind);
    });
  }, [initialNodes, setNodeKind, ensureNodeParams]);

  // =========================
  // Connect
  // =========================
  const onConnect = useCallback(
    (c: Connection) => {
      pushHistory();
      setEdges((eds: TDEdgeType[]) => addEdge({ ...c, animated: true }, eds));
    },
    [setEdges, pushHistory]
  );

  // =========================
  // Node click / selection sync
  // (RF의 기본 선택 동작을 유지하면서 store만 동기화)
  // =========================
  const onNodeClick = useCallback(
    (_evt: React.MouseEvent, node: TDNodeType) => {
      setSelectedNodeId(node.id);
      // 다중선택은 onSelectionChange에서 세트되므로 여기서는 단일 보조만
    },
    [setSelectedNodeId]
  );

  const onSelectionChange = useCallback(
    (p: OnSelectionChangeParams) => {
      const ids = (p.nodes ?? []).map((n) => n.id);
      setSelectedNodeIds(ids);
      setSelectedNodeId(ids[0] ?? null);
    },
    [setSelectedNodeIds, setSelectedNodeId]
  );

  // =========================
  // External spawn impl
  // =========================
  useEffect(() => {
    const impl = (kind: NodeKind, clientX?: number, clientY?: number) => {
      pushHistory();

      const id = makeId(kind);

      let pos = { x: 220, y: 180 };
      if (wrapperRef.current && typeof clientX === "number" && typeof clientY === "number") {
        const rect = wrapperRef.current.getBoundingClientRect();
        pos = rf.screenToFlowPosition({ x: clientX - rect.left, y: clientY - rect.top });
      }

      const newNode: TDNodeType = {
        id,
        type: "td",
        position: pos,
        data: { label: labelOf(kind), kind },
        style: { width: DEFAULT_W, height: DEFAULT_H },
        selected: true,
      };

      setNodes((ns: TDNodeType[]) => {
        const next = ns.map((n: TDNodeType) => ({ ...n, selected: false }));
        return [...next, newNode];
      });

      setNodeKind(id, kind);
      ensureNodeParams(id, kind);

      setSelectedNodeId(id);
      setSelectedNodeIds([id]);
    };

    setSpawnImpl(impl);
    return () => setSpawnImpl(null);
  }, [rf, setNodes, setNodeKind, ensureNodeParams, setSelectedNodeId, setSelectedNodeIds, setSpawnImpl, pushHistory]);

  // =========================
  // TD-style pane double click
  // =========================
  const lastPaneClickRef = useRef<number>(0);
  const DBL_MS = 280;

  const onPaneClick = useCallback(
    (e: React.MouseEvent) => {
      const now = performance.now();
      const dt = now - lastPaneClickRef.current;
      lastPaneClickRef.current = now;

      if (dt < DBL_MS) {
        openOpCreator(e.clientX, e.clientY);
        return;
      }

      // ✅ Shift 누른 상태면 다중선택 워크플로우 방해하지 않도록 clear 금지
      if (e.shiftKey) return;

      clearSelection();
      // RF 내부 선택도 같이 해제
      setNodes((ns: TDNodeType[]) => ns.map((n: TDNodeType) => ({ ...n, selected: false })));
    },
    [openOpCreator, clearSelection, setNodes]
  );

  // =========================
  // Drag & Drop create
  // =========================
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData("application/td-kind") as NodeKind;
      if (!kind) return;

      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      pushHistory();

      const pos = rf.screenToFlowPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      const id = makeId(kind);

      const newNode: TDNodeType = {
        id,
        type: "td",
        position: pos,
        data: { label: labelOf(kind), kind },
        style: { width: DEFAULT_W, height: DEFAULT_H },
        selected: true,
      };

      setNodes((ns: TDNodeType[]) => {
        const next = ns.map((n: TDNodeType) => ({ ...n, selected: false }));
        return [...next, newNode];
      });

      setNodeKind(id, kind);
      ensureNodeParams(id, kind);

      setSelectedNodeId(id);
      setSelectedNodeIds([id]);
    },
    [rf, setNodes, setNodeKind, ensureNodeParams, setSelectedNodeId, setSelectedNodeIds, pushHistory]
  );

  // =========================
  // Space key handling (TD)
  // =========================
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;

      if (e.code === "Space") {
        e.preventDefault();
        setSpaceDown(true);
      }
    };

    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setSpaceDown(false);
      }
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // =========================
  // Delete / Undo / Redo commander
  // =========================
  const deleteSelected = useCallback(() => {
    const ids = nodes.filter((n) => Boolean((n as any).selected)).map((n) => n.id);
    if (ids.length === 0) return;

    pushHistory();

    // viewer/display flags가 삭제된 노드를 가리키면 정리
    const s = useStudioStore.getState();
    if (ids.includes(s.viewerNodeId ?? "")) setViewerNodeId(null);
    if (ids.includes(s.displayNodeId ?? "")) setDisplayNodeId(null);

    setNodes((ns: TDNodeType[]) => ns.filter((n: TDNodeType) => !ids.includes(n.id)));
    setEdges((es: TDEdgeType[]) => es.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)));

    clearSelection();
  }, [nodes, pushHistory, setNodes, setEdges, clearSelection, setViewerNodeId, setDisplayNodeId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;

      // Delete / Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }

      const mod = e.ctrlKey || e.metaKey;

      // Undo: Ctrl/Cmd+Z
      if (mod && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z
      if (mod && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && (e.key === "z" || e.key === "Z") && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, undo, redo]);

  // =========================
  // Drag move history: push once at drag start
  // =========================
  const dragArmedRef = useRef(false);

  const onNodeDragStart = useCallback(() => {
    if (dragArmedRef.current) return;
    dragArmedRef.current = true;
    pushHistory();
  }, [pushHistory]);

  const onNodeDragStop = useCallback(() => {
    dragArmedRef.current = false;
  }, []);

  // =========================
  // Nodes/Edges change (strict typing)
  // =========================
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      baseOnNodesChange(changes);
    },
    [baseOnNodesChange]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      baseOnEdgesChange(changes);
    },
    [baseOnEdgesChange]
  );

  // =========================
  // Move callbacks (no-op)
  // =========================
  const onMove = useCallback((_evt: unknown, _vp: Viewport) => {}, []);
  const onMoveStart = useCallback((_evt: unknown, _vp: Viewport) => {}, []);
  const onMoveEnd = useCallback((_evt: unknown, _vp: Viewport) => {}, []);

  // =========================
  // Thumbnail runtime
  // =========================
  usePreviewRuntime();

  return (
    <div className={`tdNet ${spaceDown ? "isPanning" : ""}`} ref={wrapperRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onMove={onMove}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
        zoomOnDoubleClick={false}
        selectionOnDrag={!spaceDown}
        panOnDrag={spaceDown ? [0] : [1, 2]}
        // ✅ Shift 다중 선택(클릭 + 드래그 박스) 활성화
        multiSelectionKeyCode="Shift"
        // RF 기본 delete는 끄고(중복 방지), 우리가 키보드에서 처리
        deleteKeyCode={null}
      >
        <Background gap={18} size={1} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>

      <OpCreatorDialog
        open={opOpen}
        anchor={opAnchor}
        query={opQuery}
        selectedIndex={opSel}
        onClose={closeOpCreator}
        onQuery={setOpQuery}
        onSelectIndex={setOpSel}
        onPick={(kind) => {
          if (!opAnchor) return;
          // spawnNode는 setSpawnImpl로 연결된 impl을 호출
          spawnNode(kind, opAnchor.x, opAnchor.y);
          closeOpCreator();
        }}
      />
    </div>
  );
}
