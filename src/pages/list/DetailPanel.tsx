// src/pages/list/DetailPanel.tsx
import type { FileItem } from "./mockData";

type DetailPanelProps = {
  selected?: FileItem;
};

export default function DetailPanel({ selected }: DetailPanelProps) {
  return (
    <section className="right_list">
      <div className="card_list">
        <div className="preview_list">
          {selected?.previewType === "video" && selected.previewSrc ? (
            <video className="previewMedia_list" src={selected.previewSrc} controls autoPlay muted playsInline />
          ) : (
            <div className="previewPlaceholder_list">Preview</div>
          )}
        </div>

        <div className="detail_list">
          <div className="detailTitle_list">{selected?.title ?? "No selection"}</div>
          <div className="detailSub_list">{selected?.subtitle ?? ""}</div>

          <div className="tags_list">
            {["3d concept", "futuristic", "purple", "minimalistic", "highly detailed"].map((t) => (
              <span className="tag_list" key={t}>
                {t}
              </span>
            ))}
          </div>

          <div className="section_list">
            <div className="sectionTitle_list">Description</div>
            <p className="desc_list">
              So this is my first attempt with 3D art. I'm trying out Adobe Dimension and curious as to what other
              programs people recommend for 3D modeling.
            </p>
          </div>

          <div className="section_list">
            <div className="sectionTitle_list">Info</div>
            <div className="kv_list">
              <div className="kvRow_list">
                <span>Size</span>
                <b>3840 × 2160</b>
              </div>
              <div className="kvRow_list">
                <span>Date</span>
                <b>18 sep 2022</b>
              </div>
            </div>
          </div>

          <div className="section_list">
            <div className="sectionTitle_list">Share with</div>
            <div className="share_list">
              <span className="face_list big" />
              <span className="face_list big" />
              <span className="face_list big" />
              <button className="shareAdd_list" type="button">
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
