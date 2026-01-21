import "./paramPane.css";
import { useStudioStore } from "../state/studioStore";

export default function ParamPane() {
  const selectedNodeId = useStudioStore((s) => s.selectedNodeId);
  const kind = useStudioStore((s) => (selectedNodeId ? s.nodeKindById[selectedNodeId] : null));
  const params = useStudioStore((s) => (selectedNodeId ? s.paramsById[selectedNodeId] : null));
  const setParam = useStudioStore((s) => s.setParam);

  if (!selectedNodeId || !kind) {
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Parameters</div>
        <div className="paramPane__empty">노드를 선택하세요.</div>
      </aside>
    );
  }

  if (kind !== "noise") {
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Parameters</div>
        <div className="paramPane__empty">{kind}는 아직 미구현입니다.</div>
      </aside>
    );
  }

  const p =
    params && params.kind === "noise"
      ? params
      : { kind: "noise" as const, seed: 1, scale: 18, speed: 0.8, contrast: 1.2 };

  return (
    <aside className="paramPane">
      <div className="paramPane__title">Noise TOP</div>

      <Row label="Seed">
        <input
          className="paramPane__input"
          type="number"
          value={p.seed}
          onChange={(e) => setParam(selectedNodeId, "noise", { seed: Number(e.target.value) || 0 })}
        />
      </Row>

      <Row label="Scale">
        <input
          type="range"
          min={2}
          max={80}
          step={1}
          value={p.scale}
          onChange={(e) => setParam(selectedNodeId, "noise", { scale: Number(e.target.value) })}
        />
        <span className="paramPane__value">{p.scale}</span>
      </Row>

      <Row label="Speed">
        <input
          type="range"
          min={0}
          max={3}
          step={0.01}
          value={p.speed}
          onChange={(e) => setParam(selectedNodeId, "noise", { speed: Number(e.target.value) })}
        />
        <span className="paramPane__value">{p.speed.toFixed(2)}</span>
      </Row>

      <Row label="Contrast">
        <input
          type="range"
          min={0.2}
          max={2.5}
          step={0.01}
          value={p.contrast}
          onChange={(e) => setParam(selectedNodeId, "noise", { contrast: Number(e.target.value) })}
        />
        <span className="paramPane__value">{p.contrast.toFixed(2)}</span>
      </Row>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="paramPane__row">
      <div className="paramPane__label">{label}</div>
      <div className="paramPane__control">{children}</div>
    </div>
  );
}
