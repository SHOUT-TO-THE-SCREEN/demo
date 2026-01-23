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
  const previewCanvasByNodeId = useStudioStore((s) => s.previewCanvasByNodeId);

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
  const setViewerFps = useStudioStore((s) => s.setViewerFps);

  const activeNodeId = viewerPinnedNodeId ?? selectedNodeId;
  const kind = activeNodeId ? nodeKindById[activeNodeId] : null;
  const srcCanvas = activeNodeId ? previewCanvasByNodeId[activeNodeId] : null;

  const viewRef = useRef<HTMLCanvasElement | null>(null);

  const title = useMemo(() => {
    if (!activeNodeId) return "Background Viewer";
    return `Background · ${kind ?? "unknown"} · ${activeNodeId}`;
  }, [activeNodeId, kind]);

  // ✅ 키보드 리스너는 HUD에서만 (중복 등록 방지)
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

  // ✅ 렌더 루프는 background에서만 (중복 루프 방지)
  useEffect(() => {
    if (placement !== "background") return;

    let raf = 0;
    let lastT = performance.now();
    let frames = 0;

    const loop = () => {
      const view = viewRef.current;
      if (!view) {
        raf = requestAnimationFrame(loop);
        return;
      }

      const ctx = view.getContext("2d");
      if (!ctx) {
        raf = requestAnimationFrame(loop);
        return;
      }

      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const w = view.clientWidth || 800;
      const h = view.clientHeight || 600;

      if (view.width !== w * dpr || view.height !== h * dpr) {
        view.width = w * dpr;
        view.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (viewerEnabled && srcCanvas) {
        const sw = srcCanvas.width;
        const sh = srcCanvas.height;

        const vw = w;
        const vh = h;

        let dw = sw;
        let dh = sh;

        const sAspect = sw / sh;
        const vAspect = vw / vh;

        if (viewerMode === "1:1") {
          dw = sw;
          dh = sh;
        } else if (viewerMode === "fit") {
          if (sAspect > vAspect) {
            dw = vw;
            dh = vw / sAspect;
          } else {
            dh = vh;
            dw = vh * sAspect;
          }
        } else {
          if (sAspect > vAspect) {
            dh = vh;
            dw = vh * sAspect;
          } else {
            dw = vw;
            dh = vw / sAspect;
          }
        }

        const dx = (vw - dw) / 2;
        const dy = (vh - dh) / 2;

        ctx.save();
        ctx.globalAlpha = viewerOpacity;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(srcCanvas, dx, dy, dw, dh);
        ctx.restore();
      }

      frames++;
      const now = performance.now();
      if (now - lastT >= 500) {
        setViewerFps(Math.round((frames * 1000) / (now - lastT)));
        frames = 0;
        lastT = now;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [placement, srcCanvas, viewerEnabled, viewerMode, viewerOpacity, setViewerFps]);

  // ===== Render =====

  if (placement === "background") {
    return (
      <div className={`viewerBackdrop viewerBackdrop--bg ${viewerEnabled ? "isOn" : "isOff"}`}>
        <canvas ref={viewRef} className="viewerBackdrop__canvas" />
      </div>
    );
  }

  const isPinned = Boolean(viewerPinnedNodeId);

  return (
    <div
      className={`viewerBackdrop viewerBackdrop--hud ${viewerEnabled ? "isOn" : "isOff"}`}
      onPointerDown={(e) => e.stopPropagation()} // ✅ 네트워크로 이벤트 누수 차단
      onClick={(e) => e.stopPropagation()}
    >
      <div className="viewerBackdrop__row">
        <span className="viewerBackdrop__title">{title}</span>
        <span className="viewerBackdrop__pill">FPS {viewerFps}</span>

        <div className="viewerBackdrop__sep" />

        <button className={`viewerBackdrop__btn ${viewerEnabled ? "isOn" : ""}`} onClick={toggleViewer}>
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

        <button className="viewerBackdrop__btn" onClick={() => setViewerOpacity(viewerOpacity - 0.03)}>
          −
        </button>
        <span className="viewerBackdrop__pill">Opacity {Math.round(viewerOpacity * 100)}%</span>
        <button className="viewerBackdrop__btn" onClick={() => setViewerOpacity(viewerOpacity + 0.03)}>
          +
        </button>
      </div>

      <div className="viewerBackdrop__hint">Alt+V 토글 · Alt+1/2/3 모드 · Alt+[ / ] 투명도</div>
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
    <button className={`viewerBackdrop__btn ${cur === mode ? "isOn" : ""}`} onClick={() => onSet(mode)}>
      {mode}
    </button>
  );
}
