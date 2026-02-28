// opsChop/handsChop.ts  — MediaPipe Hands webcam CHOP
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { Chop } from "./types";
import { makeChop } from "./types";

// ─── Output channel layout ────────────────────────────────────────────────────
// ch0  pinch amount     (0=open hand, 1=fully pinched) ← amplitude 드라이브용
// ch1  index height     (0=low, 1=raised high)         ← frequency 드라이브용
// ch2  wrist tilt       (0=왼쪽 기울기, 0.5=수직, 1=오른쪽 기울기) ← speed 드라이브용
// ch3  wrist X          (0=left .. 1=right, mirrored)
// ch4  wrist Y          (0=top  .. 1=bottom)
// ch5  index tip X
// ch6  index tip Y
// ch7  thumb tip X
// ch8  thumb tip Y
// ch9  pinch distance   (raw, ~0..0.3)
// ch10 hand present     (0 or 1)
// ch11 hand openness    (0=주먹, 1=완전히 펼침)
// ch12 finger count     (0=주먹, 0.2=1개, …, 1.0=5개)

export type HandsChopParams = {
  mirror: boolean;
};

const NUM_CH = 13;
const PINCH_THRESH = 0.15; // dist>=0.15 → open hand (pinch amount = 0)
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

type LandmarkPoint = { x: number; y: number };
let lastLandmarks: LandmarkPoint[] | null = null;

/** Preview용: 현재 웹캠 비디오 엘리먼트 반환 */
export function getHandsVideo(): HTMLVideoElement | null { return videoEl; }
/** Preview용: 마지막 감지된 21개 랜드마크 반환 */
export function getLastLandmarks(): LandmarkPoint[] | null { return lastLandmarks; }

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
    lastLandmarks = lm.map((pt) => ({ x: pt.x, y: pt.y }));
    const wrist    = lm[0];
    const thumbTip = lm[4];
    const indexTip = lm[8];

    const mx = p.mirror ? (x: number) => 1 - x : (x: number) => x;

    const pdx = thumbTip.x - indexTip.x;
    const pdy = thumbTip.y - indexTip.y;
    const pinchDist = Math.sqrt(pdx * pdx + pdy * pdy);

    // ch0: pinch amount — 0 when open, 1 when pinched
    out.channels[0][0] = Math.max(0, 1 - pinchDist / PINCH_THRESH);
    // ch1: index height — 0 when low, 1 when raised
    out.channels[1][0] = Math.max(0, 1 - indexTip.y);

    // ch2: wrist tilt — angle of wrist→middleMCP vector relative to vertical
    // 0.5 = upright, 0 = tilted left, 1 = tilted right (like turning a dial)
    const middleMcp = lm[9];
    const tdx = middleMcp.x - wrist.x;
    const tdy = middleMcp.y - wrist.y;
    const tiltRad = Math.atan2(tdx, -tdy); // 0 = vertical
    out.channels[2][0] = Math.max(0, Math.min(1, tiltRad / Math.PI + 0.5));

    // ch3-ch4: wrist position
    out.channels[3][0] = mx(wrist.x);
    out.channels[4][0] = wrist.y;
    // ch5-ch6: index tip position
    out.channels[5][0] = mx(indexTip.x);
    out.channels[6][0] = indexTip.y;
    // ch7-ch8: thumb tip position
    out.channels[7][0] = mx(thumbTip.x);
    out.channels[8][0] = thumbTip.y;
    // ch9: raw pinch distance, ch10: hand present
    out.channels[9][0]  = pinchDist;
    out.channels[10][0] = 1;

    // ch11: hand openness — avg distance of fingertips from palm center (lm[9])
    const tipIndices = [4, 8, 12, 16, 20];
    const avgTipDist = tipIndices.reduce((sum, i) => {
      const ex = lm[i].x - middleMcp.x;
      const ey = lm[i].y - middleMcp.y;
      return sum + Math.sqrt(ex * ex + ey * ey);
    }, 0) / tipIndices.length;
    const OPEN_MAX = 0.22;
    out.channels[11][0] = Math.min(1, avgTipDist / OPEN_MAX);

    // ch12: finger count (0~5 → 0.0~1.0)
    const extended = [
      lm[4].y  < lm[2].y,
      lm[8].y  < lm[6].y,
      lm[12].y < lm[10].y,
      lm[16].y < lm[14].y,
      lm[20].y < lm[18].y,
    ];
    out.channels[12][0] = extended.filter(Boolean).length / 5;
  } else {
    lastLandmarks = null;
    // Hand lost — zero gesture channels, set present=0
    if (lastOut) {
      for (let i = 0; i < 13; i++) out.channels[i][0] = lastOut.channels[i]?.[0] ?? 0;
    }
    out.channels[0][0]  = 0; // pinch amount → 0
    out.channels[2][0]  = 0.5; // tilt → center
    out.channels[10][0] = 0; // hand present → 0
    out.channels[11][0] = 0; // openness → 0
    out.channels[12][0] = 0; // finger count → 0
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
