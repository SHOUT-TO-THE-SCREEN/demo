import { useEffect, useMemo, useRef } from "react";
import "./viewerPane.css";
import { useStudioStore } from "../state/studioStore";
import type { ViewerMode } from "../state/studioStore";

type Props = {
  placement?: "background" | "hud";
};

export default function ViewerPane({ placement = "background" }: Props) {
  const selectedNodeId = useStudioStore((s) => s.selectedNodeId);
  const nodeKindById = useStudioStore((s) => s.nodeKindById);

  const viewerEnabled = useStudioStore((s) => s.viewerEnabled);
  const viewerPinnedNodeId = useStudioStore((s) => s.viewerPinnedNodeId);
  const viewerMode = useStudioStore((s) => s.viewerMode);
  const viewerOpacity = useStudioStore((s) => s.viewerOpacity);
  const viewerFps = useStudioStore((s) => s.viewerFps);

  const toggleViewer = useStudioStore((s) => s.toggleViewer);
  const pinViewerToNode = useStudioStore((s) => s.pinViewerToNode);
  const unpinViewer = useStudioStore((s) => s.unpinViewer);
  const setViewerMode = useStudioStore((s) => s.setViewerMode);
  const setViewerOpacity = useStudioStore((s) => s.setViewerOpacity);
  const registerViewerCanvas = useStudioStore((s) => s.registerViewerCanvas);

  const activeNodeId = viewerPinnedNodeId ?? selectedNodeId;
  const kind = activeNodeId ? nodeKindById[activeNodeId] : null;

  const viewRef = useRef<HTMLCanvasElement | null>(null);

  const title = useMemo(() => {
    if (!activeNodeId) return "Viewer";
    return `Viewer · ${kind ?? "unknown"} · ${activeNodeId}`;
  }, [activeNodeId, kind]);

  // ✅ background placement: register viewer surface once
  useEffect(() => {
    if (placement !== "background") return;
    registerViewerCanvas(viewRef.current);
    return () => registerViewerCanvas(null);
  }, [placement, registerViewerCanvas]);
  // ViewerPane.tsx background용 useEffect에 임시
  useEffect(() => {
    if (placement !== "background") return;
    const t = setInterval(() => {
      const c = viewRef.current;
      if (!c) return;
      const cs = getComputedStyle(c);
      const r = c.getBoundingClientRect();
      console.log("[DBG viewerCanvas]", {
        client: [c.clientWidth, c.clientHeight],
        rect: [Math.round(r.width), Math.round(r.height)],
        cssH: cs.height,
        buf: [c.width, c.height],
      });
    }, 500);
    return () => clearInterval(t);
  }, [placement]);

  // ✅ HUD placement: keyboard shortcuts
  useEffect(() => {
    if (placement !== "hud") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;

      if (e.key === "v" || e.key === "V") toggleViewer();
      if (e.key === "1") setViewerMode("fit");
      if (e.key === "2") setViewerMode("fill");
      if (e.key === "3") setViewerMode("1:1");

      if (e.key === "[" || e.key === "]") {
        const cur = useStudioStore.getState().viewerOpacity;
        const next = e.key === "[" ? cur - 0.03 : cur + 0.03;
        setViewerOpacity(next);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [placement, toggleViewer, setViewerMode, setViewerOpacity]);

  if (placement === "background") {
    return (
      <div
        className={` viewerBackdrop--bg ${viewerEnabled ? "isOn" : "isOff"}`}
      >
        {/* ✅ runtime이 여기로 직접 렌더 */}
        <canvas
          ref={viewRef}
          className="viewerBackdrop__canvas"
          style={{ opacity: viewerOpacity }}
        />
      </div>
    );
  }

  const isPinned = Boolean(viewerPinnedNodeId);

  return (
    <div
      className={`viewerBackdrop viewerBackdrop--hud ${viewerEnabled ? "isOn" : "isOff"}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="viewerBackdrop__row">
        <span className="viewerBackdrop__title">{title}</span>
        <span className="viewerBackdrop__pill">FPS {viewerFps}</span>

        <div className="viewerBackdrop__sep" />

        <button
          className={`viewerBackdrop__btn ${viewerEnabled ? "isOn" : ""}`}
          onClick={toggleViewer}
        >
          {viewerEnabled ? "On" : "Off"}
        </button>

        <button
          className={`viewerBackdrop__btn ${isPinned ? "isOn" : ""}`}
          disabled={!selectedNodeId}
          onClick={() => {
            if (!selectedNodeId) return;
            if (isPinned) unpinViewer();
            else pinViewerToNode(selectedNodeId);
          }}
        >
          {isPinned ? "Unpin" : "Pin"}
        </button>
      </div>

      <div className="viewerBackdrop__row">
        <ModeBtn mode="fit" cur={viewerMode} onSet={setViewerMode} />
        <ModeBtn mode="fill" cur={viewerMode} onSet={setViewerMode} />
        <ModeBtn mode="1:1" cur={viewerMode} onSet={setViewerMode} />

        <div className="viewerBackdrop__sep" />

        <button
          className="viewerBackdrop__btn"
          onClick={() => setViewerOpacity(viewerOpacity - 0.03)}
        >
          −
        </button>
        <span className="viewerBackdrop__pill">
          Opacity {Math.round(viewerOpacity * 100)}%
        </span>
        <button
          className="viewerBackdrop__btn"
          onClick={() => setViewerOpacity(viewerOpacity + 0.03)}
        >
          +
        </button>
      </div>

      <div className="viewerBackdrop__hint">Alt+V · Alt+1/2/3 · Alt+[ / ]</div>
    </div>
  );
}

function ModeBtn({
  mode,
  cur,
  onSet,
}: {
  mode: ViewerMode;
  cur: ViewerMode;
  onSet: (m: ViewerMode) => void;
}) {
  return (
    <button
      className={`viewerBackdrop__btn ${cur === mode ? "isOn" : ""}`}
      onClick={() => onSet(mode)}
    >
      {mode}
    </button>
  );
}
