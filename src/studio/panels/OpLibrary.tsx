import { useMemo, useState } from "react";
import "./panels.css";

type Item = { kind: string; label: string; group: string; enabled: boolean };

export default function OpLibrary() {
  const [q, setQ] = useState("");

  const items: Item[] = useMemo(
    () => [
      // TOP
      { kind: "noise", label: "noise", group: "TOP", enabled: true },
      { kind: "ramp", label: "ramp", group: "TOP", enabled: true },
      { kind: "lookup", label: "lookup", group: "TOP", enabled: true },

      // CHOP
      { kind: "audioIn", label: "audioIn", group: "CHOP", enabled: true },
      { kind: "fft", label: "fft", group: "CHOP", enabled: true },

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
