import type { Chop } from "./types";
import { makeChop } from "./types";
import type { NodeParams } from "../../state/studioStore";

type MathParams = Extract<NodeParams, { kind: "math" }>;

export function evalMath(inChop: Chop, p: MathParams): Chop {
  const numCh = inChop.channels.length;
  const n = inChop.channels[0]?.length ?? 0;

  const out = makeChop(numCh, n, inChop.sampleRate);

  const fromA = p.fromLow;
  const fromB = p.fromHigh;
  const toA = p.toLow;
  const toB = p.toHigh;

  const denom = (fromB - fromA);
  const inv = denom !== 0 ? 1 / denom : 0;

  for (let c = 0; c < numCh; c++) {
    const src = inChop.channels[c];
    const dst = out.channels[c];

    for (let i = 0; i < n; i++) {
      let v = src[i];

      // Mult-Add
      v = (v + p.preAdd) * p.multiply + p.postAdd;

      // Range (tab이 range일 때만 적용하게 하면 TD 느낌)
      if (p.tab === "range") {
        let t = (v - fromA) * inv;         // 0..1
        let r = toA + (toB - toA) * t;

        if (p.clamp) {
          const lo = Math.min(toA, toB);
          const hi = Math.max(toA, toB);
          if (r < lo) r = lo;
          if (r > hi) r = hi;
        }
        v = r;
      }

      dst[i] = v;
    }
  }

  return out;
}
