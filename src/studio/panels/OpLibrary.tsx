import { useMemo, useState } from "react";
import "./panels.css";

type Item = { kind: string; label: string; group: string; enabled: boolean };

export default function OpLibrary() {
  const [q, setQ] = useState("");

  const items: Item[] = useMemo(
    () => [
      // TOP
      { kind: "noise", label: "noise", group: "TOP", enabled: true },
      { kind: "textTop", label: "textTop", group: "TOP", enabled: true },
      { kind: "constant", label: "constant", group: "TOP", enabled: true },
      { kind: "ramp", label: "ramp", group: "TOP", enabled: true },
      { kind: "lookup", label: "lookup", group: "TOP", enabled: true },
      { kind: "transform", label: "transform", group: "TOP", enabled: true },
      { kind: "level", label: "level", group: "TOP", enabled: true },
      { kind: "hsvAdjust", label: "hsvAdjust", group: "TOP", enabled: true },
      { kind: "blur", label: "blur", group: "TOP", enabled: true },
      { kind: "edgeDetect", label: "edgeDetect", group: "TOP", enabled: true },

      // COMPOSITE
      { kind: "over", label: "over", group: "COMPOSITE", enabled: true },
      { kind: "add", label: "add", group: "COMPOSITE", enabled: true },
      { kind: "multiply", label: "multiply", group: "COMPOSITE", enabled: true },
      { kind: "screen", label: "screen", group: "COMPOSITE", enabled: true },
      { kind: "subtract", label: "subtract", group: "COMPOSITE", enabled: true },

      // CHOP
      { kind: "audioIn", label: "audioIn", group: "CHOP", enabled: true },
      { kind: "fft", label: "fft", group: "CHOP", enabled: true },
      { kind: "mouseIn", label: "mouseIn", group: "CHOP", enabled: true },
      { kind: "math", label: "math", group: "CHOP", enabled: true },
      { kind: "noiseCh", label: "noiseCh", group: "CHOP", enabled: true },
      { kind: "lfo", label: "lfo", group: "CHOP", enabled: true },
      { kind: "movieAudioIn", label: "movieAudioIn", group: "CHOP", enabled: true },
      { kind: "handsChop", label: "handsChop", group: "CHOP", enabled: true },

      // SOP
      { kind: "sphereSop", label: "sphereSop", group: "SOP", enabled: true },
      { kind: "gridSop", label: "gridSop", group: "SOP", enabled: true },
      { kind: "noiseSop", label: "noiseSop", group: "SOP", enabled: true },
      { kind: "torusSop", label: "torusSop", group: "SOP", enabled: true },
      { kind: "mergeSop", label: "mergeSop", group: "SOP", enabled: true },

      // OUT
      { kind: "output", label: "output", group: "OUT", enabled: true },

      // (예시/미구현)
      { kind: "fileIn", label: "fileIn (todo)", group: "TOP", enabled: false },
      { kind: "envelope", label: "envelope (todo)", group: "CHOP", enabled: false },
    ],
    []
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => `${it.label} ${it.group} ${it.kind}`.toLowerCase().includes(qq));
  }, [items, q]);

  const groups = useMemo(() => {
    const g: Record<string, Item[]> = {};
    for (const it of filtered) {
      if (!g[it.group]) g[it.group] = [];
      g[it.group].push(it);
    }
    return g;
  }, [filtered]);

  const onDragStart = (e: React.DragEvent, kind: string, enabled: boolean) => {
    if (!enabled) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("application/td-kind", kind);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="tdPanel">
      <div className="tdPanel__hdr">OP Library</div>

      <div className="tdPanel__body">
        <input
          className="tdInput"
          placeholder="Search operators..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="tdList">
          {Object.entries(groups).map(([group, list]) => (
            <div key={group}>
              <div className="tdList__group">{group}</div>
              {list.map((it) => (
                <button
                  key={it.kind}
                  className="tdItem"
                  draggable={it.enabled}
                  onDragStart={(e) => onDragStart(e, it.kind, it.enabled)}
                  disabled={!it.enabled}
                  title={it.enabled ? "Drag into Network" : "Not implemented"}
                  style={!it.enabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                >
                  {it.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="tdHint">
          드래그로 생성: OP Library → Network 빈 공간에 Drop / 더블클릭 생성: Network 빈 공간 더블클릭 → OP Creator
        </div>
      </div>
    </div>
  );
}
