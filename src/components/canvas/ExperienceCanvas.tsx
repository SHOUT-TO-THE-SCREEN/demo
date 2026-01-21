import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { OrbitControls } from "@react-three/drei";
import Scene01 from "./scenes/Scene01";

export default function ExperienceCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1} />

        <Scene01 />

        {/* 개발 중 확인용(원하면 제거) */}
        <OrbitControls enableDamping />
      </Suspense>
    </Canvas>
  );
}
