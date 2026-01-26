// src/pages/list/FileGrid.tsx
import type React from "react";
import { typeIcon } from "./mockData";
import type { FileItem, ViewMode } from "./mockData";

type FileGridProps = {
  files: FileItem[];
  selectedId: number;
  setSelectedId: React.Dispatch<React.SetStateAction<number>>;
  viewMode: ViewMode;
};

export default function FileGrid({ files, selectedId, setSelectedId, viewMode }: FileGridProps) {
  return (
    <div className={`grid_list ${viewMode === "list" ? "list" : ""}`}>
      {files.map((f) => (
        <button
          key={f.id}
          className={`fileCard_list ${f.id === selectedId ? "selected" : ""} ${viewMode === "list" ? "list" : ""}`}
          onClick={() => setSelectedId(f.id)}
          type="button"
        >
          <div className="fileTop_list">
            <div className="fileLeft_list">
              <div className="fileIcon_list">{typeIcon(f.type)}</div>
              <div className="fileSize_list">{f.size ?? "-"}</div>
            </div>
            <div className="dots_list">⋯</div>
          </div>

          <div className="fileBody_list">
            <div className="fileTitle_list">{f.title}</div>
            <div className="fileSub_list">{f.subtitle ?? ""}</div>
          </div>

          <div className="fileBottom_list">
            <div className="faces_list">
              <span className="face_list big" />
              <span className="face_list big" />
              <span className="face_list big" />
            </div>
            <div className="bar_list">
              <div className="barFill_list" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
