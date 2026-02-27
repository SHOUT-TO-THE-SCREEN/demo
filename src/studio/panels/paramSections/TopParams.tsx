import type { RampStop, RampParams } from "../../state/studioStore";
import { Row, clamp01, uid, type SetParamFn } from "./shared";

type Props = { kind: string; id: string; params: any; setParam: SetParamFn };

export function TopParams({ kind, id, params, setParam }: Props) {

  // ── Noise ────────────────────────────────────────────────────────────────
  if (kind === "noise") {
    const p = params?.kind === "noise"
      ? params
      : { kind: "noise" as const, seed: 1, scale: 18, speed: 0.8, contrast: 1.2 };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Noise TOP</div>
        <Row label="Seed">
          <input className="paramPane__input" type="number" value={p.seed}
            onChange={(e) => setParam(id, "noise", { seed: Number(e.target.value) || 0 })} />
        </Row>
        <Row label="Scale">
          <input type="range" min={2} max={80} step={1} value={p.scale}
            onChange={(e) => setParam(id, "noise", { scale: Number(e.target.value) })} />
          <span className="paramPane__value">{p.scale}</span>
        </Row>
        <Row label="Speed">
          <input type="range" min={0} max={3} step={0.01} value={p.speed}
            onChange={(e) => setParam(id, "noise", { speed: Number(e.target.value) })} />
          <span className="paramPane__value">{p.speed.toFixed(2)}</span>
        </Row>
        <Row label="Contrast">
          <input type="range" min={0.2} max={2.5} step={0.01} value={p.contrast}
            onChange={(e) => setParam(id, "noise", { contrast: Number(e.target.value) })} />
          <span className="paramPane__value">{p.contrast.toFixed(2)}</span>
        </Row>
      </aside>
    );
  }

  // ── Constant ─────────────────────────────────────────────────────────────
  if (kind === "constant") {
    const p = params?.kind === "constant" ? params : { kind: "constant" as const, color: "#000000" };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Constant TOP</div>
        <Row label="Color">
          <input type="color" value={p.color}
            onChange={(e) => setParam(id, "constant", { color: e.target.value })} />
        </Row>
      </aside>
    );
  }

  // ── Ramp ─────────────────────────────────────────────────────────────────
  if (kind === "ramp") {
    const p: RampParams = params?.kind === "ramp"
      ? params
      : { kind: "ramp", interpolation: "linear", stops: [
          { id: "a", t: 0.0, color: "#000000" },
          { id: "b", t: 0.45, color: "#ff8a00" },
          { id: "c", t: 1.0, color: "#ffffff" },
        ]};
    const stopsSorted = [...p.stops].sort((a, b) => a.t - b.t);
    const gradientCss = `linear-gradient(90deg, ${stopsSorted.map((s) => `${s.color} ${Math.round(s.t * 100)}%`).join(", ")})`;
    const updateStop = (stopId: string, patch: Partial<RampStop>) =>
      setParam(id, "ramp", { stops: p.stops.map((s) => s.id === stopId ? { ...s, ...patch } : s) });
    const addStop = () =>
      setParam(id, "ramp", { stops: [...p.stops, { id: uid(), t: 0.5, color: "#ff8a00" }] });
    const removeStop = (stopId: string) => {
      if (p.stops.length <= 2) return;
      setParam(id, "ramp", { stops: p.stops.filter((s) => s.id !== stopId) });
    };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Ramp TOP</div>
        <Row label="Interpolation">
          <select className="paramPane__input" value={p.interpolation}
            onChange={(e) => setParam(id, "ramp", { interpolation: e.target.value as any })}>
            <option value="linear">linear</option>
            <option value="smoothstep">smoothstep</option>
          </select>
        </Row>
        <div className="paramPane__rampPreview" style={{ background: gradientCss }} />
        <div className="paramPane__rampActions">
          <button className="paramPane__btn" onClick={addStop}>+ Stop</button>
        </div>
        {stopsSorted.map((s) => (
          <div className="paramPane__rampRow" key={s.id}>
            <div className="paramPane__rampLabel">t</div>
            <input className="paramPane__rampT" type="range" min={0} max={1} step={0.01} value={s.t}
              onChange={(e) => updateStop(s.id, { t: clamp01(Number(e.target.value)) })} />
            <span className="paramPane__value">{s.t.toFixed(2)}</span>
            <input className="paramPane__rampColor" type="color" value={s.color}
              onChange={(e) => updateStop(s.id, { color: e.target.value })} />
            <button className="paramPane__iconBtn" onClick={() => removeStop(s.id)} title="Remove">×</button>
          </div>
        ))}
      </aside>
    );
  }

  // ── Lookup ────────────────────────────────────────────────────────────────
  if (kind === "lookup") {
    const p = params?.kind === "lookup" ? params : { kind: "lookup" as const, invert: false };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Lookup TOP</div>
        <Row label="Invert">
          <input type="checkbox" checked={p.invert}
            onChange={(e) => setParam(id, "lookup", { invert: e.target.checked })} />
        </Row>
        <div className="paramPane__hint">입력: in(Noise 등), lut(Ramp)</div>
      </aside>
    );
  }

  // ── Transform ────────────────────────────────────────────────────────────
  if (kind === "transform") {
    const p = params?.kind === "transform"
      ? params
      : { kind: "transform" as const, tx: 0, ty: 0, rotate: 0, scale: 1 };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Transform TOP</div>
        <Row label="Tx">
          <input type="range" min={-400} max={400} step={1} value={p.tx}
            onChange={(e) => setParam(id, "transform", { tx: Number(e.target.value) })} />
          <span className="paramPane__value">{p.tx}</span>
        </Row>
        <Row label="Ty">
          <input type="range" min={-400} max={400} step={1} value={p.ty}
            onChange={(e) => setParam(id, "transform", { ty: Number(e.target.value) })} />
          <span className="paramPane__value">{p.ty}</span>
        </Row>
        <Row label="Rotate">
          <input type="range" min={-180} max={180} step={1} value={p.rotate}
            onChange={(e) => setParam(id, "transform", { rotate: Number(e.target.value) })} />
          <span className="paramPane__value">{p.rotate}°</span>
        </Row>
        <Row label="Scale">
          <input type="range" min={0.1} max={3} step={0.01} value={p.scale}
            onChange={(e) => setParam(id, "transform", { scale: Number(e.target.value) })} />
          <span className="paramPane__value">{p.scale.toFixed(2)}</span>
        </Row>
        <div className="paramPane__hint">CHOP drive (파란 핸들): ch0(0~1)→tx · ch1(0~1)→ty<br/>mouseIn → transform: 마우스가 전체 화면 범위로 이미지를 이동</div>
      </aside>
    );
  }

  // ── Level ────────────────────────────────────────────────────────────────
  if (kind === "level") {
    const p = params?.kind === "level"
      ? params
      : { kind: "level" as const, brightness: 0, contrast: 1, gamma: 1 };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Level TOP</div>
        <Row label="Brightness">
          <input type="range" min={-1} max={1} step={0.01} value={p.brightness}
            onChange={(e) => setParam(id, "level", { brightness: Number(e.target.value) })} />
          <span className="paramPane__value">{p.brightness.toFixed(2)}</span>
        </Row>
        <Row label="Contrast">
          <input type="range" min={0} max={3} step={0.01} value={p.contrast}
            onChange={(e) => setParam(id, "level", { contrast: Number(e.target.value) })} />
          <span className="paramPane__value">{p.contrast.toFixed(2)}</span>
        </Row>
        <Row label="Gamma">
          <input type="range" min={0.1} max={5} step={0.01} value={p.gamma}
            onChange={(e) => setParam(id, "level", { gamma: Number(e.target.value) })} />
          <span className="paramPane__value">{p.gamma.toFixed(2)}</span>
        </Row>
      </aside>
    );
  }

  // ── HSV Adjust ────────────────────────────────────────────────────────────
  if (kind === "hsvAdjust") {
    const p = params?.kind === "hsvAdjust"
      ? params
      : { kind: "hsvAdjust" as const, hue: 0, saturation: 1, value: 1 };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">HSV Adjust TOP</div>
        <Row label="Hue">
          <input type="range" min={-180} max={180} step={1} value={p.hue}
            onChange={(e) => setParam(id, "hsvAdjust", { hue: Number(e.target.value) })} />
          <span className="paramPane__value">{p.hue}°</span>
        </Row>
        <Row label="Saturation">
          <input type="range" min={0} max={3} step={0.01} value={p.saturation}
            onChange={(e) => setParam(id, "hsvAdjust", { saturation: Number(e.target.value) })} />
          <span className="paramPane__value">{p.saturation.toFixed(2)}</span>
        </Row>
        <Row label="Value">
          <input type="range" min={0} max={3} step={0.01} value={p.value}
            onChange={(e) => setParam(id, "hsvAdjust", { value: Number(e.target.value) })} />
          <span className="paramPane__value">{p.value.toFixed(2)}</span>
        </Row>
      </aside>
    );
  }

  // ── Blur ─────────────────────────────────────────────────────────────────
  if (kind === "blur") {
    const p = params?.kind === "blur"
      ? params
      : { kind: "blur" as const, mode: "gaussian", radius: 4 };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Blur TOP</div>
        <Row label="Mode">
          <select className="paramPane__input" value={p.mode}
            onChange={(e) => setParam(id, "blur", { mode: e.target.value as any })}>
            <option value="gaussian">gaussian</option>
            <option value="box">box</option>
          </select>
        </Row>
        <Row label="Radius">
          <input type="range" min={0} max={30} step={1} value={p.radius}
            onChange={(e) => setParam(id, "blur", { radius: Number(e.target.value) })} />
          <span className="paramPane__value">{p.radius}</span>
        </Row>
      </aside>
    );
  }

  // ── Edge Detect ───────────────────────────────────────────────────────────
  if (kind === "edgeDetect") {
    const p = params?.kind === "edgeDetect"
      ? params
      : { kind: "edgeDetect" as const, threshold: 0, invert: false };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Edge Detect TOP</div>
        <Row label="Threshold">
          <input type="range" min={0} max={255} step={1} value={p.threshold}
            onChange={(e) => setParam(id, "edgeDetect", { threshold: Number(e.target.value) })} />
          <span className="paramPane__value">{p.threshold}</span>
        </Row>
        <Row label="Invert">
          <input type="checkbox" checked={p.invert}
            onChange={(e) => setParam(id, "edgeDetect", { invert: e.target.checked })} />
        </Row>
      </aside>
    );
  }

  // ── Composite ─────────────────────────────────────────────────────────────
  if (kind === "over" || kind === "add" || kind === "multiply" || kind === "screen" || kind === "subtract") {
    const p = params?.kind === kind ? params : ({ kind: kind as any, opacity: 1 } as any);
    return (
      <aside className="paramPane">
        <div className="paramPane__title">{kind.toUpperCase()} (Composite)</div>
        <Row label="Opacity">
          <input type="range" min={0} max={1} step={0.01} value={p.opacity}
            onChange={(e) => setParam(id, kind as any, { opacity: Number(e.target.value) } as any)} />
          <span className="paramPane__value">{Number(p.opacity).toFixed(2)}</span>
        </Row>
        <div className="paramPane__hint">입력: a / b</div>
      </aside>
    );
  }

  // ── Output ────────────────────────────────────────────────────────────────
  if (kind === "output") {
    const p = params?.kind === "output" ? params : { kind: "output" as const, exposure: 1 };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Output TOP</div>
        <Row label="Exposure">
          <input type="range" min={0.2} max={3} step={0.01} value={p.exposure}
            onChange={(e) => setParam(id, "output", { exposure: Number(e.target.value) })} />
          <span className="paramPane__value">{p.exposure.toFixed(2)}</span>
        </Row>
        <div className="paramPane__hint">입력: in</div>
      </aside>
    );
  }

  // ── Text TOP ──────────────────────────────────────────────────────────────
  if (kind === "textTop") {
    const p = params?.kind === "textTop"
      ? params
      : { kind: "textTop" as const, text: "Hello", fontSize: 48, fontFamily: "sans-serif", color: "#ffffff", align: "center" as const, bold: false, italic: false, posX: 0.5, posY: 0.5 };
    const selStyle = { background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 6, padding: "2px 6px", fontSize: 12 };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Text TOP</div>
        <Row label="Text">
          <textarea rows={3}
            style={{ width: "100%", resize: "vertical", background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 6, padding: "4px 6px", fontSize: 12, fontFamily: "inherit" }}
            value={p.text}
            onChange={(e) => setParam(id, "textTop", { text: e.target.value })} />
        </Row>
        <Row label="Font Size">
          <input type="range" min={8} max={200} step={1} value={p.fontSize}
            onChange={(e) => setParam(id, "textTop", { fontSize: Number(e.target.value) })} />
          <span className="paramPane__value">{p.fontSize}px</span>
        </Row>
        <Row label="Font">
          <select style={selStyle} value={p.fontFamily}
            onChange={(e) => setParam(id, "textTop", { fontFamily: e.target.value })}>
            <option value="sans-serif">Sans-serif</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
            <option value="Georgia">Georgia</option>
            <option value="Impact">Impact</option>
          </select>
        </Row>
        <Row label="Align">
          <select style={selStyle} value={p.align}
            onChange={(e) => setParam(id, "textTop", { align: e.target.value as "left" | "center" | "right" })}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </Row>
        <Row label="Bold">
          <input type="checkbox" checked={p.bold}
            onChange={(e) => setParam(id, "textTop", { bold: e.target.checked })} />
        </Row>
        <Row label="Italic">
          <input type="checkbox" checked={p.italic}
            onChange={(e) => setParam(id, "textTop", { italic: e.target.checked })} />
        </Row>
        <Row label="Color">
          <input type="color" value={p.color}
            onChange={(e) => setParam(id, "textTop", { color: e.target.value })} />
          <span className="paramPane__value">{p.color}</span>
        </Row>
        <Row label="Pos X">
          <input type="range" min={0} max={1} step={0.01} value={p.posX}
            onChange={(e) => setParam(id, "textTop", { posX: Number(e.target.value) })} />
          <span className="paramPane__value">{p.posX.toFixed(2)}</span>
        </Row>
        <Row label="Pos Y">
          <input type="range" min={0} max={1} step={0.01} value={p.posY}
            onChange={(e) => setParam(id, "textTop", { posY: Number(e.target.value) })} />
          <span className="paramPane__value">{p.posY.toFixed(2)}</span>
        </Row>
      </aside>
    );
  }

  return null;
}
