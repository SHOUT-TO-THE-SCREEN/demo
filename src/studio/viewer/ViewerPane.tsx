import { useEffect, useMemo, useRef, useState } from "react";
import "./viewerPane.css";
import { useStudioStore } from "../state/studioStore";

type Mode = "fit" | "fill" | "1:1";

/**
 * TouchDesigner 스타일:
 * - 별도 패널을 띄우지 않고, Studio 배경에 은은한 프리뷰를 깐다.
 * - 어떤 노드를 보여줄지는 "핀(pinned)" 또는 "선택(selected)" 기준으로 정한다.
 * - On/Off는 store의 viewerEnabled로 제어한다.
 */
export default function ViewerPane() {
  const selectedNodeId = useStudioStore((s) => s.selectedNodeId);
  const nodeKindById = useStudioStore((s) => s.nodeKindById);
  const previewCanvasByNodeId = useStudioStore((s) => s.previewCanvasByNodeId);

  // ✅ 아래 두 개는 store에 추가할 예정(하단 2) 참고)
  const viewerEnabled = useStudioStore((s: any) => s.viewerEnabled ?? true);
  const viewerPinnedNodeId = useStudioStore((s: any) => s.viewerPinnedNodeId ?? null);

  const activeNodeId = viewerPinnedNodeId ?? selectedNodeId;
  const kind = activeNodeId ? nodeKindById[activeNodeId] : null;
  const srcCanvas = activeNodeId ? previewCanvasByNodeId[activeNodeId] : null;

  const [mode, setMode] = useState<Mode>("fit");
  const [fps, setFps] = useState(0);
  const [opacity, setOpacity] = useState(0.22); // 배경에 깔릴 “잔잔함” 강도

  const viewRef = useRef<HTMLCanvasElement | null>(null);

  const title = useMemo(() => {
    if (!activeNodeId) return "Background Viewer";
    return `Background · ${kind ?? "unknown"} · ${activeNodeId}`;
  }, [activeNodeId, kind]);

  // 단축키(작업 효율)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Studio에서 흔히 쓰는 키랑 충돌 줄이려고 Alt 조합만 사용
      if (!e.altKey) return;

      if (e.key === "v" || e.key === "V") {
        // store에 toggleViewer가 있으면 그걸 쓰고, 없으면 viewerEnabled 직접 set (아래 store 스니펫 참고)
        const toggle = (useStudioStore.getState() as any).toggleViewer;
        if (typeof toggle === "function") toggle();
      }
      if (e.key === "1") setMode("fit");
      if (e.key === "2") setMode("fill");
      if (e.key === "3") setMode("1:1");

      // Alt + [ / ] : opacity 조절
      if (e.key === "[") setOpacity((v) => Math.max(0.05, +(v - 0.03).toFixed(2)));
      if (e.key === "]") setOpacity((v) => Math.min(0.6, +(v + 0.03).toFixed(2)));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
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

      // 배경은 "투명"으로 두고 (Studio 배경/그라데이션이 보이게)
      ctx.clearRect(0, 0, w, h);

      if (viewerEnabled && srcCanvas) {
        const sw = srcCanvas.width;
        const sh = srcCanvas.height;

        const vw = w;
        const vh = h;

        let dw = sw;
        let dh = sh;

        if (mode === "1:1") {
          dw = sw;
          dh = sh;
        } else {
          const sAspect = sw / sh;
          const vAspect = vw / vh;

          if (mode === "fit") {
            if (sAspect > vAspect) {
              dw = vw;
              dh = vw / sAspect;
            } else {
              dh = vh;
              dw = vh * sAspect;
            }
          } else {
            // fill
            if (sAspect > vAspect) {
              dh = vh;
              dw = vh * sAspect;
            } else {
              dw = vw;
              dh = vw / sAspect;
            }
          }
        }

        const dx = (vw - dw) / 2;
        const dy = (vh - dh) / 2;

        ctx.save();
        ctx.globalAlpha = opacity;

        // TD 느낌: 너무 “이미지” 같이 튀지 않게 약간 부드럽게
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(srcCanvas, dx, dy, dw, dh);

        // 약한 비네팅(잔잔하게 뒤로 보내기)
        const g = ctx.createRadialGradient(vw * 0.5, vh * 0.45, 10, vw * 0.5, vh * 0.5, Math.max(vw, vh) * 0.75);
        g.addColorStop(0, "rgba(0,0,0,0.00)");
        g.addColorStop(1, "rgba(0,0,0,0.55)");
        ctx.globalAlpha = Math.min(0.55, opacity + 0.12);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, vw, vh);

        ctx.restore();
      }

      // FPS(디버그용)
      frames++;
      const now = performance.now();
      if (now - lastT >= 500) {
        const next = Math.round((frames * 1000) / (now - lastT));
        setFps(next);
        frames = 0;
        lastT = now;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [srcCanvas, mode, opacity, viewerEnabled]);

  // HUD는 “최소한”만: 켜져있을 때만, 오른쪽 상단에 아주 약하게
  return (
    <div className={`viewerBackdrop ${viewerEnabled ? "isOn" : "isOff"}`}>
      <canvas ref={viewRef} className="viewerBackdrop__canvas" />

      <div className="viewerBackdrop__hud" aria-hidden="false">
        <div className="viewerBackdrop__row">
          <span className="viewerBackdrop__title">{title}</span>
          <span className="viewerBackdrop__pill">FPS {fps}</span>
        </div>

        <div className="viewerBackdrop__row">
          <button className={`viewerBackdrop__btn ${mode === "fit" ? "isOn" : ""}`} onClick={() => setMode("fit")}>
            Fit
          </button>
          <button className={`viewerBackdrop__btn ${mode === "fill" ? "isOn" : ""}`} onClick={() => setMode("fill")}>
            Fill
          </button>
          <button className={`viewerBackdrop__btn ${mode === "1:1" ? "isOn" : ""}`} onClick={() => setMode("1:1")}>
            1:1
          </button>

          <div className="viewerBackdrop__sep" />

          <button className="viewerBackdrop__btn" onClick={() => setOpacity((v) => Math.max(0.05, +(v - 0.03).toFixed(2)))}>
            −
          </button>
          <span className="viewerBackdrop__pill">Opacity {Math.round(opacity * 100)}%</span>
          <button className="viewerBackdrop__btn" onClick={() => setOpacity((v) => Math.min(0.6, +(v + 0.03).toFixed(2)))}>
            +
          </button>
        </div>

        <div className="viewerBackdrop__hint">Alt+V 토글 · Alt+1/2/3 모드 · Alt+[ / ] 투명도</div>
      </div>
    </div>
  );
}
