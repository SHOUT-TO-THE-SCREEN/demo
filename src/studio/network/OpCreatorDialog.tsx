import { useEffect, useMemo, useRef, useState } from "react";
import type { NodeKind } from "../state/studioStore";
import "./opCreatorDialog.css";

type OpDef = { kind: NodeKind; label: string; group: string; keywords: string[] };

const OPS: OpDef[] = [
  { kind: "noise", label: "Noise", group: "TOP", keywords: ["procedural", "texture"] },
  { kind: "ramp", label: "Ramp", group: "TOP", keywords: ["gradient", "lut"] },
  { kind: "lookup", label: "Lookup", group: "TOP", keywords: ["map", "colorize"] },

  { kind: "fft", label: "FFT", group: "CHOP", keywords: ["spectrum", "analysis"] },
  { kind: "audioIn", label: "Audio In", group: "CHOP", keywords: ["mic", "input"] },

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

  // 다이얼로그 열릴 때: 포커스 + 탭 초기화(원하면 "TOP"으로 변경 가능)
  useEffect(() => {
    if (!isVisible) return;
    setActiveGroup("ALL");
    onSelectIndex(0);
    queueMicrotask(() => inputRef.current?.focus());
  }, [isVisible, onSelectIndex]);

  // 탭 메타(그룹 목록 + 카운트)
  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of OPS) counts.set(d.group, (counts.get(d.group) ?? 0) + 1);

    const groups = Array.from(counts.keys()).sort((a, b) => groupRank(a) - groupRank(b));

    const items: Array<{ key: GroupTab; label: string; count: number }> = [
      { key: "ALL", label: "ALL", count: OPS.length },
      ...groups.map((g) => ({ key: g, label: g, count: counts.get(g) ?? 0 })),
    ];

    return items;
  }, []);

  // 탭 + 검색 반영하여 표시 리스트 산출
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base =
      activeGroup === "ALL" ? OPS : OPS.filter((d) => d.group === activeGroup);

    if (!q) {
      return [...base].sort((a, b) => a.label.localeCompare(b.label));
    }

    const out = base.filter((d) => {
      const hay = `${d.label} ${d.group} ${d.kind} ${d.keywords.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });

    return [...out].sort((a, b) => a.label.localeCompare(b.label));
  }, [activeGroup, query]);

  // 탭/검색이 바뀌면 선택 인덱스를 안정화
  const safeIndex = useMemo(() => {
    if (filteredItems.length === 0) return 0;
    return clamp(selectedIndex, 0, filteredItems.length - 1);
  }, [filteredItems.length, selectedIndex]);

  useEffect(() => {
    // 리스트가 줄었는데 selectedIndex가 밖이면 0으로 당김
    if (filteredItems.length === 0) {
      if (selectedIndex !== 0) onSelectIndex(0);
      return;
    }
    if (selectedIndex !== safeIndex) onSelectIndex(safeIndex);
  }, [filteredItems.length, safeIndex, selectedIndex, onSelectIndex]);

  const selected = filteredItems[safeIndex];

  // ✅ 모든 Hook 이후 return null
  if (!isVisible) return null;

  const style: React.CSSProperties = {
    left: pos.x + 8,
    top: pos.y + 8,
  };

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
        {/* 헤더: 검색 + 탭 */}
        <div className="opCreatorHeader">
          <div className="opCreatorSearchRow">
            <div className="opCreatorSearchIcon" aria-hidden="true">⌕</div>
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
                role="tab"
                aria-selected={activeGroup === t.key}
              >
                <span className="opCreatorTabLabel">{t.label}</span>
                <span className="opCreatorTabCount">{t.count}</span>
              </button>
            ))}
          </div>

          <div className="opCreatorHintRow">
            <span className="opCreatorHint">
              ↑↓ Move&nbsp;&nbsp;↵ Create&nbsp;&nbsp;Esc Close
            </span>
            <span className="opCreatorHintStrong">
              {activeGroup === "ALL" ? "All Operators" : `${activeGroup} Operators`}
            </span>
          </div>
        </div>

        {/* 리스트 */}
        <div className="opCreatorList" role="listbox" aria-label="Operators">
          {filteredItems.length === 0 ? (
            <div className="opCreatorEmpty">
              <div className="opCreatorEmptyTitle">No results</div>
              <div className="opCreatorEmptyDesc">Try a different keyword or another tab.</div>
            </div>
          ) : (
            filteredItems.map((d, idx) => (
              <div
                key={`${d.group}:${d.kind}`}
                className={`opCreatorItem ${idx === safeIndex ? "active" : ""}`}
                role="option"
                aria-selected={idx === safeIndex}
                onMouseEnter={() => onSelectIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(d.kind);
                }}
              >
                <div className="opCreatorLeft">
                  <div className="opCreatorTitleLine">
                    <span className="opCreatorItemLabel">{d.label}</span>
                    <span className="opCreatorPill">{d.group}</span>
                  </div>

                  <div className="opCreatorItemSub">
                    <span className="opCreatorMono">{d.kind}</span>
                    {d.keywords.length > 0 && (
                      <span className="opCreatorKeywords">
                        {d.keywords.slice(0, 3).map((k) => (
                          <span key={k} className="opCreatorKeyTag">
                            {k}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>

                <div className="opCreatorRight" aria-hidden="true">
                  <span className="opCreatorArrow">→</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
