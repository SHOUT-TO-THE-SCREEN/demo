import { useState } from "react";
import { Row, type SetParamFn } from "./shared";

type Props = { kind: string; id: string; params: any; setParam: SetParamFn };

export function ChopParams({ kind, id, params, setParam }: Props) {

  // ── Audio In ──────────────────────────────────────────────────────────────
  if (kind === "audioIn") {
    const p = params?.kind === "audioIn"
      ? params
      : { kind: "audioIn" as const, numSamples: 256, gain: 1, channelMode: "mono" as const };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Audio In (CHOP)</div>
        <Row label="Channel">
          <select className="paramPane__input" value={p.channelMode}
            onChange={(e) => setParam(id, "audioIn", { channelMode: e.target.value as "mono" | "stereo" })}>
            <option value="mono">mono</option>
            <option value="stereo">stereo</option>
          </select>
        </Row>
        <Row label="Samples">
          <input type="range" min={32} max={2048} step={32} value={p.numSamples}
            onChange={(e) => setParam(id, "audioIn", { numSamples: Number(e.target.value) })} />
          <span className="paramPane__value">{p.numSamples}</span>
        </Row>
        <Row label="Gain">
          <input type="range" min={0} max={5} step={0.01} value={p.gain}
            onChange={(e) => setParam(id, "audioIn", { gain: Number(e.target.value) })} />
          <span className="paramPane__value">{p.gain.toFixed(2)}</span>
        </Row>
        <div className="paramPane__hint">입력: (마이크) / 출력: CHOP</div>
      </aside>
    );
  }

  // ── Mouse In ──────────────────────────────────────────────────────────────
  if (kind === "mouseIn") {
    const p = params?.kind === "mouseIn"
      ? params
      : { kind: "mouseIn" as const, numSamples: 256, sampleRate: 60, mode: "history" as const };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Mouse In CHOP</div>
        <Row label="Mode">
          <select className="paramPane__input" value={p.mode}
            onChange={(e) => setParam(id, "mouseIn", { mode: e.target.value as "hold" | "history" })}>
            <option value="hold">hold</option>
            <option value="history">history</option>
          </select>
        </Row>
        <Row label="Samples">
          <input type="range" min={32} max={2048} step={32} value={p.numSamples}
            onChange={(e) => setParam(id, "mouseIn", { numSamples: Number(e.target.value) })} />
          <span className="paramPane__value">{p.numSamples}</span>
        </Row>
        <Row label="Rate">
          <input className="paramPane__input" type="number" min={1} max={240} value={p.sampleRate}
            onChange={(e) => setParam(id, "mouseIn", { sampleRate: Number(e.target.value) || 60 })} />
        </Row>
        <div className="paramPane__hint">채널: x, y</div>
      </aside>
    );
  }

  // ── Math ──────────────────────────────────────────────────────────────────
  if (kind === "math") {
    const p = params?.kind === "math"
      ? params
      : { kind: "math" as const, tab: "multadd" as const, preAdd: 0, multiply: 1, postAdd: 0, fromLow: 0, fromHigh: 1, toLow: 0, toHigh: 1, clamp: false };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Math CHOP</div>
        <Row label="Tab">
          <select className="paramPane__input" value={p.tab}
            onChange={(e) => setParam(id, "math", { tab: e.target.value as "multadd" | "range" })}>
            <option value="multadd">Mult-Add</option>
            <option value="range">Range</option>
          </select>
        </Row>
        {p.tab === "multadd" ? (
          <>
            <Row label="Pre-Add">
              <input className="paramPane__input" type="number" step="any" value={p.preAdd}
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setParam(id, "math", { preAdd: v }); }} />
            </Row>
            <Row label="Multiply">
              <input className="paramPane__input" type="number" step="any" value={p.multiply}
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setParam(id, "math", { multiply: v }); }} />
            </Row>
            <Row label="Post-Add">
              <input className="paramPane__input" type="number" step="any" value={p.postAdd}
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setParam(id, "math", { postAdd: v }); }} />
            </Row>
          </>
        ) : (
          <>
            <Row label="From Low">
              <input className="paramPane__input" type="number" step="any" value={p.fromLow}
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setParam(id, "math", { fromLow: v }); }} />
            </Row>
            <Row label="From High">
              <input className="paramPane__input" type="number" step="any" value={p.fromHigh}
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setParam(id, "math", { fromHigh: v }); }} />
            </Row>
            <Row label="To Low">
              <input className="paramPane__input" type="number" step="any" value={p.toLow}
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setParam(id, "math", { toLow: v }); }} />
            </Row>
            <Row label="To High">
              <input className="paramPane__input" type="number" step="any" value={p.toHigh}
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setParam(id, "math", { toHigh: v }); }} />
            </Row>
            <Row label="Clamp">
              <input type="checkbox" checked={p.clamp}
                onChange={(e) => setParam(id, "math", { clamp: e.target.checked })} />
            </Row>
          </>
        )}
      </aside>
    );
  }

  // ── FFT ───────────────────────────────────────────────────────────────────
  if (kind === "fft") {
    const p = params?.kind === "fft"
      ? params
      : { kind: "fft" as const, smoothing: 0.85, intensity: 1 };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">FFT (CHOP)</div>
        <Row label="Smoothing">
          <input type="range" min={0} max={0.99} step={0.01} value={p.smoothing}
            onChange={(e) => setParam(id, "fft", { smoothing: Number(e.target.value) })} />
          <span className="paramPane__value">{p.smoothing.toFixed(2)}</span>
        </Row>
        <Row label="Intensity">
          <input type="range" min={0} max={3} step={0.01} value={p.intensity}
            onChange={(e) => setParam(id, "fft", { intensity: Number(e.target.value) })} />
          <span className="paramPane__value">{p.intensity.toFixed(2)}</span>
        </Row>
        <div className="paramPane__hint">입력: in</div>
      </aside>
    );
  }

  // ── Noise CHOP ────────────────────────────────────────────────────────────
  if (kind === "noiseCh") {
    const p = params?.kind === "noiseCh"
      ? params
      : { kind: "noiseCh" as const, seed: 0, period: 1, amplitude: 1, numChannels: 1, numSamples: 120 };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Noise CHOP</div>
        <Row label="Amplitude">
          <input type="range" min={0} max={5} step={0.01} value={p.amplitude}
            onChange={(e) => setParam(id, "noiseCh", { amplitude: Number(e.target.value) })} />
          <span className="paramPane__value">{p.amplitude.toFixed(2)}</span>
        </Row>
        <Row label="Period">
          <input type="range" min={0.05} max={10} step={0.05} value={p.period}
            onChange={(e) => setParam(id, "noiseCh", { period: Number(e.target.value) })} />
          <span className="paramPane__value">{p.period.toFixed(2)}s</span>
        </Row>
        <Row label="Channels">
          <input type="range" min={1} max={4} step={1} value={p.numChannels}
            onChange={(e) => setParam(id, "noiseCh", { numChannels: Number(e.target.value) })} />
          <span className="paramPane__value">{p.numChannels}</span>
        </Row>
        <Row label="Samples">
          <input type="range" min={1} max={480} step={1} value={p.numSamples}
            onChange={(e) => setParam(id, "noiseCh", { numSamples: Number(e.target.value) })} />
          <span className="paramPane__value">{p.numSamples}</span>
        </Row>
        <Row label="Seed">
          <input className="paramPane__input" type="number" min={0} max={99} value={p.seed}
            onChange={(e) => setParam(id, "noiseCh", { seed: Number(e.target.value) || 0 })} />
        </Row>
        <div className="paramPane__hint">ch0→amplitude · ch1→frequency · ch2→speed (SOP 드라이브)</div>
      </aside>
    );
  }

  // ── LFO ───────────────────────────────────────────────────────────────────
  if (kind === "lfo") {
    const p = params?.kind === "lfo"
      ? params
      : { kind: "lfo" as const, waveform: "sine" as const, frequency: 1, amplitude: 1, offset: 0, numSamples: 120 };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">LFO CHOP</div>
        <Row label="Waveform">
          <select className="paramPane__input" value={p.waveform}
            onChange={(e) => setParam(id, "lfo", { waveform: e.target.value as any })}>
            <option value="sine">sine</option>
            <option value="square">square</option>
            <option value="ramp">ramp</option>
            <option value="triangle">triangle</option>
          </select>
        </Row>
        <Row label="Frequency">
          <input type="range" min={0.01} max={20} step={0.01} value={p.frequency}
            onChange={(e) => setParam(id, "lfo", { frequency: Number(e.target.value) })} />
          <span className="paramPane__value">{p.frequency.toFixed(2)} Hz</span>
        </Row>
        <Row label="Amplitude">
          <input type="range" min={0} max={5} step={0.01} value={p.amplitude}
            onChange={(e) => setParam(id, "lfo", { amplitude: Number(e.target.value) })} />
          <span className="paramPane__value">{p.amplitude.toFixed(2)}</span>
        </Row>
        <Row label="Offset">
          <input type="range" min={-5} max={5} step={0.01} value={p.offset}
            onChange={(e) => setParam(id, "lfo", { offset: Number(e.target.value) })} />
          <span className="paramPane__value">{p.offset.toFixed(2)}</span>
        </Row>
        <Row label="Samples">
          <input type="range" min={1} max={480} step={1} value={p.numSamples}
            onChange={(e) => setParam(id, "lfo", { numSamples: Number(e.target.value) })} />
          <span className="paramPane__value">{p.numSamples}</span>
        </Row>
        <div className="paramPane__hint">ch0→amplitude · ch1→frequency · ch2→speed (SOP 드라이브)</div>
      </aside>
    );
  }

  // ── Movie Audio In ────────────────────────────────────────────────────────
  if (kind === "movieAudioIn") {
    const p = params?.kind === "movieAudioIn"
      ? params
      : { kind: "movieAudioIn" as const, src: "", gain: 1, numSamples: 256, loop: true };
    return <MovieAudioInSection id={id} p={p} setParam={setParam} />;
  }

  // ── Hands CHOP ────────────────────────────────────────────────────────────
  if (kind === "handsChop") {
    const p = params?.kind === "handsChop"
      ? params
      : { kind: "handsChop" as const, mirror: true };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">Hands CHOP</div>
        <div className="paramPane__hint" style={{ padding: "4px 0 8px", color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
          MediaPipe Hand Tracking (webcam)
        </div>
        <Row label="Mirror">
          <input type="checkbox" checked={p.mirror}
            onChange={(e) => setParam(id, "handsChop", { mirror: e.target.checked })} />
        </Row>
        <div className="paramPane__hint" style={{ paddingTop: 12, color: "rgba(255,255,255,0.45)", fontSize: 10, lineHeight: 1.6 }}>
          ch0 · 핀치 (손 펴면 0, 집으면 1) → amplitude<br />
          ch1 · 검지 높이 (올리면 1) → frequency<br />
          ch2 · 손목 기울기 (수직=0.5, 오→1, 왼→0) → speed<br />
          ch3/4 · 손목 x/y · ch5/6 · 검지끝 x/y<br />
          ch7/8 · 엄지끝 x/y · ch9 · 핀치 거리 (raw)<br />
          ch10 · 손 감지 (0/1)<br />
          ch11 · 손 벌림 (주먹=0, 완전히 펼침=1)<br />
          ch12 · 손가락 개수 (주먹=0, 5개=1.0)
        </div>
      </aside>
    );
  }

  return null;
}

// ─── Movie Audio In sub-component (needs useState for drag state) ─────────────
type MovieAudioInProps = {
  id: string;
  p: { kind: "movieAudioIn"; src: string; gain: number; numSamples: number; loop: boolean };
  setParam: SetParamFn;
};

function MovieAudioInSection({ id, p, setParam }: MovieAudioInProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/td-kind")) return;
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) return;
    if (p.src.startsWith("blob:")) { try { URL.revokeObjectURL(p.src); } catch {} }
    const url = URL.createObjectURL(file);
    setFileName(file.name);
    setParam(id, "movieAudioIn", { src: url });
  };

  const displaySrc = fileName ?? (p.src.startsWith("blob:") ? "파일 로드됨" : p.src);

  return (
    <aside className="paramPane">
      <div className="paramPane__title">Movie Audio In (CHOP)</div>
      <div
        className={`paramPane__dropZone ${dragOver ? "paramPane__dropZone--active" : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {dragOver ? "여기에 놓으세요" : displaySrc ? `▶ ${displaySrc}` : "오디오/MP4 파일을 여기에 드래그"}
      </div>
      <Row label="URL">
        <input className="paramPane__input" type="text" placeholder="/music.mp3 또는 https://…"
          value={p.src.startsWith("blob:") ? "" : p.src}
          onChange={(e) => { setFileName(null); setParam(id, "movieAudioIn", { src: e.target.value }); }} />
      </Row>
      <Row label="Gain">
        <input type="range" min={0} max={5} step={0.01} value={p.gain}
          onChange={(e) => setParam(id, "movieAudioIn", { gain: Number(e.target.value) })} />
        <span className="paramPane__value">{p.gain.toFixed(2)}</span>
      </Row>
      <Row label="Samples">
        <input type="range" min={32} max={2048} step={32} value={p.numSamples}
          onChange={(e) => setParam(id, "movieAudioIn", { numSamples: Number(e.target.value) })} />
        <span className="paramPane__value">{p.numSamples}</span>
      </Row>
      <Row label="Loop">
        <input type="checkbox" checked={p.loop}
          onChange={(e) => setParam(id, "movieAudioIn", { loop: e.target.checked })} />
      </Row>
      <div className="paramPane__hint">파일 드래그 또는 URL 입력 → fft → noiseSop</div>
    </aside>
  );
}
