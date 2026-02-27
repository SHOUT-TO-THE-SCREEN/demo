import type { Chop } from "./types";
import { makeChop } from "./types";

export type MovieAudioInParams = {
  src: string;
  gain: number;
  numSamples: number;
  loop: boolean;
};

type MovieAudioState = {
  ctx: AudioContext;
  analyser: AnalyserNode;
  el: HTMLVideoElement;
  tmp: Float32Array;
  src: string;
};

const stateMap = new Map<string, MovieAudioState>();

function buildState(nodeId: string, src: string): MovieAudioState {
  // clean up previous state for this node
  const prev = stateMap.get(nodeId);
  if (prev) {
    try {
      prev.el.pause();
      prev.el.src = "";
      prev.el.remove();
    } catch {}
    try { prev.ctx.close(); } catch {}
  }

  const ctx = new AudioContext();

  const el = document.createElement("video");
  el.src = src;
  el.loop = true;
  el.style.cssText =
    "position:fixed;width:0;height:0;opacity:0;pointer-events:none;top:-1px;left:-1px";
  document.body.appendChild(el);

  const source = ctx.createMediaElementSource(el);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;

  source.connect(analyser);
  source.connect(ctx.destination); // allow audio to play through speakers

  el.play().catch(() => {});
  ctx.resume().catch(() => {});

  const tmp = new Float32Array(analyser.fftSize);
  const st: MovieAudioState = { ctx, analyser, el, tmp, src };
  stateMap.set(nodeId, st);
  return st;
}

function downsample(src: Float32Array, n: number): Float32Array {
  if (n <= 0) return new Float32Array(0);
  if (src.length === n) return src.slice();
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

export function evalMovieAudioIn(nodeId: string, p: MovieAudioInParams): Chop {
  const n = Math.max(1, p.numSamples | 0);

  if (!p.src) return makeChop(0, 0, 60);

  let st = stateMap.get(nodeId);
  if (!st || st.src !== p.src) {
    st = buildState(nodeId, p.src);
  }

  st.el.loop = p.loop;

  if (st.ctx.state === "suspended") st.ctx.resume().catch(() => {});

  st.analyser.getFloatTimeDomainData(st.tmp);

  const raw = downsample(st.tmp, n);
  const gain = Number.isFinite(p.gain) ? p.gain : 1;

  const out = makeChop(1, n, st.ctx.sampleRate);
  for (let i = 0; i < n; i++) out.channels[0][i] = raw[i] * gain;

  return out;
}
