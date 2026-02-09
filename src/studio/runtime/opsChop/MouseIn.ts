import { type Chop, makeChop } from "./types";
import { getMouseState } from "../input/mouse";

export type MouseInParams = {
  numSamples: number;
  sampleRate: number;
  mode: "hold" | "history";
};

type History = {
  x: Float32Array;
  y: Float32Array;
  dx: Float32Array;
  dy: Float32Array;
  l: Float32Array;
  m: Float32Array;
  r: Float32Array;
  w: Float32Array;
  head: number;
};

const historyMap = new Map<string, History>();

function getHistory(nodeId: string, n: number): History {
  const prev = historyMap.get(nodeId);
  if (prev && prev.x.length === n) return prev;

  const h: History = {
    x: new Float32Array(n),
    y: new Float32Array(n),
    dx: new Float32Array(n),
    dy: new Float32Array(n),
    l: new Float32Array(n),
    m: new Float32Array(n),
    r: new Float32Array(n),
    w: new Float32Array(n),
    head: 0,
  };
  historyMap.set(nodeId, h);
  return h;
}

export function evalMouseIn(nodeId: string, p: MouseInParams): Chop {
  const n = p.numSamples;
  const sr = p.sampleRate;

  const s = getMouseState();
  const out = makeChop(8, n, sr);

  if (p.mode === "hold") {
    out.channels[0].fill(s.x);
    out.channels[1].fill(s.y);
    out.channels[2].fill(s.dx);
    out.channels[3].fill(s.dy);
    out.channels[4].fill(s.downL);
    out.channels[5].fill(s.downM);
    out.channels[6].fill(s.downR);
    out.channels[7].fill(s.wheel);
    return out;
  }

  const h = getHistory(nodeId, n);
  h.x[h.head] = s.x;
  h.y[h.head] = s.y;
  h.dx[h.head] = s.dx;
  h.dy[h.head] = s.dy;
  h.l[h.head] = s.downL;
  h.m[h.head] = s.downM;
  h.r[h.head] = s.downR;
  h.w[h.head] = s.wheel;
  h.head = (h.head + 1) % n;

  for (let i = 0; i < n; i++) {
    const idx = (h.head + i) % n;
    out.channels[0][i] = h.x[idx];
    out.channels[1][i] = h.y[idx];
    out.channels[2][i] = h.dx[idx];
    out.channels[3][i] = h.dy[idx];
    out.channels[4][i] = h.l[idx];
    out.channels[5][i] = h.m[idx];
    out.channels[6][i] = h.r[idx];
    out.channels[7][i] = h.w[idx];
  }
  return out;
}
