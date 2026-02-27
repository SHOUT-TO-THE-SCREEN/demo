import { useStudioStore } from "../../state/studioStore";
import type { Chop } from "./types";
import { makeChop } from "./types";
import { evalMouseIn, type MouseInParams } from "./MouseIn";
import { evalAudioInSync, type AudioInParams } from "./AudioIn";
import { evalMath } from "./Math";
import { evalNoiseCh } from "./noiseCh";
import { evalLfo } from "./lfo";
import { evalFftChop } from "./fft";
import { evalMovieAudioIn } from "./movieAudioIn";
import { evalHandsChopSync } from "./handsChop";
const cache = new Map<string, Chop>();

export function beginChopFrame() {
  cache.clear();
}
type InputMap = Record<string, Record<string, string>>;

export function evalChop(nodeId: string, inputMap?: InputMap): Chop {
  const hit = cache.get(nodeId);
  if (hit) return hit;

  const s = useStudioStore.getState();

  const kind = s.nodeKindById[nodeId];
  if (!kind) {
    // kind가 없으면 빈 CHOP을 반환 (다른 노드에서 tx/ty가 보이지 않도록)
    const empty = makeChop(0, 0, 60);
    cache.set(nodeId, empty);
    return empty;
  }

  const params = s.paramsById[nodeId];
  let out: Chop;
  // CHOP bypass: 입력을 그대로 패스스루
  if (s.bypassByNodeId[nodeId]) {
    const passthruId = inputMap?.[nodeId]?.["in"] ?? inputMap?.[nodeId]?.["0"];
    if (passthruId) {
      const out = evalChop(passthruId, inputMap);
      cache.set(nodeId, out);
      return out;
    }
  }

  switch (kind) {
    case "mouseIn": {
      // store의 mouseIn params가 유니온(예: smoothing만 존재)일 수 있으므로
      // 여기서 MouseIn evaluator가 요구하는 필수 필드를 항상 채워서 전달한다.
      const raw =
        params && (params as any).kind === "mouseIn"
          ? (params as any)
          : undefined;

      const p: MouseInParams = {
        numSamples: raw?.numSamples ?? 256,
        sampleRate: raw?.sampleRate ?? 60,
        mode: raw?.mode ?? "history",
      };

      out = evalMouseIn(nodeId, p);
      break;
    }
    case "audioIn": {
      const raw =
        params && (params as any).kind === "audioIn"
          ? (params as any)
          : undefined;
      const p: AudioInParams = {
        numSamples: raw?.numSamples ?? 256,
        gain: raw?.gain ?? 1,
        channelMode: raw?.channelMode ?? "mono",
      };
      out = evalAudioInSync(nodeId, p);
      break;
    }
    case "math": {
      // 입력 노드 찾기 (handle "in" 우선)
      const inId = inputMap?.[nodeId]?.["in"] ?? inputMap?.[nodeId]?.["0"];
      if (!inId) {
        out = makeChop(0, 0, 60);
        break;
      }

      const inChop = evalChop(inId, inputMap);

      const raw =
        params && (params as any).kind === "math" ? (params as any) : undefined;

      // studioStore의 math 기본값에 맞춰 안전하게 채움
      const p = {
        kind: "math" as const,
        tab: raw?.tab ?? "multadd",
        preAdd: raw?.preAdd ?? 0,
        multiply: raw?.multiply ?? 1,
        postAdd: raw?.postAdd ?? 0,
        fromLow: raw?.fromLow ?? 0,
        fromHigh: raw?.fromHigh ?? 1,
        toLow: raw?.toLow ?? 0,
        toHigh: raw?.toHigh ?? 1,
        clamp: raw?.clamp ?? false,
      };

      out = evalMath(inChop, p as any);
      break;
    }

    case "noiseCh": {
      const raw = params?.kind === "noiseCh" ? params : undefined;
      out = evalNoiseCh({
        seed: raw?.seed ?? 0,
        period: raw?.period ?? 1,
        amplitude: raw?.amplitude ?? 1,
        numChannels: raw?.numChannels ?? 1,
        numSamples: raw?.numSamples ?? 120,
      });
      break;
    }

    case "lfo": {
      const raw = params?.kind === "lfo" ? params : undefined;
      out = evalLfo({
        waveform: raw?.waveform ?? "sine",
        frequency: raw?.frequency ?? 1,
        amplitude: raw?.amplitude ?? 1,
        offset: raw?.offset ?? 0,
        numSamples: raw?.numSamples ?? 120,
      });
      break;
    }

    case "fft": {
      const inId = inputMap?.[nodeId]?.["in"] ?? inputMap?.[nodeId]?.["0"];
      if (!inId) {
        out = makeChop(0, 0, 60);
        break;
      }
      const inChop = evalChop(inId, inputMap);
      const raw = params?.kind === "fft" ? params : undefined;
      out = evalFftChop(nodeId, inChop, raw?.smoothing ?? 0.85, raw?.intensity ?? 1);
      break;
    }

    case "movieAudioIn": {
      const raw = params?.kind === "movieAudioIn" ? params : undefined;
      out = evalMovieAudioIn(nodeId, {
        src: raw?.src ?? "",
        gain: raw?.gain ?? 1,
        numSamples: raw?.numSamples ?? 256,
        loop: raw?.loop ?? true,
      });
      break;
    }

    case "handsChop": {
      const raw = params?.kind === "handsChop" ? params : undefined;
      out = evalHandsChopSync(nodeId, {
        mirror: raw?.mirror ?? true,
      });
      break;
    }

    default: {
      // 등록되지 않은 CHOP은 빈 CHOP (프리뷰는 line 모드에서 아무것도 그리지 않음)
      out = makeChop(0, 0, 60);
      break;
    }
  }

  cache.set(nodeId, out);
  return out;
}
