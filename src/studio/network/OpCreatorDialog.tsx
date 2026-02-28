import { useEffect, useMemo, useRef, useState } from "react";
import type { NodeKind } from "../state/studioStore";
import "./opCreatorDialog.css";

type OpDef = { kind: NodeKind; label: string; group: string; keywords: string[] };

const OPS: OpDef[] = [
  // TOP
  { kind: "noise", label: "Noise", group: "TOP", keywords: ["procedural", "texture"] },
  { kind: "textTop", label: "Text", group: "TOP", keywords: ["text", "font", "type", "label"] },
  { kind: "constant", label: "Constant", group: "TOP", keywords: ["solid", "color"] },
  { kind: "ramp", label: "Ramp", group: "TOP", keywords: ["gradient", "lut"] },
  { kind: "lookup", label: "Lookup", group: "TOP", keywords: ["map", "colorize"] },
  { kind: "transform", label: "Transform", group: "TOP", keywords: ["move", "rotate", "scale"] },
  { kind: "level", label: "Level", group: "TOP", keywords: ["brightness", "contrast", "gamma"] },
  { kind: "hsvAdjust", label: "HSV Adjust", group: "TOP", keywords: ["hue", "saturation", "value"] },
  { kind: "blur", label: "Blur", group: "TOP", keywords: ["gaussian", "box"] },
  { kind: "edgeDetect", label: "Edge Detect", group: "TOP", keywords: ["sobel", "edges"] },

  // COMPOSITE
  { kind: "over", label: "Over", group: "COMPOSITE", keywords: ["alpha", "blend"] },
  { kind: "add", label: "Add", group: "COMPOSITE", keywords: ["plus"] },
  { kind: "multiply", label: "Multiply", group: "COMPOSITE", keywords: ["mul"] },
  { kind: "screen", label: "Screen", group: "COMPOSITE", keywords: ["lighten"] },
  { kind: "subtract", label: "Subtract", group: "COMPOSITE", keywords: ["minus"] },

  // CHOP
  { kind: "fft", label: "FFT", group: "CHOP", keywords: ["spectrum", "analysis"] },
  { kind: "audioIn", label: "Audio In", group: "CHOP", keywords: ["mic", "input"] },
  { kind: "mouseIn", label: "Mouse In", group: "CHOP", keywords: ["mouse", "input", "pointer"] },
  { kind: "math", label: "Math", group: "CHOP", keywords: ["math", "range", "map", "multiply", "add"] },
  { kind: "noiseCh", label: "Noise", group: "CHOP", keywords: ["noise", "random", "animate"] },
  { kind: "lfo", label: "LFO", group: "CHOP", keywords: ["oscillator", "sine", "wave", "animate"] },
  { kind: "movieAudioIn", label: "Movie Audio In", group: "CHOP", keywords: ["video", "mp4", "audio", "file", "movie"] },
  { kind: "handsChop", label: "Hands", group: "CHOP", keywords: ["hand", "webcam", "mediapipe", "tracking", "gesture"] },

  // SOP
  { kind: "sphereSop", label: "Sphere", group: "SOP", keywords: ["geometry", "mesh", "3d"] },
  { kind: "gridSop", label: "Grid", group: "SOP", keywords: ["plane", "grid", "mesh", "terrain", "wave", "3d"] },
  { kind: "noiseSop", label: "Noise", group: "SOP", keywords: ["deform", "displace", "animate", "3d"] },
  { kind: "torusSop", label: "Torus", group: "SOP", keywords: ["donut", "ring", "torus", "3d"] },
  { kind: "mergeSop", label: "Merge", group: "SOP", keywords: ["combine", "join", "merge", "3d"] },

  // OUT
  { kind: "output", label: "Output", group: "OUT", keywords: ["display"] },
];

type Props = {
  open: boolean;
  anchor: { x: number; y: number } | null; // clientX/Y
  query: string;
  selectedIndex: number;
  onClose: () => void;
  onQuery: (q: string) => void;
  onSelectIndex: (i: number) => void;
  onPick: (kind: NodeKind) => void;
};

const GROUP_ORDER: Record<string, number> = {
  TOP: 10,
  COMPOSITE: 15,
  CHOP: 20,
  SOP: 30,
  DAT: 40,
  MAT: 50,
  OUT: 90,
};

function groupRank(g: string) {
  return GROUP_ORDER[g] ?? 999;
}

type GroupTab = "ALL" | string;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function OpCreatorDialog({
  open,
  anchor,
  query,
  selectedIndex,
  onClose,
  onQuery,
  onSelectIndex,
  onPick,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ✅ Hook order 고정
  const isVisible = open && !!anchor;
  const pos = anchor ?? { x: 0, y: 0 };

  const [activeGroup, setActiveGroup] = useState<GroupTab>("ALL");

  useEffect(() => {
    if (!isVisible) return;
    setActiveGroup("ALL");
    onSelectIndex(0);
    queueMicrotask(() => inputRef.current?.focus());
  }, [isVisible, onSelectIndex]);

  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of OPS) counts.set(d.group, (counts.get(d.group) ?? 0) + 1);

    const groups = Array.from(counts.keys()).sort((a, b) => groupRank(a) - groupRank(b));

    return [
      { key: "ALL" as const, label: "ALL", count: OPS.length },
      ...groups.map((g) => ({ key: g, label: g, count: counts.get(g) ?? 0 })),
    ];
  }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = activeGroup === "ALL" ? OPS : OPS.filter((d) => d.group === activeGroup);

    if (!q) return [...base].sort((a, b) => a.label.localeCompare(b.label));

    const out = base.filter((d) => {
      const hay = `${d.label} ${d.group} ${d.kind} ${d.keywords.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });

    return [...out].sort((a, b) => a.label.localeCompare(b.label));
  }, [activeGroup, query]);

  const safeIndex = useMemo(() => {
    if (filteredItems.length === 0) return 0;
    return clamp(selectedIndex, 0, filteredItems.length - 1);
  }, [filteredItems.length, selectedIndex]);

  useEffect(() => {
    if (filteredItems.length === 0) {
      if (selectedIndex !== 0) onSelectIndex(0);
      return;
    }
    if (selectedIndex !== safeIndex) onSelectIndex(safeIndex);
  }, [filteredItems.length, safeIndex, selectedIndex, onSelectIndex]);

  const selected = filteredItems[safeIndex];

  if (!isVisible) return null;

  const style: React.CSSProperties = { left: pos.x + 8, top: pos.y + 8 };

  return (
    <div className="opCreatorOverlay" onClick={onClose}>
      <div
        className="opCreatorPanel"
        style={style}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            onSelectIndex(Math.min(filteredItems.length - 1, safeIndex + 1));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            onSelectIndex(Math.max(0, safeIndex - 1));
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (selected) onPick(selected.kind);
            return;
          }
        }}
        tabIndex={-1}
        role="dialog"
        aria-label="Create Operator"
      >
        <div className="opCreatorHeader">
          <div className="opCreatorSearchRow">
            <div className="opCreatorSearchIcon" aria-hidden="true">
              ⌕
            </div>
            <input
              ref={inputRef}
              className="opCreatorInput"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search operators…"
            />
            {query.trim() && (
              <button
                type="button"
                className="opCreatorClearBtn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onQuery("")}
                aria-label="Clear"
              >
                ✕
              </button>
            )}
          </div>

          <div className="opCreatorTabs" role="tablist" aria-label="Operator groups">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`opCreatorTab ${activeGroup === t.key ? "active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setActiveGroup(t.key);
                  onSelectIndex(0);
                }}
              >
                {t.label}
                <span className="opCreatorTabCount">{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="opCreatorList" role="listbox" aria-label="Operators">
          {filteredItems.length === 0 ? (
            <div className="opCreatorEmpty">No operators.</div>
          ) : (
            filteredItems.map((d, i) => (
              <div
                key={`${d.group}:${d.kind}`}
                className={`opCreatorItem ${i === safeIndex ? "selected" : ""}`}
                role="option"
                aria-selected={i === safeIndex}
                onMouseMove={() => onSelectIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(d.kind)}
              >
                <div className="opCreatorItemLabel">{d.label}</div>
                <div className="opCreatorItemMeta">{d.group}</div>
              </div>
            ))
          )}
        </div>

        <div className="opCreatorFooter">
          <div className="opCreatorHint">↑↓ 이동 · Enter 생성 · Esc 닫기</div>
        </div>
      </div>
    </div>
  );
}
