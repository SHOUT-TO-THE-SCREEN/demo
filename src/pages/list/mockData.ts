// src/pages/list/mockData.ts (또는 현재 mockData.ts 위치)
export type FileType = "folder" | "video" | "music" | "figma" | "image" | "word" | "excel";
export type ViewMode = "grid" | "list";
export type PreviewType = "video";

export type FileItem = {
  id: number;
  type: FileType;
  title: string;
  subtitle?: string;
  size?: string;
  previewType?: PreviewType;
  previewSrc?: string;
};

export const filesSeed: FileItem[] = [
  { id: 1, type: "folder", title: "UI / UX design" },
  { id: 2, type: "video", title: "My video", previewType: "video", previewSrc: "../../public/sample/movie1.mp4" },
  { id: 3, type: "music", title: "My music" },
  { id: 4, type: "figma", title: "Ui Style Guide.fig" },
  { id: 5, type: "image", title: "Invoice #1.docx" },
  { id: 6, type: "word", title: "Invoice #8.docx" },
  { id: 7, type: "word", title: "Invoice #2.docx" },
  { id: 8, type: "excel", title: "Timetracking_XLSX" },
];

export function typeIcon(type: FileType): string {
  const map: Record<FileType, string> = {
    folder: "📁",
    video: "🎬",
    music: "🎵",
    figma: "🟣",
    image: "🖼️",
    word: "🟦",
    excel: "🟩",
  };
  return map[type] ?? "📄";
}
