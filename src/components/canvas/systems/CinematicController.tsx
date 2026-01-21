import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import type { Object3D } from "three";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  targetRef: RefObject<Object3D>;
};

export default function CinematicController({ targetRef }: Props) {
  const { camera } = useThree();

  const rig = useMemo(
    () => ({
      camX: 0,
      camY: 0,
      camZ: 6,
      fov: 45,
      objX: 0,
      objY: 0,
      objZ: 0,
      rotY: 0,
      rotX: 0,
      scale: 1,
    }),
    []
  );

  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.current.x = nx;
      pointer.current.y = ny;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    });

    tl.to(rig, {
      camZ: 5.2,
      camX: 0.6,
      rotY: Math.PI * 0.35,
      scale: 1.15,
      duration: 1,
      ease: "none",
    });

    tl.to(rig, {
      camX: -0.8,
      camY: 0.25,
      camZ: 4.4,
      rotY: Math.PI * 1.05,
      rotX: -0.15,
      objX: 0.9,
      scale: 0.95,
      duration: 1,
      ease: "none",
    });

    tl.to(rig, {
      camX: 0,
      camY: 0,
      camZ: 6.2,
      fov: 42,
      objX: 0,
      objY: 0,
      rotY: Math.PI * 1.6,
      scale: 1.05,
      duration: 1,
      ease: "none",
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [rig]);

  useFrame(() => {
    const obj = targetRef.current;
    if (!obj) return;

    const px = pointer.current.x;
    const py = pointer.current.y;

    // Camera position (Camera 공통 프로퍼티)
    camera.position.x += (rig.camX + px * 0.15 - camera.position.x) * 0.08;
    camera.position.y += (rig.camY + -py * 0.1 - camera.position.y) * 0.08;
    camera.position.z += (rig.camZ - camera.position.z) * 0.08;

    // fov는 PerspectiveCamera 전용 → 타입 가드로 안전하게 처리
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov += (rig.fov - camera.fov) * 0.08;
      camera.updateProjectionMatrix();
    } else if (camera instanceof THREE.OrthographicCamera) {
      // 현재 rig는 fov 기반이므로, ortho일 경우엔 fov 대신 zoom을 써야 합니다.
      // 필요하면 아래를 활성화해서 rig에 zoom 값을 추가하세요.
      // camera.zoom += (rig.zoom - camera.zoom) * 0.08;
      camera.updateProjectionMatrix();
    }

    // Object position
    obj.position.x += (rig.objX - obj.position.x) * 0.1;
    obj.position.y += (rig.objY - obj.position.y) * 0.1;
    obj.position.z += (rig.objZ - obj.position.z) * 0.1;

    // Object rotation
    const targetRotY = rig.rotY + px * 0.25;
    const targetRotX = rig.rotX + -py * 0.15;

    obj.rotation.y += (targetRotY - obj.rotation.y) * 0.12;
    obj.rotation.x += (targetRotX - obj.rotation.x) * 0.12;

    // Object scale
    const s = obj.scale.x;
    const ns = rig.scale;
    obj.scale.setScalar(s + (ns - s) * 0.1);
  });

  return null;
}
