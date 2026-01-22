import { BrowserRouter, Routes, Route } from "react-router-dom";
import CinematicIntro from "../pages/CinematicIntro"; 
import VisualizerPage from "../pages/VisualizerPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CinematicIntro />} />
        <Route path="/visualizer" element={<VisualizerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
