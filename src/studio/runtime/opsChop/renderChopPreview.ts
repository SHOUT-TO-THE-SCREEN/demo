import type { Chop } from "./types";

type PreviewOpts = {
  channel?: number;
  mode?: "line" | "bars" | "table";
  bg?: string;
};

export function renderChopPreview(
  chop: Chop,
  canvas: HTMLCanvasElement,
  opts: PreviewOpts = {}
) {
  const ch = opts.channel ?? 0;
  const mode = opts.mode ?? "line";

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // ✅ 캔버스 리사이즈는 runtime의 ensureCanvasSize에서만 수행
  const w = canvas.width || 1;
  const h = canvas.height || 1;

  // clear
  ctx.clearRect(0, 0, w, h);
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, w, h);
  }

  if (mode === "table") {
    drawTable(ctx, chop, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(`n=${chop.numSamples}  sr=${chop.sampleRate}`, 8, 16);
    return;
  }

  const data = chop.channels[ch] ?? chop.channels[0];
  if (!data || data.length === 0) return;

  // mid line
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.stroke();

  if (mode === "bars") drawBars(ctx, data, w, h);
  else drawLine(ctx, data, w, h);

  // tiny label (optional)
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(`CH${ch}  n=${data.length}  sr=${chop.sampleRate}`, 8, 16);
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  w: number,
  h: number
) {
  const n = data.length;

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w;
    const v = safe(data[i]);
    const y = (0.5 - v * 0.45) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  w: number,
  h: number
) {
  const n = data.length;
  const bw = w / n;

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(1, safe(data[i])));
    const bh = v * h;
    ctx.fillRect(i * bw, h - bh, Math.max(1, bw - 1), bh);
  }
}

function safe(v: number) {
  return Number.isFinite(v) ? v : 0;
}

function drawTable(ctx: CanvasRenderingContext2D, chop: Chop, w: number, h: number) {
  // ✅ 노드 프리뷰는 tx/ty만
  const labels = ["tx", "ty"];
  const idxMap = [0, 1];

  ctx.font = "12px ui-sans-serif, system-ui";
  const rowH = 18;
  const padX = 8;
  const startY = 28;

  for (let i = 0; i < labels.length; i++) {
    const chIdx = idxMap[i];
    const ch = chop.channels[chIdx];
    const v = ch && ch.length ? ch[ch.length - 1] : 0;

    const y = startY + i * rowH;

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(labels[i], padX, y);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(Number.isFinite(v) ? v.toFixed(4) : "0.0000", padX + 46, y);
  }
}
