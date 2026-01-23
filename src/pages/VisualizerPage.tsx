// src/pages/VisualizerPage.tsx
import "./VisualizerPage.css";
import NetworkEditor from "../studio/network/NetworkEditor";
import OpLibrary from "../studio/panels/OpLibrary";
import ParamPane from "../studio/panels/ParamPane";
import TopBar from "../studio/panels/TopBar";
import StatusBar from "../studio/panels/StaturBar";
import { useStudioStore } from "../studio/state/studioStore";
import React from "react";

// ✅ Background Viewer
import ViewerPane from "../studio/viewer/ViewerPane";

class SafeBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, message: String(err?.message ?? err) };
  }
  componentDidCatch(err: any) {
    console.error("[VisualizerPage] crashed:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, color: "white" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Visualizer crashed</div>
          <div style={{ opacity: 0.8 }}>{this.state.message}</div>
          <div style={{ opacity: 0.6, marginTop: 8 }}>콘솔(F12) 에러 로그를 확인하세요.</div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function VisualizerPage() {
  const selectedNodeId = useStudioStore((s) => s.selectedNodeId);

  return (
    <div className="tdStudio">
      <TopBar title="DOKDOK / Visualizer" />

      <div className="tdStudio__body">
        <aside className="tdStudio__left">
          <OpLibrary />
        </aside>

        <main className="tdStudio__center">
          {/* ✅ Background layer: ViewerPane */}
          <ViewerPane />

          {/* ✅ Foreground layer: NetworkEditor */}
          <div className="tdStudio__networkLayer">
            <SafeBoundary>
              <NetworkEditor />
            </SafeBoundary>
          </div>
        </main>

        <aside className="tdStudio__right">
          <ParamPane nodeId={selectedNodeId} />
        </aside>
      </div>

      <StatusBar />
    </div>
  );
}
