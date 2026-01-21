import { useEffect, useMemo, useRef, useState } from "react";
import type { NodeKind } from "../state/studioStore";
import "./opCreatorDialog.css";

type OpDef = { kind: NodeKind; label: string; group: string; keywords: string[] };

const OPS: OpDef[] = [
  { kind: "noise", label: "Noise TOP", group: "TOP", keywords: ["noise", "procedural", "texture"] },
  { kind: "fft", label: "FFT CHOP", group: "CHOP", keywords: ["fft", "spectrum", "audio"] },
  { kind: "audioIn", label: "Audio In CHOP", group: "CHOP", keywords: ["audio", "input", "mic"] },
  { kind: "output", label: "Output", group: "OUT", keywords: ["out", "display"] },
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

  // ===== 드래그 상태 =====
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [dragging, setDragging] = useState(false);

  // 열릴 때마다 드래그 오프셋 초기화(원하는 정책)
  useEffect(() => {
    if (open) {
      dragDeltaRef.current = { dx: 0, dy: 0 };
      setDragDelta({ dx: 0, dy: 0 });
      setDragging(false);
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return OPS;
    return OPS.filter((d) => {
      const hay = `${d.label} ${d.group} ${d.kind} ${d.keywords.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const safeIndex = Math.max(0, Math.min(items.length - 1, selectedIndex));
  const selected = items[safeIndex];

  // ===== pointer move/up 전역 바인딩 =====
  useEffect(() => {
    if (!open) return;

    const onMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      const next = { dx: dragDeltaRef.current.dx + dx, dy: dragDeltaRef.current.dy + dy };
      setDragDelta(next);

      // 계속 이동 기준을 갱신(드래그가 부드럽게)
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setDragging(true);
    };

    const onUp = () => {
      if (!dragStartRef.current) return;
      dragStartRef.current = null;
      dragDeltaRef.current = dragDelta; // 최종값 저장
      // dragging은 살짝 늦게 false로 내려야 outside click 오작동이 줄어듦
      setTimeout(() => setDragging(false), 0);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [open, dragDelta]);

  if (!open || !anchor) return null;

  const left = anchor.x + 8 + dragDelta.dx;
  const top = anchor.y + 8 + dragDelta.dy;

  return (
    // 바깥 클릭으로 닫기: onClick 사용(이미 겪은 “열자마자 닫힘” 방지)
    <div
      className="opCreatorOverlay"
      onClick={() => {
        // 드래그 직후 클릭 이벤트로 닫히는 케이스 방지
        if (!dragging) onClose();
      }}
    >
      <div
        className="opCreatorPanel"
        style={{ left, top }}
        // 패널 내부 클릭은 밖으로 전파 금지
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        tabIndex={-1}
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
      >
        {/* 드래그 핸들: 헤더 바(입력창 제외)를 잡고 이동 */}
        <div
          className="opCreatorDragBar"
          onPointerDown={(e) => {
            // 왼쪽 버튼만
            if (e.button !== 0) return;
            // 드래그 시작점 저장
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            // pointer capture(드래그 안정화)
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
        />

        <div className="opCreatorHeader">
          <input
            ref={inputRef}
            className="opCreatorInput"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search operators… (e.g., noise)"
            // 입력창 클릭은 드래그 시작하지 않게
            onPointerDown={(e) => e.stopPropagation()}
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
                  // 클릭으로 생성 + 닫기
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
