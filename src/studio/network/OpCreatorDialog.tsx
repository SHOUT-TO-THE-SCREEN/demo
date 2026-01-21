import { useEffect, useMemo, useRef } from "react";
import type { NodeKind } from "../state/studioStore";
import "./opCreatorDialog.css";

type OpDef = {
  kind: NodeKind;
  label: string;
  group: string;
  keywords: string[];
};

const OPS: OpDef[] = [
  {
    kind: "noise",
    label: "Noise TOP",
    group: "TOP",
    keywords: ["noise", "top", "procedural"],
  },
  {
    kind: "fft",
    label: "FFT CHOP",
    group: "CHOP",
    keywords: ["fft", "spectrum", "audio"],
  },
  {
    kind: "audioIn",
    label: "Audio In CHOP",
    group: "CHOP",
    keywords: ["audio", "input", "mic"],
  },
  {
    kind: "output",
    label: "Output",
    group: "OUT",
    keywords: ["out", "output", "display"],
  },
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

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return OPS;
    return OPS.filter((d) => {
      const hay =
        `${d.label} ${d.group} ${d.kind} ${d.keywords.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const safeIndex = Math.max(0, Math.min(items.length - 1, selectedIndex));
  const selected = items[safeIndex];

  useEffect(() => {
    if (open) queueMicrotask(() => inputRef.current?.focus());
  }, [open]);

  if (!open || !anchor) return null;

  const style: React.CSSProperties = {
    left: anchor.x + 8,
    top: anchor.y + 8,
  };

  return (
    <div
      className="opCreatorPanel"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()} // 이건 유지해도 좋음
    >
      <div
        className="opCreatorPanel"
        style={style}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            onSelectIndex(Math.min(items.length - 1, safeIndex + 1));
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
      >
        <div className="opCreatorHeader">
          <input
            ref={inputRef}
            className="opCreatorInput"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search operators… (e.g., noise)"
          />
        </div>

        <div className="opCreatorList">
          {items.length === 0 ? (
            <div className="opCreatorEmpty">No results</div>
          ) : (
            items.map((d, i) => (
              <div
                key={d.kind}
                className={`opCreatorItem ${i === safeIndex ? "active" : ""}`}
                onMouseEnter={() => onSelectIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(d.kind);
                }}
              >
                <div className="opCreatorItemMain">
                  <div className="opCreatorItemLabel">{d.label}</div>
                  <div className="opCreatorItemSub">{d.kind}</div>
                </div>
                <div className="opCreatorItemGroup">{d.group}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
