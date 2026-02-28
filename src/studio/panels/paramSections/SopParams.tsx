import { Row, type SetParamFn } from "./shared";

type Props = { kind: string; id: string; params: any; setParam: SetParamFn };

export function SopParams({ kind, id, params, setParam }: Props) {

  // ── Grid SOP ──────────────────────────────────────────────────────────────
  if (kind === "gridSop") {
    const p = params?.kind === "gridSop"
      ? params
      : { kind: "gridSop" as const, width: 2.0, height: 2.0, rows: 20, cols: 20, color: "#b4dcca", colorShadow: "#0d2318" };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Grid SOP</div>
        <Row label="Width">
          <input type="range" min={0.1} max={5} step={0.1} value={p.width}
            onChange={(e) => setParam(id, "gridSop", { width: Number(e.target.value) })} />
          <span className="paramPane__value">{p.width.toFixed(1)}</span>
        </Row>
        <Row label="Height">
          <input type="range" min={0.1} max={5} step={0.1} value={p.height}
            onChange={(e) => setParam(id, "gridSop", { height: Number(e.target.value) })} />
          <span className="paramPane__value">{p.height.toFixed(1)}</span>
        </Row>
        <Row label="Rows">
          <input type="range" min={2} max={80} step={1} value={p.rows}
            onChange={(e) => setParam(id, "gridSop", { rows: Number(e.target.value) })} />
          <span className="paramPane__value">{p.rows}</span>
        </Row>
        <Row label="Cols">
          <input type="range" min={2} max={80} step={1} value={p.cols}
            onChange={(e) => setParam(id, "gridSop", { cols: Number(e.target.value) })} />
          <span className="paramPane__value">{p.cols}</span>
        </Row>
        <Row label="Highlight">
          <input type="color" value={p.color}
            onChange={(e) => setParam(id, "gridSop", { color: e.target.value })} />
        </Row>
        <Row label="Shadow">
          <input type="color" value={p.colorShadow}
            onChange={(e) => setParam(id, "gridSop", { colorShadow: e.target.value })} />
        </Row>
        <div className="paramPane__hint">gridSop → noiseSop: 파도/지형 효과</div>
      </aside>
    );
  }

  // ── Sphere SOP ────────────────────────────────────────────────────────────
  if (kind === "sphereSop") {
    const p = params?.kind === "sphereSop"
      ? params
      : { kind: "sphereSop" as const, radius: 1.0, rows: 20, cols: 20, color: "#dcdce1", colorShadow: "#14142a" };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Sphere SOP</div>
        <Row label="Radius">
          <input type="range" min={0.1} max={3} step={0.01} value={p.radius}
            onChange={(e) => setParam(id, "sphereSop", { radius: Number(e.target.value) })} />
          <span className="paramPane__value">{p.radius.toFixed(2)}</span>
        </Row>
        <Row label="Rows">
          <input type="range" min={3} max={60} step={1} value={p.rows}
            onChange={(e) => setParam(id, "sphereSop", { rows: Number(e.target.value) })} />
          <span className="paramPane__value">{p.rows}</span>
        </Row>
        <Row label="Cols">
          <input type="range" min={3} max={60} step={1} value={p.cols}
            onChange={(e) => setParam(id, "sphereSop", { cols: Number(e.target.value) })} />
          <span className="paramPane__value">{p.cols}</span>
        </Row>
        <Row label="Highlight">
          <input type="color" value={p.color}
            onChange={(e) => setParam(id, "sphereSop", { color: e.target.value })} />
        </Row>
        <Row label="Shadow">
          <input type="color" value={p.colorShadow}
            onChange={(e) => setParam(id, "sphereSop", { colorShadow: e.target.value })} />
        </Row>
      </aside>
    );
  }

  // ── Noise SOP ────────────────────────────────────────────────────────────
  if (kind === "noiseSop") {
    const p = params?.kind === "noiseSop"
      ? params
      : { kind: "noiseSop" as const, amplitude: 0.3, frequency: 2.5, speed: 0.5, seed: 0, color: "#c8d7e6", colorShadow: "#0d1a2e" };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Noise SOP</div>
        <Row label="Amplitude">
          <input type="range" min={0} max={2} step={0.01} value={p.amplitude}
            onChange={(e) => setParam(id, "noiseSop", { amplitude: Number(e.target.value) })} />
          <span className="paramPane__value">{p.amplitude.toFixed(2)}</span>
        </Row>
        <Row label="Frequency">
          <input type="range" min={0.1} max={10} step={0.1} value={p.frequency}
            onChange={(e) => setParam(id, "noiseSop", { frequency: Number(e.target.value) })} />
          <span className="paramPane__value">{p.frequency.toFixed(1)}</span>
        </Row>
        <Row label="Speed">
          <input type="range" min={0} max={3} step={0.01} value={p.speed}
            onChange={(e) => setParam(id, "noiseSop", { speed: Number(e.target.value) })} />
          <span className="paramPane__value">{p.speed.toFixed(2)}</span>
        </Row>
        <Row label="Seed">
          <input className="paramPane__input" type="number" min={0} max={99} value={p.seed}
            onChange={(e) => setParam(id, "noiseSop", { seed: Number(e.target.value) || 0 })} />
        </Row>
        <Row label="Highlight">
          <input type="color" value={p.color}
            onChange={(e) => setParam(id, "noiseSop", { color: e.target.value })} />
        </Row>
        <Row label="Shadow">
          <input type="color" value={p.colorShadow}
            onChange={(e) => setParam(id, "noiseSop", { colorShadow: e.target.value })} />
        </Row>
        <div className="paramPane__hint">입력: in (Sphere SOP) · CHOP drive (파란 핸들): ch0→amplitude · ch1→frequency · ch2→speed<br/>lfo/noiseCh/fft/mouseIn 연결 가능</div>
      </aside>
    );
  }

  // ── Torus SOP ────────────────────────────────────────────────────────────
  if (kind === "torusSop") {
    const p = params?.kind === "torusSop"
      ? params
      : { kind: "torusSop" as const, radiusMajor: 1.0, radiusMinor: 0.35, rows: 24, cols: 24, color: "#e6d0c8", colorShadow: "#1a0d0a" };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Torus SOP</div>
        <Row label="Major R">
          <input type="range" min={0.1} max={3} step={0.01} value={p.radiusMajor}
            onChange={(e) => setParam(id, "torusSop", { radiusMajor: Number(e.target.value) })} />
          <span className="paramPane__value">{p.radiusMajor.toFixed(2)}</span>
        </Row>
        <Row label="Minor R">
          <input type="range" min={0.05} max={1.5} step={0.01} value={p.radiusMinor}
            onChange={(e) => setParam(id, "torusSop", { radiusMinor: Number(e.target.value) })} />
          <span className="paramPane__value">{p.radiusMinor.toFixed(2)}</span>
        </Row>
        <Row label="Rows">
          <input type="range" min={3} max={60} step={1} value={p.rows}
            onChange={(e) => setParam(id, "torusSop", { rows: Number(e.target.value) })} />
          <span className="paramPane__value">{p.rows}</span>
        </Row>
        <Row label="Cols">
          <input type="range" min={3} max={60} step={1} value={p.cols}
            onChange={(e) => setParam(id, "torusSop", { cols: Number(e.target.value) })} />
          <span className="paramPane__value">{p.cols}</span>
        </Row>
        <Row label="Highlight">
          <input type="color" value={p.color}
            onChange={(e) => setParam(id, "torusSop", { color: e.target.value })} />
        </Row>
        <Row label="Shadow">
          <input type="color" value={p.colorShadow}
            onChange={(e) => setParam(id, "torusSop", { colorShadow: e.target.value })} />
        </Row>
        <div className="paramPane__hint">Major R: 링 반지름 · Minor R: 튜브 두께</div>
      </aside>
    );
  }

  // ── Merge SOP ────────────────────────────────────────────────────────────
  if (kind === "mergeSop") {
    const p = params?.kind === "mergeSop"
      ? params
      : { kind: "mergeSop" as const, color: "#dcdce1", colorShadow: "#14142a" };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Merge SOP</div>
        <Row label="Highlight">
          <input type="color" value={p.color}
            onChange={(e) => setParam(id, "mergeSop", { color: e.target.value })} />
        </Row>
        <Row label="Shadow">
          <input type="color" value={p.colorShadow}
            onChange={(e) => setParam(id, "mergeSop", { colorShadow: e.target.value })} />
        </Row>
        <div className="paramPane__hint">in (위쪽 핸들) + in1 (아래쪽 핸들) → 두 SOP 합치기</div>
      </aside>
    );
  }

  return null;
}
