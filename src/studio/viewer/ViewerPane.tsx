import { useEffect, useMemo, useRef, useState } from "react";
import "./viewerPane.css";
import { useStudioStore } from "../state/studioStore";

type Mode = "fit" | "fill" | "1:1";

export default function ViewerPane() {
  const selectedNodeId = useStudioStore((s) => s.selectedNodeId);
  const kind = useStudioStore((s) => (selectedNodeId ? s.nodeKindById[selectedNodeId] : null));
  const previewCanvasByNodeId = useStudioStore((s) => s.previewCanvasByNodeId);

  const srcCanvas = selectedNodeId ? previewCanvasByNodeId[selectedNodeId] : null;

  const [mode, setMode] = useState<Mode>("fit");
  const [fps, setFps] = useState(0);

  const viewRef = useRef<HTMLCanvasElement | null>(null);

  const title = useMemo(() => {
    if (!selectedNodeId) return "Viewer";
    return `Viewer · ${kind ?? "unknown"} · ${selectedNodeId}`;
  }, [selectedNodeId, kind]);

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
      const w = view.clientWidth || 520;
      const h = view.clientHeight || 320;

      if (view.width !== w * dpr || view.height !== h * dpr) {
        view.width = w * dpr;
        view.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 배경
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(10,14,21,0.95)";
      ctx.fillRect(0, 0, w, h);

      // 소스가 없으면 안내
      if (!srcCanvas) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "12px ui-sans-serif, system-ui";
        ctx.fillText("Select a node to preview.", 14, 22);
      } else {
        // srcCanvas는 썸네일이라 내부에 패널/라벨이 섞여있음
        // → 그대로 복사 (P0 MVP). P3 이후엔 cook 결과만 따로 렌더로 개선.
        const sw = srcCanvas.width;
        const sh = srcCanvas.height;

        const vw = w;
        const vh = h;

        // draw rect 계산
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

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(srcCanvas, dx, dy, dw, dh);
        ctx.imageSmoothingEnabled = true;
      }

      // FPS 측정
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
  }, [srcCanvas, mode]);

  const srcRes = srcCanvas ? `${srcCanvas.width}×${srcCanvas.height}` : "—";
  const sel = selectedNodeId ? "Selected" : "None";

  return (
    <section className="viewerPane">
      <header className="viewerPane__hdr">
        <div className="viewerPane__title">{title}</div>
        <div className="viewerPane__meta">
          <span className="viewerPane__pill">{sel}</span>
          <span className="viewerPane__pill">SRC {srcRes}</span>
          <span className="viewerPane__pill">FPS {fps}</span>
        </div>
        <div className="viewerPane__actions">
          <button className={`viewerPane__btn ${mode === "fit" ? "isOn" : ""}`} onClick={() => setMode("fit")}>
            Fit
          </button>
          <button className={`viewerPane__btn ${mode === "fill" ? "isOn" : ""}`} onClick={() => setMode("fill")}>
            Fill
          </button>
          <button className={`viewerPane__btn ${mode === "1:1" ? "isOn" : ""}`} onClick={() => setMode("1:1")}>
            1:1
          </button>
        </div>
      </header>

      <div className="viewerPane__body">
        <canvas ref={viewRef} className="viewerPane__canvas" />
      </div>
    </section>
  );
}
