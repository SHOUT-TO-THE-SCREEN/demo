import { useEffect, useRef, useState } from "react";
import type { FileItem, FileType } from "./mockData";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: Omit<FileItem, "id">) => void;
};

export default function AddFilePanel({ open, onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<FileType>("video");
  const [subtitle, setSubtitle] = useState("");
  const [previewSrc, setPreviewSrc] = useState("/sample/movie1.mp4");

  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // 스크롤 잠금
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // ESC 닫기
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    // 포커스
    setTimeout(() => titleRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      // 열릴 때 입력 초기화(원하면 제거)
      setTitle("");
      setType("video");
      setSubtitle("");
      setPreviewSrc("/sample/movie1.mp4");
    }
  }, [open]);

  if (!open) return null;

  const canSubmit = title.trim().length > 0;

  return (
    <div
      className="modalOverlay_list"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // 오버레이 클릭(바깥)만 닫기
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modalCard_list" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead_list">
          <div className="modalTitle_list">Add File</div>
          <button className="modalClose_list" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modalBody_list">
          <label className="field_list">
            <div className="fieldLabel_list">Title</div>
            <input
              ref={titleRef}
              className="fieldInput_list"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: Noise TOP Visual"
            />
          </label>

          <label className="field_list">
            <div className="fieldLabel_list">Type</div>
            <select className="fieldInput_list" value={type} onChange={(e) => setType(e.target.value as FileType)}>
              <option value="video">Video</option>
              <option value="folder">Folder</option>
              <option value="image">Image</option>
              <option value="figma">Figma</option>
              <option value="word">Word</option>
              <option value="excel">Excel</option>
              <option value="music">Music</option>
            </select>
          </label>

          <label className="field_list">
            <div className="fieldLabel_list">Subtitle (optional)</div>
            <input className="fieldInput_list" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </label>

          {type === "video" && (
            <label className="field_list">
              <div className="fieldLabel_list">Preview Source</div>
              <input className="fieldInput_list" value={previewSrc} onChange={(e) => setPreviewSrc(e.target.value)} />
              <div className="hint_list">public 기준 경로 예: /sample/movie1.mp4</div>
            </label>
          )}
        </div>

        <div className="modalFoot_list">
          <button className="btnGhost_list" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btnPrimary_list"
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              const payload: Omit<FileItem, "id"> = {
                type,
                title: title.trim(),
                subtitle: subtitle.trim() || undefined,
                previewType: type === "video" ? "video" : undefined,
                previewSrc: type === "video" ? previewSrc.trim() : undefined,
                createdAt: new Date().toISOString(),
              };
              onCreate(payload);
            }}
          >
            Create & Open Visualizer
          </button>
        </div>
      </div>
    </div>
  );
}
