import { useRef } from "react";
import CinematicController from "../systems/CinematicController";

export default function Scene01() {
  const targetRef = useRef<THREE.Mesh>(null!);

  return (
    <group>
      <mesh ref={targetRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial />
      </mesh>

      <CinematicController targetRef={targetRef} />
    </group>
  );
}
