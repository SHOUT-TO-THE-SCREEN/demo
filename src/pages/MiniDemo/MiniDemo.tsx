import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./miniDemo.css";
type DemoMode = "Noise" | "Rings" | "Flow";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export default function MiniDemo() {
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef<number>(performance.now());

  const [mode, setMode] = useState<DemoMode>("Noise");
  const [intensity, setIntensity] = useState<number>(0.55); // 0~1
  const [speed, setSpeed] = useState<number>(0.55); // 0~1
  const [paused, setPaused] = useState<boolean>(false);

  const stateRef = useRef({ mode, intensity, speed, paused });
  useEffect(() => {
    stateRef.current = { mode, intensity, speed, paused };
  }, [mode, intensity, speed, paused]);

  // responsive: cap devicePixelRatio for perf
  const dpr = useMemo(() => Math.min(2, window.devicePixelRatio || 1), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const resize = () => {
  const parent = canvas.parentElement;
  if (!parent) return;

  // ✅ 레이아웃 루프 방지: rect 대신 clientWidth/Height 사용
  const w = Math.max(1, parent.clientWidth);
  const h = Math.max(1, parent.clientHeight);

  // ✅ JS는 drawing buffer만 설정 (CSS size는 건드리지 않음)
  const nextW = Math.floor(w * dpr);
  const nextH = Math.floor(h * dpr);

  if (canvas.width !== nextW) canvas.width = nextW;
  if (canvas.height !== nextH) canvas.height = nextH;

  // ✅ transform 초기화 포함 (혹시 누적 방지)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};


    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement ?? canvas);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const { mode: m, intensity: it, speed: sp, paused: p } = stateRef.current;
      const now = performance.now();
      const dt = (now - t0Ref.current) / 1000;
      const time = p ? 0 : dt * (0.2 + sp * 2.2);

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // background
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);

      // subtle vignette base
      const vg = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.7);
      vg.addColorStop(0, "rgba(255,255,255,0.03)");
      vg.addColorStop(0.6, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      if (m === "Noise") {
        renderNoise(ctx, w, h, time, it);
      } else if (m === "Rings") {
        renderRings(ctx, w, h, time, it);
      } else {
        renderFlow(ctx, w, h, time, it);
      }

      // HUD
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
      ctx.fillText("Mini Demo • Realtime Preview", 14, 22);

      ctx.globalAlpha = 0.55;
      ctx.fillText(`Mode: ${m}`, 14, 42);
      ctx.fillText(`Intensity: ${Math.round(it * 100)}%`, 14, 60);
      ctx.fillText(`Speed: ${Math.round(sp * 100)}%`, 14, 78);
      ctx.restore();
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [dpr]);

  const openEditor = () => navigate("/list");

  return (
    <section className="md">
      <div className="mdInner">
        <div className="mdTop">
          <div className="mdTitle">
            <h3>Try Mini Demo</h3>
            <p>Adjust a couple of parameters and see instant output. No setup, no install.</p>
          </div>

          <div className="mdTopActions">
            <button
              type="button"
              className="mdChip"
              aria-pressed={!paused}
              onClick={() => setPaused((v) => !v)}
              title="Pause / Resume"
            >
              {paused ? "Resume" : "Pause"}
            </button>

            <button type="button" className="mdCTA" onClick={openEditor}>
              Open Full Editor →
            </button>
          </div>
        </div>

        <div className="mdGrid">
          <div className="mdViewer" role="img" aria-label="Mini demo realtime canvas">
            <canvas ref={canvasRef} className="mdCanvas" />
            <div className="mdHint">
              <span className="mdDot" />
              Realtime
            </div>
          </div>

          <div className="mdPanel">
            <div className="mdGroup">
              <div className="mdLabelRow">
                <span className="mdLabel">Mode</span>
                <span className="mdValue">{mode}</span>
              </div>
              <div className="mdModeRow">
                {(["Noise", "Rings", "Flow"] as DemoMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`mdModeBtn ${mode === m ? "isActive" : ""}`}
                    onClick={() => setMode(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="mdGroup">
              <div className="mdLabelRow">
                <span className="mdLabel">Intensity</span>
                <span className="mdValue">{Math.round(intensity * 100)}%</span>
              </div>
              <input
                className="mdSlider"
                type="range"
                min={0}
                max={100}
                value={Math.round(intensity * 100)}
                onChange={(e) => setIntensity(clamp01(Number(e.target.value) / 100))}
              />
              <p className="mdHelp">Higher intensity increases contrast and deformation.</p>
            </div>

            <div className="mdGroup">
              <div className="mdLabelRow">
                <span className="mdLabel">Speed</span>
                <span className="mdValue">{Math.round(speed * 100)}%</span>
              </div>
              <input
                className="mdSlider"
                type="range"
                min={0}
                max={100}
                value={Math.round(speed * 100)}
                onChange={(e) => setSpeed(clamp01(Number(e.target.value) / 100))}
              />
              <p className="mdHelp">Controls animation rate. Keep it lower for subtle motion.</p>
            </div>

            <div className="mdFoot">
              <div className="mdNote">
                <span className="mdKey">Tip</span>
                This demo is read-only. Use the full editor to build node graphs.
              </div>

              <button type="button" className="mdGhost" onClick={openEditor}>
                Get Started (Editor)
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =======================
   Renderers (Canvas 2D)
======================= */

function renderNoise(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, intensity: number) {
  // coarse noise blocks for speed; looks “TOP-like”
  const cell = Math.max(6, Math.floor(18 - intensity * 10));
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const nx = x / cols;
      const ny = y / rows;

      const v =
        0.5 +
        0.5 *
          Math.sin(
            (nx * 10.0 + time * 1.3) +
              Math.cos(ny * 9.0 - time * 1.1) +
              Math.sin((nx + ny) * 6.0 + time * 0.8)
          );

      const c = Math.floor(20 + v * (80 + intensity * 120));
      ctx.fillStyle = `rgb(${c}, ${Math.floor(c * 0.5)}, ${Math.min(255, Math.floor(c + 60))})`;
      ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1);
    }
  }

  // bloom-ish overlay
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.18 + intensity * 0.22;
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.65);
  g.addColorStop(0, "rgba(55,19,236,0.55)");
  g.addColorStop(0.6, "rgba(55,19,236,0.10)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function renderRings(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, intensity: number) {
  const cx = w * 0.5;
  const cy = h * 0.48;
  const maxR = Math.min(w, h) * 0.55;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const ringCount = 26;
  for (let i = 0; i < ringCount; i++) {
    const t = i / ringCount;
    const r = t * maxR * (0.8 + 0.25 * Math.sin(time * 0.6 + t * 4.0));
    const a = 0.04 + intensity * 0.10;
    const wob = 0.15 + intensity * 0.35;

    ctx.beginPath();
    const angOff = time * (0.4 + intensity * 1.0) + t * 5.0;
    for (let k = 0; k <= 120; k++) {
      const ang = (k / 120) * Math.PI * 2;
      const rr = r * (1 + wob * 0.08 * Math.sin(ang * (3 + t * 6) + angOff));
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    ctx.strokeStyle = `rgba(55,19,236,${a})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // center glow
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  g.addColorStop(0, `rgba(255,255,255,${0.08 + intensity * 0.12})`);
  g.addColorStop(0.35, `rgba(55,19,236,${0.12 + intensity * 0.18})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
}

function renderFlow(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, intensity: number) {
  const cx = w * 0.5;
  const cy = h * 0.5;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const lines = 90;
  for (let i = 0; i < lines; i++) {
    const t = i / lines;
    const y0 = h * (0.15 + t * 0.7);
    const amp = (10 + intensity * 32) * (0.5 + 0.5 * Math.sin(time * 0.5 + t * 4.0));
    const freq = 0.012 + intensity * 0.02;

    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const nx = (x - cx) * freq;
      const ny = (y0 - cy) * freq;
      const v = Math.sin(nx * 6 + time * 1.2) + Math.cos(ny * 6 - time * 0.9);
      const y = y0 + v * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    const alpha = 0.02 + intensity * 0.06;
    ctx.strokeStyle = `rgba(55,19,236,${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // highlight streak
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.5, `rgba(255,255,255,${0.05 + intensity * 0.08})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, h * 0.18, w, h * 0.64);

  ctx.restore();
}
