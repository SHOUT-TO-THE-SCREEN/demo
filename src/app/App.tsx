// src/app/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import IntroPage from "../pages/IntroPage";
import VisualizerPage from "../pages/VisualizerPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IntroPage />} />
        <Route path="/visualizer" element={<VisualizerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
