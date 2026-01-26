import { BrowserRouter, Routes, Route } from "react-router-dom";
import CinematicIntro from "../pages/CinematicIntro"; 
import VisualizerPage from "../pages/VisualizerPage";
import ListPage from "../pages/ListPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CinematicIntro />} />
        <Route path="/list" element={<ListPage />} />
        <Route path="/visualizer/:id" element={<VisualizerPage />} />

        <Route path="/visualizer" element={<VisualizerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
