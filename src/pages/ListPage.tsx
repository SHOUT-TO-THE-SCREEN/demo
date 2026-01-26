// src/pages/ListPage.tsx
import "./ListPage.css"; // 또는 "./ListPage.css" 사용 중이면 그걸로 바꾸세요.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Topbar from "./list/Topbar";
import FileGrid from "./list/FileGrid";
import DetailPanel from "./list/DetailPanel";
import AddFilePanel from "./list/AddFilePanel";

import { filesSeed } from "./list/mockData";
import type { FileItem, ViewMode } from "./list/mockData";

export default function ListPage() {
  const navigate = useNavigate();

  // ✅ files는 state로 관리해야 "추가"가 반영됩니다.
  const [filesAll, setFilesAll] = useState<FileItem[]>(filesSeed);

  const [query, setQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);

  const [selectedId, setSelectedId] = useState<number>(filesSeed[0]?.id ?? 1);

  const files = useMemo<FileItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filesAll;
    return filesAll.filter((f) => (f.title ?? "").toLowerCase().includes(q));
  }, [query, filesAll]);

  const selected = useMemo<FileItem | undefined>(() => {
    return filesAll.find((f) => f.id === selectedId) ?? files[0];
  }, [filesAll, selectedId, files]);

  const nextId = useMemo<number>(() => {
    const max = filesAll.reduce((m, f) => Math.max(m, f.id), 0);
    return max + 1;
  }, [filesAll]);

  return (
    <div className="page_list">
      <div className="shell_list">
        <div className="layout_list">
          <main className="center_list">
            <div className="card_list">
              <Topbar
                query={query}
                setQuery={setQuery}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onOpenAdd={() => setIsAddOpen(true)}
              />

              <div className="cardScroll_list">
                <FileGrid
                  files={files}
                  selectedId={selectedId}
                  setSelectedId={setSelectedId}
                  viewMode={viewMode}
                />
              </div>
            </div>
          </main>

          <DetailPanel selected={selected} />
        </div>
      </div>

      {/* ✅ Add File 모달 */}
      <AddFilePanel
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreate={(payload) => {
          const created: FileItem = { id: nextId, ...payload };

          setFilesAll((prev) => [created, ...prev]);
          setSelectedId(created.id);
          setIsAddOpen(false);

          // ✅ 생성 직후 Visualizer로 이동 (+ state로도 전달)
          navigate(`/visualizer/${created.id}`, { state: { file: created } });
        }}
      />
    </div>
  );
}
