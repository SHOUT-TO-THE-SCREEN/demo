// src/pages/list/Topbar.tsx
import type React from "react";
import { useNavigate } from "react-router-dom";
import type { ViewMode } from "./mockData";

type TopbarProps = {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  onOpenAdd: () => void;
};

export default function Topbar({ query, setQuery, viewMode, setViewMode, onOpenAdd }: TopbarProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* 상단 1열: 로고(좌) + Add File(우) */}
      <div className="topbar_list">
        <button
          type="button"
          className="brand_list"
          onClick={() => navigate("/")}
          title="Back to List"
          aria-label="App Logo"
        >
          <span className="brandIcon_list" aria-hidden="true">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0)">
                <path
                  d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z"
                  fill="currentColor"
                />
              </g>
              <defs>
                <clipPath id="clip0">
                  <rect fill="white" height="48" width="48" />
                </clipPath>
              </defs>
            </svg>
          </span>
          <span className="brandText_list">PrismDesign</span>
        </button>

        <button className="addBtn_list" type="button" onClick={onOpenAdd}>
          <span className="plus_list">+</span>
          Add File
        </button>
      </div>

      {/* 2열: 제목/정렬 + 뷰 토글 */}
      <div className="headerRow_list">
        <div>
          <h1 className="title_list">My Cloud</h1>
          <div className="sortText_list">
            Sort by: <b>Type</b>
          </div>
        </div>

        <div className="viewBtns_list">
          <button
            className={`viewBtn_list ${viewMode === "grid" ? "active" : ""}`}
            type="button"
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            ⬛
          </button>

          <button
            className={`viewBtn_list ${viewMode === "list" ? "active" : ""}`}
            type="button"
            onClick={() => setViewMode("list")}
            title="List view"
          >
            ☰
          </button>
        </div>
      </div>

      {/* 3열: 검색 */}
      <div className="searchRow_list">
        <input
          className="search_list"
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder="Search files..."
        />
      </div>
    </>
  );
}
