// opsChop/handsChop.ts  — MediaPipe Hands webcam CHOP
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { Chop } from "./types";
import { makeChop } from "./types";

// ─── Output channel layout ────────────────────────────────────────────────────
// ch0  wrist X          (0=left .. 1=right, mirrored when mirror=true)
// ch1  wrist Y          (0=top  .. 1=bottom)
// ch2  index tip X
// ch3  index tip Y
// ch4  thumb tip X
// ch5  thumb tip Y
// ch6  pinch distance   (thumb↔index, normalised ~0..0.3)
// ch7  hand present     (0 or 1)

export type HandsChopParams = {
  mirror: boolean;
};

const NUM_CH = 8;
const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// ─── Module-level state ───────────────────────────────────────────────────────
let landmarker: HandLandmarker | null = null;
let videoEl: HTMLVideoElement | null = null;
let stream: MediaStream | null = null;
let lastOut: Chop | null = null;
let initInFlight = false;
let lastTimestamp = -1;

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initHands(): Promise<void> {
  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

  landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: "VIDEO",
    numHands: 1,
  });

  stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

  videoEl = document.createElement("video");
  videoEl.srcObject = stream;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.muted = true;
  await videoEl.play();
}

// ─── Sync eval (called every RAF frame) ──────────────────────────────────────
export function evalHandsChopSync(_nodeId: string, p: HandsChopParams): Chop {
  const fallback = makeChop(NUM_CH, 1, 60);

  // Not ready yet — kick off init once
  if (!landmarker || !videoEl) {
    if (!initInFlight) {
      initInFlight = true;
      initHands()
        .catch(() => { /* user denied camera or model failed to load */ })
        .finally(() => { initInFlight = false; });
    }
    return lastOut ?? fallback;
  }

  // Video not streaming yet
  if (videoEl.readyState < 2) return lastOut ?? fallback;

  // Deduplicate within same ms (performance.now() can return same value)
  const ts = performance.now();
  if (ts <= lastTimestamp) return lastOut ?? fallback;
  lastTimestamp = ts;

  // ── Detect ────────────────────────────────────────────────────────────────
  const result = landmarker.detectForVideo(videoEl, ts);
  const out = makeChop(NUM_CH, 1, 60);

  if (result.landmarks.length > 0) {
    const lm = result.landmarks[0];
    const wrist    = lm[0];
    const thumbTip = lm[4];
    const indexTip = lm[8];

    const mx = p.mirror ? (x: number) => 1 - x : (x: number) => x;

    out.channels[0][0] = mx(wrist.x);
    out.channels[1][0] = wrist.y;
    out.channels[2][0] = mx(indexTip.x);
    out.channels[3][0] = indexTip.y;
    out.channels[4][0] = mx(thumbTip.x);
    out.channels[5][0] = thumbTip.y;

    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    out.channels[6][0] = Math.sqrt(dx * dx + dy * dy);
    out.channels[7][0] = 1;
  } else {
    // Hand lost — freeze position channels, set present=0
    if (lastOut) {
      for (let i = 0; i < 7; i++) out.channels[i][0] = lastOut.channels[i]?.[0] ?? 0;
    }
    out.channels[7][0] = 0;
  }

  lastOut = out;
  return out;
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────
export function cleanupHandsChop(): void {
  try { landmarker?.close(); } catch {}
  try {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  } catch {}
  landmarker = null;
  videoEl = null;
  stream = null;
  lastOut = null;
  initInFlight = false;
  lastTimestamp = -1;
}
