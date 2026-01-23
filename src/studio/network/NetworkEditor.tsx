import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from "reactflow";
import type {
  Connection,
  Edge,
  Node,
  EdgeChange,
  NodeChange,
  OnSelectionChangeParams,
} from "reactflow";

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

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function labelOf(kind: NodeKind) {
  if (kind === "audioIn") return "audioIn";
  if (kind === "fft") return "fft";
  if (kind === "noise") return "noise";
  if (kind === "ramp") return "ramp";
  if (kind === "lookup") return "lookup";
  return "output";
}

type GraphSnap = { nodes: TDNodeType[]; edges: TDEdgeType[] };

function cloneSnap(s: GraphSnap): GraphSnap {
  // nodes/edges는 plain object라 structuredClone 가능 환경이면 그걸 쓰고,
  // 아니면 JSON clone로 충분합니다.
  const sc = (globalThis as any).structuredClone as
    | undefined
    | ((v: any) => any);
  if (typeof sc === "function") return sc(s);
  return JSON.parse(JSON.stringify(s)) as GraphSnap;
}

export default function NetworkEditor() {
  return (
    <ReactFlowProvider>
      <NetworkEditorInner />
    </ReactFlowProvider>
  );
}

function NetworkEditorInner() {
  const setSelectedNodeId = useStudioStore((s) => s.setSelectedNodeId);
  const setSelectedNodeIds = useStudioStore((s) => s.setSelectedNodeIds);
  const clearSelection = useStudioStore((s) => s.clearSelection);

  const setNodeKind = useStudioStore((s) => s.setNodeKind);
  const ensureNodeParams = useStudioStore((s) => s.ensureNodeParams);

  const setSpawnImpl = useStudioStore((s) => s.setSpawnImpl);
  const spawnNode = useStudioStore((s) => s.spawnNode);
  const [spaceDown, setSpaceDown] = useState(false);

  const initialNodes: TDNodeType[] = useMemo(
    () => [
      {
        id: "audio",
        type: "td",
        position: { x: 80, y: 120 },
        data: { label: "audioIn", kind: "audioIn" },
      },
      {
        id: "fft",
        type: "td",
        position: { x: 420, y: 120 },
        data: { label: "fft", kind: "fft" },
      },
      {
        id: "out",
        type: "td",
        position: { x: 760, y: 120 },
        data: { label: "output", kind: "output" },
      },
    ],
    [],
  );

  const initialEdges: TDEdgeType[] = useMemo(
    () => [
      { id: "e1", source: "audio", target: "fft", animated: true },
      { id: "e2", source: "fft", target: "out", animated: true },
    ],
    [],
  );

  const [nodes, setNodes] = useState<TDNodeType[]>(initialNodes);
  const [edges, setEdges] = useState<TDEdgeType[]>(initialEdges);

  const rf = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // ===== Undo stacks =====
  const pastRef = useRef<GraphSnap[]>([]);
  const futureRef = useRef<GraphSnap[]>([]);

  const pushHistory = useCallback(() => {
    pastRef.current.push(
      cloneSnap({
        nodes,
        edges,
      }),
    );
    futureRef.current = [];
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;

    const cur = cloneSnap({ nodes, edges });
    const prev = past.pop()!;

    futureRef.current.push(cur);
    setNodes(prev.nodes);
    setEdges(prev.edges);

    // selection 정리
    clearSelection();
  }, [nodes, edges, clearSelection]);

  const redo = useCallback(() => {
    const fut = futureRef.current;
    if (fut.length === 0) return;

    const cur = cloneSnap({ nodes, edges });
    const next = fut.pop()!;

    pastRef.current.push(cur);
    setNodes(next.nodes);
    setEdges(next.edges);

    clearSelection();
  }, [nodes, edges, clearSelection]);

  // ===== OP Creator state =====
  const [opOpen, setOpOpen] = useState(false);
  const [opAnchor, setOpAnchor] = useState<{ x: number; y: number } | null>(
    null,
  );
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

  // 초기 kind/params 등록
  useEffect(() => {
    initialNodes.forEach((n) => {
      setNodeKind(n.id, n.data.kind);
      ensureNodeParams(n.id, n.data.kind);
    });
  }, [initialNodes, setNodeKind, ensureNodeParams]);

  // ===== ReactFlow change handlers (Undo-friendly) =====
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 드래그 중간에는 히스토리 누적하지 않고, drag end 시점에만 push
      const shouldPush =
        changes.some((c: any) => c.type === "remove") ||
        changes.some((c: any) => c.type === "add") ||
        changes.some((c: any) => c.type === "position" && c.dragging === false);

      if (shouldPush) pushHistory();

      setNodes((ns) => applyNodeChanges(changes, ns));
    },
    [pushHistory],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const shouldPush =
        changes.some((c: any) => c.type === "remove") ||
        changes.some((c: any) => c.type === "add");
      if (shouldPush) pushHistory();

      setEdges((es) => applyEdgeChanges(changes, es));
    },
    [pushHistory],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      pushHistory();
      setEdges((eds) => addEdge({ ...c, animated: true }, eds));
    },
    [pushHistory],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: TDNodeType) => {
      setSelectedNodeId(node.id);
      setSelectedNodeIds([node.id]);
    },
    [setSelectedNodeId, setSelectedNodeIds],
  );

  const onSelectionChange = useCallback(
    (p: OnSelectionChangeParams) => {
      const ids = (p.nodes ?? []).map((n) => n.id);
      setSelectedNodeIds(ids);
      if (ids.length === 0) setSelectedNodeId(null);
    },
    [setSelectedNodeIds, setSelectedNodeId],
  );

  // 외부(spawnNode)에서 생성 가능하도록 impl 등록
  useEffect(() => {
    const impl = (kind: NodeKind, clientX?: number, clientY?: number) => {
      pushHistory();

      const id = makeId(kind);

      let pos = { x: 220, y: 180 };
      if (
        wrapperRef.current &&
        typeof clientX === "number" &&
        typeof clientY === "number"
      ) {
        const rect = wrapperRef.current.getBoundingClientRect();
        pos = rf.screenToFlowPosition({
          x: clientX - rect.left,
          y: clientY - rect.top,
        });
      }

      const newNode: TDNodeType = {
        id,
        type: "td",
        position: pos,
        data: { label: labelOf(kind), kind },
      };

      setNodes((ns) => ns.concat(newNode));
      setNodeKind(id, kind);
      ensureNodeParams(id, kind);

      setSelectedNodeId(id);
      setSelectedNodeIds([id]);
    };

    setSpawnImpl(impl);
    return () => setSpawnImpl(null);
  }, [
    rf,
    pushHistory,
    setNodes,
    setNodeKind,
    ensureNodeParams,
    setSelectedNodeId,
    setSelectedNodeIds,
    setSpawnImpl,
  ]);

  // ===== Pane double click (버전 호환) =====
  const lastPaneClickRef = useRef<number>(0);
  const DBL_MS = 280;

  const onPaneClick = useCallback(
    (e: React.MouseEvent) => {
      const now = performance.now();
      const dt = now - lastPaneClickRef.current;
      lastPaneClickRef.current = now;

      if (dt < DBL_MS) {
        openOpCreator(e.clientX, e.clientY);
      } else {
        // 빈 공간 클릭 시 selection 해제
        clearSelection();
      }
    },
    [openOpCreator, clearSelection],
  );

  // Drag & Drop 생성
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

      const pos = rf.screenToFlowPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      const id = makeId(kind);

      const newNode: TDNodeType = {
        id,
        type: "td",
        position: pos,
        data: { label: labelOf(kind), kind },
      };

      setNodes((ns) => ns.concat(newNode));
      setNodeKind(id, kind);
      ensureNodeParams(id, kind);

      setSelectedNodeId(id);
      setSelectedNodeIds([id]);
    },
    [
      rf,
      pushHistory,
      setNodes,
      setNodeKind,
      ensureNodeParams,
      setSelectedNodeId,
      setSelectedNodeIds,
    ],
  );

  // ===== Delete & Undo keyboard =====
  const deleteSelection = useCallback(() => {
    const ids = useStudioStore.getState().selectedNodeIds;
    if (!ids || ids.length === 0) return;

    pushHistory();

    setNodes((ns) => ns.filter((n) => !ids.includes(n.id)));
    setEdges((es) =>
      es.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)),
    );

    clearSelection();
  }, [pushHistory, clearSelection]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        (e.target as HTMLElement | null)?.getAttribute?.("contenteditable") ===
          "true";
      if (isTyping) return;

      // ✅ TD: Space = Pan 모드 (스크롤 방지)
      if (e.code === "Space") {
        e.preventDefault();
        setSpaceDown(true);
        return;
      }

      // delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelection();
        return;
      }

      // undo / redo
      if (e.ctrlKey && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        e.ctrlKey &&
        (e.key === "y" ||
          e.key === "Y" ||
          (e.shiftKey && (e.key === "z" || e.key === "Z")))
      ) {
        e.preventDefault();
        redo();
        return;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setSpaceDown(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [deleteSelection, undo, redo]);

  // 썸네일 렌더 런타임
  usePreviewRuntime(nodes, edges);

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
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        selectionOnDrag={!spaceDown} // Space 아닐 때만 박스 선택
        panOnDrag={spaceDown ? [0] : [1, 2]} // Space면 좌드래그 Pan, 아니면 중/우로 Pan
        zoomOnDoubleClick={false}
        panOnScroll={false}
        // 기본 박스 드래그 다중선택(ReactFlow 기본) 사용
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
          spawnNode(kind, opAnchor.x, opAnchor.y);
          closeOpCreator();
        }}
      />
    </div>
  );
}
