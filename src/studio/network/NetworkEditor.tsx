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
import type { Connection, Edge, Node } from "reactflow";

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
  return "output";
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
  const setNodeKind = useStudioStore((s) => s.setNodeKind);
  const ensureNodeParams = useStudioStore((s) => s.ensureNodeParams);

  const setSpawnImpl = useStudioStore((s) => s.setSpawnImpl);
  const spawnNode = useStudioStore((s) => s.spawnNode);

  const initialNodes: TDNodeType[] = useMemo(
    () => [
      { id: "audio", type: "td", position: { x: 80, y: 120 }, data: { label: "audioIn", kind: "audioIn" } },
      { id: "fft", type: "td", position: { x: 420, y: 120 }, data: { label: "fft", kind: "fft" } },
      { id: "out", type: "td", position: { x: 760, y: 120 }, data: { label: "output", kind: "output" } },
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

  const [nodes, setNodes, onNodesChange] = useNodesState<TDNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<TDEdgeType>(initialEdges);

  const rf = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // === OP Creator state ===
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

  // 초기 kind/params 등록
  useEffect(() => {
    initialNodes.forEach((n) => {
      setNodeKind(n.id, n.data.kind);
      ensureNodeParams(n.id, n.data.kind);
    });
  }, [initialNodes, setNodeKind, ensureNodeParams]);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds: TDEdgeType[]) => addEdge({ ...c, animated: true }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: TDNodeType) => setSelectedNodeId(node.id),
    [setSelectedNodeId]
  );

  // 외부(spawnNode)에서 생성 가능하도록 impl 등록
  useEffect(() => {
    const impl = (kind: NodeKind, clientX?: number, clientY?: number) => {
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
      };

      setNodes((ns: TDNodeType[]) => ns.concat(newNode));
      setNodeKind(id, kind);
      ensureNodeParams(id, kind);
      setSelectedNodeId(id);
    };

    setSpawnImpl(impl);
    return () => setSpawnImpl(null);
  }, [rf, setNodes, setNodeKind, ensureNodeParams, setSelectedNodeId, setSpawnImpl]);

  // === Pane double click (버전 호환) ===
  const lastPaneClickRef = useRef<number>(0);
  const DBL_MS = 280;

  const onPaneClick = useCallback(
    (e: React.MouseEvent) => {
      const now = performance.now();
      const dt = now - lastPaneClickRef.current;
      lastPaneClickRef.current = now;

      if (dt < DBL_MS) {
        openOpCreator(e.clientX, e.clientY);
      }
    },
    [openOpCreator]
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

      const pos = rf.screenToFlowPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      const id = makeId(kind);

      const newNode: TDNodeType = {
        id,
        type: "td",
        position: pos,
        data: { label: labelOf(kind), kind },
      };

      setNodes((ns: TDNodeType[]) => ns.concat(newNode));
      setNodeKind(id, kind);
      ensureNodeParams(id, kind);
      setSelectedNodeId(id);
    },
    [rf, setNodes, setNodeKind, ensureNodeParams, setSelectedNodeId]
  );

  // 썸네일 렌더 런타임
  usePreviewRuntime(nodes, edges);

  return (
    <div className="tdNet" ref={wrapperRef}>
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
        onDragOver={onDragOver}
        onDrop={onDrop}
        zoomOnDoubleClick={false}
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
