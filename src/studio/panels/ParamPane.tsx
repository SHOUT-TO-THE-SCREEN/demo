import "./paramPane.css";
import { useStudioStore } from "../state/studioStore";
import { TopParams } from "./paramSections/TopParams";
import { ChopParams } from "./paramSections/ChopParams";
import { SopParams } from "./paramSections/SopParams";

type Props = { nodeId?: string | null };

export default function ParamPane({ nodeId }: Props) {
  const selectedFromStore = useStudioStore((s) => s.selectedNodeId);
  const effectiveId = nodeId ?? selectedFromStore;

  const kind = useStudioStore((s) =>
    effectiveId ? s.nodeKindById[effectiveId] : null,
  );
  const params = useStudioStore((s) =>
    effectiveId ? s.paramsById[effectiveId] : null,
  );
  const setParam = useStudioStore((s) => s.setParam);

  if (!effectiveId || !kind) {
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Parameters</div>
        <div className="paramPane__empty">노드를 선택하세요.</div>
      </aside>
    );
  }

  const sharedProps = { kind, id: effectiveId, params, setParam };

  return (
    <>
      <TopParams  {...sharedProps} />
      <ChopParams {...sharedProps} />
      <SopParams  {...sharedProps} />
      {/* fallback */}
      {!isKnown(kind) && (
        <aside className="paramPane">
          <div className="paramPane__title">Parameters</div>
          <div className="paramPane__empty">{kind}는 아직 미구현입니다.</div>
        </aside>
      )}
    </>
  );
}

const KNOWN_KINDS = new Set([
  "noise", "constant", "ramp", "lookup", "transform", "level",
  "hsvAdjust", "blur", "edgeDetect", "over", "add", "multiply",
  "screen", "subtract", "output", "textTop",
  "audioIn", "mouseIn", "math", "fft", "noiseCh", "lfo", "movieAudioIn", "handsChop",
  "gridSop", "sphereSop", "noiseSop", "torusSop", "mergeSop",
]);
function isKnown(kind: string) { return KNOWN_KINDS.has(kind); }
