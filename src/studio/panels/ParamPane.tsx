import "./paramPane.css";
import { useStudioStore } from "../state/studioStore";
import type { RampStop, RampParams, NodeKind } from "../state/studioStore";

type Props = {
  nodeId?: string | null;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const uid = () => Math.random().toString(36).slice(2);

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

  // ===== NOISE =====
  if (kind === "noise") {
    const p =
      params && params.kind === "noise"
        ? params
        : {
            kind: "noise" as const,
            seed: 1,
            scale: 18,
            speed: 0.8,
            contrast: 1.2,
          };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Noise TOP</div>

        <Row label="Seed">
          <input
            className="paramPane__input"
            type="number"
            value={p.seed}
            onChange={(e) =>
              setParam(effectiveId, "noise", {
                seed: Number(e.target.value) || 0,
              })
            }
          />
        </Row>

        <Row label="Scale">
          <input
            type="range"
            min={2}
            max={80}
            step={1}
            value={p.scale}
            onChange={(e) =>
              setParam(effectiveId, "noise", { scale: Number(e.target.value) })
            }
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
            onChange={(e) =>
              setParam(effectiveId, "noise", { speed: Number(e.target.value) })
            }
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
            onChange={(e) =>
              setParam(effectiveId, "noise", {
                contrast: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.contrast.toFixed(2)}</span>
        </Row>
      </aside>
    );
  }

  // ===== CONSTANT =====
  if (kind === "constant") {
    const p =
      params && params.kind === "constant"
        ? params
        : { kind: "constant" as const, color: "#000000" };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Constant TOP</div>

        <Row label="Color">
          <input
            type="color"
            value={p.color}
            onChange={(e) =>
              setParam(effectiveId, "constant", { color: e.target.value })
            }
          />
        </Row>
      </aside>
    );
  }

  // ===== RAMP =====
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
      const nextStops = p.stops.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      );
      setParam(effectiveId, "ramp", { stops: nextStops });
    };

    const addStop = () => {
      const next: RampStop = { id: uid(), t: 0.5, color: "#ff8a00" };
      setParam(effectiveId, "ramp", { stops: [...p.stops, next] });
    };

    const removeStop = (id: string) => {
      if (p.stops.length <= 2) return;
      setParam(effectiveId, "ramp", {
        stops: p.stops.filter((s) => s.id !== id),
      });
    };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Ramp TOP</div>

        <Row label="Interpolation">
          <select
            className="paramPane__input"
            value={p.interpolation}
            onChange={(e) =>
              setParam(effectiveId, "ramp", {
                interpolation: e.target.value as any,
              })
            }
          >
            <option value="linear">linear</option>
            <option value="smoothstep">smoothstep</option>
          </select>
        </Row>

        <div
          className="paramPane__rampPreview"
          style={{ background: gradientCss }}
        />
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
              onChange={(e) =>
                updateStop(s.id, { t: clamp01(Number(e.target.value)) })
              }
            />
            <span className="paramPane__value">{s.t.toFixed(2)}</span>

            <input
              className="paramPane__rampColor"
              type="color"
              value={s.color}
              onChange={(e) => updateStop(s.id, { color: e.target.value })}
            />
            <button
              className="paramPane__iconBtn"
              onClick={() => removeStop(s.id)}
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </aside>
    );
  }

  // ===== LOOKUP =====
  if (kind === "lookup") {
    const p =
      params && params.kind === "lookup"
        ? params
        : { kind: "lookup" as const, invert: false };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Lookup TOP</div>

        <Row label="Invert">
          <input
            type="checkbox"
            checked={p.invert}
            onChange={(e) =>
              setParam(effectiveId, "lookup", { invert: e.target.checked })
            }
          />
        </Row>

        <div className="paramPane__hint">입력: in(Noise 등), lut(Ramp)</div>
      </aside>
    );
  }

  // ===== TRANSFORM =====
  if (kind === "transform") {
    const p =
      params && params.kind === "transform"
        ? params
        : { kind: "transform" as const, tx: 0, ty: 0, rotate: 0, scale: 1 };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Transform TOP</div>

        <Row label="Tx">
          <input
            type="range"
            min={-400}
            max={400}
            step={1}
            value={p.tx}
            onChange={(e) =>
              setParam(effectiveId, "transform", { tx: Number(e.target.value) })
            }
          />
          <span className="paramPane__value">{p.tx}</span>
        </Row>

        <Row label="Ty">
          <input
            type="range"
            min={-400}
            max={400}
            step={1}
            value={p.ty}
            onChange={(e) =>
              setParam(effectiveId, "transform", { ty: Number(e.target.value) })
            }
          />
          <span className="paramPane__value">{p.ty}</span>
        </Row>

        <Row label="Rotate">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={p.rotate}
            onChange={(e) =>
              setParam(effectiveId, "transform", {
                rotate: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.rotate}°</span>
        </Row>

        <Row label="Scale">
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.01}
            value={p.scale}
            onChange={(e) =>
              setParam(effectiveId, "transform", {
                scale: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.scale.toFixed(2)}</span>
        </Row>
      </aside>
    );
  }

  // ===== LEVEL =====
  if (kind === "level") {
    const p =
      params && params.kind === "level"
        ? params
        : { kind: "level" as const, brightness: 0, contrast: 1, gamma: 1 };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Level TOP</div>

        <Row label="Brightness">
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={p.brightness}
            onChange={(e) =>
              setParam(effectiveId, "level", {
                brightness: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.brightness.toFixed(2)}</span>
        </Row>

        <Row label="Contrast">
          <input
            type="range"
            min={0}
            max={3}
            step={0.01}
            value={p.contrast}
            onChange={(e) =>
              setParam(effectiveId, "level", {
                contrast: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.contrast.toFixed(2)}</span>
        </Row>

        <Row label="Gamma">
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.01}
            value={p.gamma}
            onChange={(e) =>
              setParam(effectiveId, "level", { gamma: Number(e.target.value) })
            }
          />
          <span className="paramPane__value">{p.gamma.toFixed(2)}</span>
        </Row>
      </aside>
    );
  }

  // ===== HSV ADJUST =====
  if (kind === "hsvAdjust") {
    const p =
      params && params.kind === "hsvAdjust"
        ? params
        : { kind: "hsvAdjust" as const, hue: 0, saturation: 1, value: 1 };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">HSV Adjust TOP</div>

        <Row label="Hue">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={p.hue}
            onChange={(e) =>
              setParam(effectiveId, "hsvAdjust", {
                hue: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.hue}°</span>
        </Row>

        <Row label="Saturation">
          <input
            type="range"
            min={0}
            max={3}
            step={0.01}
            value={p.saturation}
            onChange={(e) =>
              setParam(effectiveId, "hsvAdjust", {
                saturation: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.saturation.toFixed(2)}</span>
        </Row>

        <Row label="Value">
          <input
            type="range"
            min={0}
            max={3}
            step={0.01}
            value={p.value}
            onChange={(e) =>
              setParam(effectiveId, "hsvAdjust", {
                value: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.value.toFixed(2)}</span>
        </Row>
      </aside>
    );
  }

  // ===== BLUR =====
  if (kind === "blur") {
    const p =
      params && params.kind === "blur"
        ? params
        : { kind: "blur" as const, mode: "gaussian", radius: 4 };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Blur TOP</div>

        <Row label="Mode">
          <select
            className="paramPane__input"
            value={p.mode}
            onChange={(e) =>
              setParam(effectiveId, "blur", { mode: e.target.value as any })
            }
          >
            <option value="gaussian">gaussian</option>
            <option value="box">box</option>
          </select>
        </Row>

        <Row label="Radius">
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={p.radius}
            onChange={(e) =>
              setParam(effectiveId, "blur", { radius: Number(e.target.value) })
            }
          />
          <span className="paramPane__value">{p.radius}</span>
        </Row>
      </aside>
    );
  }

  // ===== EDGE DETECT =====
  if (kind === "edgeDetect") {
    const p =
      params && params.kind === "edgeDetect"
        ? params
        : { kind: "edgeDetect" as const, threshold: 0, invert: false };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Edge Detect TOP</div>

        <Row label="Threshold">
          <input
            type="range"
            min={0}
            max={255}
            step={1}
            value={p.threshold}
            onChange={(e) =>
              setParam(effectiveId, "edgeDetect", {
                threshold: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.threshold}</span>
        </Row>

        <Row label="Invert">
          <input
            type="checkbox"
            checked={p.invert}
            onChange={(e) =>
              setParam(effectiveId, "edgeDetect", { invert: e.target.checked })
            }
          />
        </Row>
      </aside>
    );
  }

  // ===== COMPOSITE OPS =====
  if (
    kind === "over" ||
    kind === "add" ||
    kind === "multiply" ||
    kind === "screen" ||
    kind === "subtract"
  ) {
    const p =
      params && params.kind === kind
        ? params
        : ({ kind: kind as any, opacity: 1 } as any);

    return (
      <aside className="paramPane">
        <div className="paramPane__title">{kind.toUpperCase()} (Composite)</div>

        <Row label="Opacity">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={p.opacity}
            onChange={(e) =>
              setParam(
                effectiveId,
                kind as any,
                { opacity: Number(e.target.value) } as any,
              )
            }
          />
          <span className="paramPane__value">
            {Number(p.opacity).toFixed(2)}
          </span>
        </Row>

        <div className="paramPane__hint">입력: a / b</div>
      </aside>
    );
  }

  // ===== OUTPUT =====
  if (kind === "output") {
    const p =
      params && params.kind === "output"
        ? params
        : { kind: "output" as const, exposure: 1 };

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
            onChange={(e) =>
              setParam(effectiveId, "output", {
                exposure: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.exposure.toFixed(2)}</span>
        </Row>

        <div className="paramPane__hint">입력: in</div>
      </aside>
    );
  }

  // ===== CHOP (간단 표시만) =====
  // ===== CHOP (간단 표시만) =====
  if (kind === "audioIn") {
    const p =
      params && params.kind === "audioIn"
        ? params
        : {
            kind: "audioIn" as const,
            numSamples: 256,
            gain: 1,
            channelMode: "mono" as const,
          };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Audio In (CHOP)</div>

        <Row label="Channel">
          <select
            className="paramPane__input"
            value={p.channelMode}
            onChange={(e) =>
              setParam(effectiveId, "audioIn", {
                channelMode: e.target.value as "mono" | "stereo",
              })
            }
          >
            <option value="mono">mono</option>
            <option value="stereo">stereo</option>
          </select>
        </Row>

        <Row label="Samples">
          <input
            type="range"
            min={32}
            max={2048}
            step={32}
            value={p.numSamples}
            onChange={(e) =>
              setParam(effectiveId, "audioIn", {
                numSamples: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.numSamples}</span>
        </Row>

        <Row label="Gain">
          <input
            type="range"
            min={0}
            max={5}
            step={0.01}
            value={p.gain}
            onChange={(e) =>
              setParam(effectiveId, "audioIn", { gain: Number(e.target.value) })
            }
          />
          <span className="paramPane__value">{p.gain.toFixed(2)}</span>
        </Row>

        <div className="paramPane__hint">입력: (마이크) / 출력: CHOP</div>
      </aside>
    );
  }
  // ✅ Mouse In CHOP (추가)
  if (kind === "mouseIn") {
    const p =
      params && params.kind === "mouseIn"
        ? params
        : {
            kind: "mouseIn" as const,
            numSamples: 256,
            sampleRate: 60,
            mode: "history" as const,
          };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Mouse In CHOP</div>

        <Row label="Mode">
          <select
            className="paramPane__input"
            value={p.mode}
            onChange={(e) =>
              setParam(effectiveId, "mouseIn", {
                mode: e.target.value as "hold" | "history",
              })
            }
          >
            <option value="hold">hold</option>
            <option value="history">history</option>
          </select>
        </Row>

        <Row label="Samples">
          <input
            type="range"
            min={32}
            max={2048}
            step={32}
            value={p.numSamples}
            onChange={(e) =>
              setParam(effectiveId, "mouseIn", {
                numSamples: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.numSamples}</span>
        </Row>

        <Row label="Rate">
          <input
            className="paramPane__input"
            type="number"
            min={1}
            max={240}
            value={p.sampleRate}
            onChange={(e) =>
              setParam(effectiveId, "mouseIn", {
                sampleRate: Number(e.target.value) || 60,
              })
            }
          />
        </Row>

        <div className="paramPane__hint">채널: x, y</div>
      </aside>
    );
  }

  // ✅ Math CHOP (추가)
  if (kind === "math") {
    const p =
      params && params.kind === "math"
        ? params
        : {
            kind: "math" as const,
            tab: "multadd" as const,
            preAdd: 0,
            multiply: 1,
            postAdd: 0,
            fromLow: 0,
            fromHigh: 1,
            toLow: 0,
            toHigh: 1,
            clamp: false,
          };

    return (
      <aside className="paramPane">
        <div className="paramPane__title">Math CHOP</div>

        <Row label="Tab">
          <select
            className="paramPane__input"
            value={p.tab}
            onChange={(e) =>
              setParam(effectiveId, "math", {
                tab: e.target.value as "multadd" | "range",
              })
            }
          >
            <option value="multadd">Mult-Add</option>
            <option value="range">Range</option>
          </select>
        </Row>

        {p.tab === "multadd" ? (
          <>
            <Row label="Pre-Add">
              <input
                className="paramPane__input"
                type="number"
                value={p.preAdd}
                onChange={(e) =>
                  setParam(effectiveId, "math", {
                    preAdd: Number(e.target.value) || 0,
                  })
                }
              />
            </Row>

            <Row label="Multiply">
              <input
                className="paramPane__input"
                type="number"
                value={p.multiply}
                onChange={(e) =>
                  setParam(effectiveId, "math", {
                    multiply: Number(e.target.value) || 1,
                  })
                }
              />
            </Row>

            <Row label="Post-Add">
              <input
                className="paramPane__input"
                type="number"
                value={p.postAdd}
                onChange={(e) =>
                  setParam(effectiveId, "math", {
                    postAdd: Number(e.target.value) || 0,
                  })
                }
              />
            </Row>
          </>
        ) : (
          <>
            <Row label="From Low">
              <input
                className="paramPane__input"
                type="number"
                value={p.fromLow}
                onChange={(e) =>
                  setParam(effectiveId, "math", {
                    fromLow: Number(e.target.value) || 0,
                  })
                }
              />
            </Row>

            <Row label="From High">
              <input
                className="paramPane__input"
                type="number"
                value={p.fromHigh}
                onChange={(e) =>
                  setParam(effectiveId, "math", {
                    fromHigh: Number(e.target.value) || 1,
                  })
                }
              />
            </Row>

            <Row label="To Low">
              <input
                className="paramPane__input"
                type="number"
                value={p.toLow}
                onChange={(e) =>
                  setParam(effectiveId, "math", {
                    toLow: Number(e.target.value) || 0,
                  })
                }
              />
            </Row>

            <Row label="To High">
              <input
                className="paramPane__input"
                type="number"
                value={p.toHigh}
                onChange={(e) =>
                  setParam(effectiveId, "math", {
                    toHigh: Number(e.target.value) || 1,
                  })
                }
              />
            </Row>

            <Row label="Clamp">
              <input
                type="checkbox"
                checked={p.clamp}
                onChange={(e) =>
                  setParam(effectiveId, "math", { clamp: e.target.checked })
                }
              />
            </Row>
          </>
        )}
      </aside>
    );
  }

  if (kind === "fft") {
    const p =
      params && params.kind === "fft"
        ? params
        : { kind: "fft" as const, smoothing: 0.85, intensity: 1 };
    return (
      <aside className="paramPane">
        <div className="paramPane__title">FFT (CHOP)</div>
        <Row label="Smoothing">
          <input
            type="range"
            min={0}
            max={0.99}
            step={0.01}
            value={p.smoothing}
            onChange={(e) =>
              setParam(effectiveId, "fft", {
                smoothing: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.smoothing.toFixed(2)}</span>
        </Row>
        <Row label="Intensity">
          <input
            type="range"
            min={0}
            max={3}
            step={0.01}
            value={p.intensity}
            onChange={(e) =>
              setParam(effectiveId, "fft", {
                intensity: Number(e.target.value),
              })
            }
          />
          <span className="paramPane__value">{p.intensity.toFixed(2)}</span>
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

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="paramPane__row">
      <div className="paramPane__label">{label}</div>
      <div className="paramPane__control">{children}</div>
    </div>
  );
}
