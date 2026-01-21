import "./panels.css";
import { useMemo } from "react";
import { useStudioStore } from "../state/studioStore";
import type { NodeKind, NodeParams } from "../state/studioStore";

export default function ParamPane({ nodeId }: { nodeId: string | null }) {
  const kindById = useStudioStore((s) => s.nodeKindById);
  const paramsById = useStudioStore((s) => s.paramsById);
  const setParam = useStudioStore((s) => s.setParam);

  const kind = useMemo(() => (nodeId ? kindById[nodeId] : undefined), [nodeId, kindById]);
  const params = useMemo(() => (nodeId ? paramsById[nodeId] : undefined), [nodeId, paramsById]);

  if (!nodeId || !kind) {
    return (
      <div className="tdPanel">
        <div className="tdPanel__hdr">Parameters</div>
        <div className="tdPanel__body">
          <div className="tdMuted">Select a node to edit parameters.</div>
        </div>
      </div>
    );
  }

  const p = params as NodeParams | undefined;

  return (
    <div className="tdPanel">
      <div className="tdPanel__hdr">Parameters</div>
      <div className="tdPanel__body">
        <div className="tdKV">
          <div className="tdKV__k">Node</div>
          <div className="tdKV__v">{nodeId}</div>
          <div className="tdKV__k">Kind</div>
          <div className="tdKV__v">{kind}</div>
        </div>

        <div className="tdDivider" />

        {kind === "audioIn" && (
          <>
            <div className="tdField">
              <div className="tdField__label">Gain</div>
              <input
                className="tdRange"
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={p?.kind === "audioIn" ? p.gain : 1}
                onChange={(e) => setParam(nodeId, "audioIn", { gain: Number(e.target.value) })}
              />
              <div className="tdField__value">{(p?.kind === "audioIn" ? p.gain : 1).toFixed(2)}</div>
            </div>
          </>
        )}

        {kind === "fft" && (
          <>
            <div className="tdField">
              <div className="tdField__label">Smoothing</div>
              <input
                className="tdRange"
                type="range"
                min={0}
                max={0.99}
                step={0.01}
                value={p?.kind === "fft" ? p.smoothing : 0.85}
                onChange={(e) => setParam(nodeId, "fft", { smoothing: Number(e.target.value) })}
              />
              <div className="tdField__value">{(p?.kind === "fft" ? p.smoothing : 0.85).toFixed(2)}</div>
            </div>

            <div className="tdField">
              <div className="tdField__label">Intensity</div>
              <input
                className="tdRange"
                type="range"
                min={0.2}
                max={2}
                step={0.01}
                value={p?.kind === "fft" ? p.intensity : 1}
                onChange={(e) => setParam(nodeId, "fft", { intensity: Number(e.target.value) })}
              />
              <div className="tdField__value">{(p?.kind === "fft" ? p.intensity : 1).toFixed(2)}</div>
            </div>
          </>
        )}

        {kind === "output" && (
          <>
            <div className="tdField">
              <div className="tdField__label">Exposure</div>
              <input
                className="tdRange"
                type="range"
                min={0.2}
                max={2}
                step={0.01}
                value={p?.kind === "output" ? p.exposure : 1}
                onChange={(e) => setParam(nodeId, "output", { exposure: Number(e.target.value) })}
              />
              <div className="tdField__value">{(p?.kind === "output" ? p.exposure : 1).toFixed(2)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
