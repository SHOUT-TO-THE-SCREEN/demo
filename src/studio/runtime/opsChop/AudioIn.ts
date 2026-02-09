// opsChop/AudioIn.ts
import type { Chop } from "./types";
import { makeChop } from "./types";

export type AudioInParams = {
  numSamples: number; // 출력 샘플 수(프리뷰 길이)
  gain?: number; // 단순 스케일
  channelMode?: "mono" | "stereo";
};

type AudioState = {
  ctx: AudioContext;
  analyserL: AnalyserNode;
  analyserR?: AnalyserNode;
  src: MediaStreamAudioSourceNode;
  splitter?: ChannelSplitterNode;
  tmpL: Float32Array<ArrayBuffer>;
  tmpR?: Float32Array<ArrayBuffer>;
};

let audioState: AudioState | null = null;
let audioInitPromise: Promise<AudioState> | null = null;
let initInFlight = false;
let evalInFlight = false;
async function initAudio(channelMode: "mono" | "stereo"): Promise<AudioState> {
  if (audioState) return audioState;
  if (audioInitPromise) return audioInitPromise;

  audioInitPromise = (async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    const ctx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    // suspended일 수 있으니 시도(실패해도 OK)
    try {
      await ctx.resume();
    } catch {}

    const src = ctx.createMediaStreamSource(stream);

    // 분석기(파형)
    const analyserL = ctx.createAnalyser();
    analyserL.fftSize = 2048; // 내부 버퍼(출력은 numSamples로 다운샘플)
    analyserL.smoothingTimeConstant = 0.0;

    let analyserR: AnalyserNode | undefined;
    let splitter: ChannelSplitterNode | undefined;

    if (channelMode === "stereo") {
      splitter = ctx.createChannelSplitter(2);

      analyserR = ctx.createAnalyser();
      analyserR.fftSize = 2048;
      analyserR.smoothingTimeConstant = 0.0;

      src.connect(splitter);
      splitter.connect(analyserL, 0);
      splitter.connect(analyserR, 1);
    } else {
      src.connect(analyserL);
    }

    const tmpL: Float32Array<ArrayBuffer> = new Float32Array(analyserL.fftSize);
    const tmpR: Float32Array<ArrayBuffer> | undefined = analyserR
      ? new Float32Array(analyserR.fftSize)
      : undefined;

    audioState = { ctx, analyserL, analyserR, src, splitter, tmpL, tmpR };
    return audioState;
  })();

  return audioInitPromise;
}

function downsample(
  src: Float32Array<ArrayBuffer>,
  n: number,
): Float32Array<ArrayBuffer> {
  if (n <= 0) return new Float32Array(0);
  if (src.length === n) return src;
  const out = new Float32Array(n);
  const step = (src.length - 1) / Math.max(1, n - 1);

  for (let i = 0; i < n; i++) {
    const idx = i * step;
    const i0 = Math.floor(idx);
    const i1 = Math.min(src.length - 1, i0 + 1);
    const t = idx - i0;
    out[i] = src[i0] * (1 - t) + src[i1] * t;
  }
  return out;
}

export async function evalAudioIn(
  nodeId: string,
  p: AudioInParams,
): Promise<Chop> {
  const numSamples = Math.max(0, Math.floor(p.numSamples ?? 256));
  const gain = Number.isFinite(p.gain) ? (p.gain as number) : 1;
  const channelMode = p.channelMode ?? "mono";

  // 오디오 초기화
  const st = await initAudio(channelMode);

  // 컨텍스트가 suspended이면 재시도(사용자 제스처 없으면 실패할 수 있음)
  if (st.ctx.state === "suspended") {
    try {
      await st.ctx.resume();
    } catch {}
  }

  // 파형 읽기
  st.analyserL.getFloatTimeDomainData(st.tmpL);
  let l = downsample(st.tmpL, numSamples);
  for (let i = 0; i < l.length; i++) l[i] *= gain;

  if (channelMode === "stereo" && st.analyserR && st.tmpR) {
    st.analyserR.getFloatTimeDomainData(st.tmpR);
    let r = downsample(st.tmpR, numSamples);
    for (let i = 0; i < r.length; i++) r[i] *= gain;

    const out = makeChop(2, numSamples, st.ctx.sampleRate);
    out.channels[0].set(l);
    out.channels[1].set(r);
    return out;
  }

  const out = makeChop(1, numSamples, st.ctx.sampleRate);
  out.channels[0].set(l);
  return out;
}
let lastOut: Chop | null = null;

export function evalAudioInSync(nodeId: string, p: AudioInParams): Chop {
  const mode = p.channelMode ?? "mono";
  const numSamples = Math.max(0, p.numSamples | 0);
  const fallbackSr = audioState?.ctx.sampleRate ?? 60;

  // 최초 몇 프레임은 초기화 전이므로 빈 CHOP 반환
  if (!audioState) {
    // init은 중복 호출 방지
    if (!initInFlight) {
      initInFlight = true;
      initAudio(mode)
        .then(async () => {
          try {
            const out = await evalAudioIn(nodeId, p);
            lastOut = out;
          } catch {
            // ignore
          }
        })
        .finally(() => {
          initInFlight = false;
        });
    }

    return (
      lastOut ?? makeChop(mode === "stereo" ? 2 : 1, numSamples, fallbackSr)
    );
  }

  // 이미 init된 경우: 프레임마다 Promise 폭주 방지 (최신 1개만 in-flight)
  if (!evalInFlight) {
    evalInFlight = true;
    evalAudioIn(nodeId, p)
      .then((out) => {
        lastOut = out;
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        evalInFlight = false;
      });
  }

  return (
    lastOut ??
    makeChop(mode === "stereo" ? 2 : 1, numSamples, audioState.ctx.sampleRate)
  );
}
