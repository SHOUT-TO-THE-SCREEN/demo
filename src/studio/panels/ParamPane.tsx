import "./paramPane.css";
import { useStudioStore } from "../state/studioStore";
import type { RampStop, RampParams } from "../state/studioStore";

type Props = {
  nodeId?: string | null;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const uid = () => Math.random().toString(36).slice(2);

export default function ParamPane({ nodeId }: Props) {
  const selectedFromStore = useStudioStore((s) => s.selectedNodeId);
  const effectiveId = nodeId ?? selectedFromStore;

  const kind = useStudioStore((s) => (effectiveId ? s.nodeKindById[effectiveId] : null));
  const params = useStudioStore((s) => (effectiveId ? s.paramsById[effectiveId] : null));
  const setParam = useStudioStore((s) => s.setParam);

  if (!effectiveId || !kind) {
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Parameters</div>
        <div className="paramPane__empty">노드를 선택하세요.</div>
      </aside>
    );
  }

  if (kind === "noise") {
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
            onChange={(e) => setParam(effectiveId, "noise", { seed: Number(e.target.value) || 0 })}
          />
        </Row>

        <Row label="Scale">
          <input
            type="range"
            min={2}
            max={80}
            step={1}
            value={p.scale}
            onChange={(e) => setParam(effectiveId, "noise", { scale: Number(e.target.value) })}
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
            onChange={(e) => setParam(effectiveId, "noise", { speed: Number(e.target.value) })}
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
            onChange={(e) => setParam(effectiveId, "noise", { contrast: Number(e.target.value) })}
          />
          <span className="paramPane__value">{p.contrast.toFixed(2)}</span>
        </Row>
      </aside>
    );
  }

  if (kind === "ramp") {
    const p: RampParams =
      params && params.kind === "ramp"
        ? params
        : {
            kind: "ramp",
            interpolation: "linear",
            stops: [
              { id: "a", t: 0.0, color: "#000000" },
              { id: "b", t: 0.45, color: "#ff8a00" },
              { id: "c", t: 1.0, color: "#ffffff" },
            ],
          };

    const stopsSorted = [...p.stops].sort((a, b) => a.t - b.t);
    const gradientCss = `linear-gradient(90deg, ${stopsSorted
      .map((s) => `${s.color} ${Math.round(s.t * 100)}%`)
      .join(", ")})`;

    const updateStop = (id: string, patch: Partial<RampStop>) => {
      const nextStops = p.stops.map((s) => (s.id === id ? { ...s, ...patch } : s));
      setParam(effectiveId, "ramp", { stops: nextStops });
    };

    const addStop = () => {
      const next: RampStop = { id: uid(), t: 0.5, color: "#ff8a00" };
      setParam(effectiveId, "ramp", { stops: [...p.stops, next] });
    };

    const removeStop = (id: string) => {
      if (p.stops.length <= 2) return;
      setParam(effectiveId, "ramp", { stops: p.stops.filter((s) => s.id !== id) });
    };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Ramp TOP</div>

        <div className="paramPane__rampPreview" style={{ background: gradientCss }} />
        <div className="paramPane__rampActions">
          <button className="paramPane__btn" onClick={addStop}>
            + Stop
          </button>
        </div>

        {stopsSorted.map((s) => (
          <div className="paramPane__rampRow" key={s.id}>
            <div className="paramPane__rampLabel">t</div>
            <input
              className="paramPane__rampT"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={s.t}
              onChange={(e) => updateStop(s.id, { t: clamp01(Number(e.target.value)) })}
            />
            <span className="paramPane__value">{s.t.toFixed(2)}</span>

            <input
              className="paramPane__rampColor"
              type="color"
              value={s.color}
              onChange={(e) => updateStop(s.id, { color: e.target.value })}
            />
            <button className="paramPane__iconBtn" onClick={() => removeStop(s.id)} title="Remove">
              ×
            </button>
          </div>
        ))}
      </aside>
    );
  }

  if (kind === "lookup") {
    const p = params && params.kind === "lookup" ? params : { kind: "lookup" as const, invert: false };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Lookup TOP</div>

        <Row label="Invert">
          <input
            type="checkbox"
            checked={p.invert}
            onChange={(e) => setParam(effectiveId, "lookup", { invert: e.target.checked })}
          />
        </Row>

        <div className="paramPane__hint">입력: in(Noise 등), lut(Ramp)</div>
      </aside>
    );
  }

  if (kind === "output") {
    const p = params && params.kind === "output" ? params : { kind: "output" as const, exposure: 1 };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Output TOP</div>

        <Row label="Exposure">
          <input
            type="range"
            min={0.2}
            max={3}
            step={0.01}
            value={p.exposure}
            onChange={(e) => setParam(effectiveId, "output", { exposure: Number(e.target.value) })}
          />
          <span className="paramPane__value">{p.exposure.toFixed(2)}</span>
        </Row>

        <div className="paramPane__hint">입력: in</div>
      </aside>
    );
  }

  return (
    <aside className="paramPane">
      <div className="paramPane__title">Parameters</div>
      <div className="paramPane__empty">{kind}는 아직 미구현입니다.</div>
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
