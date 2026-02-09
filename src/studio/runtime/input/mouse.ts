export type MouseState = {
  x: number;      // 0..1 (viewer 기준 정규화)
  y: number;      // 0..1
  dx: number;     // 프레임 간 변화량(정규화)
  dy: number;
  downL: number;  // 0 or 1
  downM: number;
  downR: number;
  wheel: number;  // 누적 또는 프레임 델타
};

const state: MouseState = { x:0, y:0, dx:0, dy:0, downL:0, downM:0, downR:0, wheel:0 };

let lastX = 0;
let lastY = 0;

export function getMouseState(): MouseState {
  return { ...state };
}

// Viewer의 특정 DOM(캔버스 wrapper)에 바인딩
export function bindMouseW(target: HTMLElement) {
  const toNorm = (e: PointerEvent) => {
    const r = target.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    return { nx: clamp01(nx), ny: clamp01(ny) };
  };

  const onMove = (e: PointerEvent) => {
    const { nx, ny } = toNorm(e);
    state.dx = nx - lastX;
    state.dy = ny - lastY;
    state.x = nx;
    state.y = ny;
    lastX = nx;
    lastY = ny;
  };

  const onDown = (e: PointerEvent) => {
    if (e.button === 0) state.downL = 1;
    if (e.button === 1) state.downM = 1;
    if (e.button === 2) state.downR = 1;
  };

  const onUp = (e: PointerEvent) => {
    if (e.button === 0) state.downL = 0;
    if (e.button === 1) state.downM = 0;
    if (e.button === 2) state.downR = 0;
  };

  // ✅ pointerleave에서는 버튼 상태를 “전체 리셋”
  const onLeave = () => {
    state.downL = 0;
    state.downM = 0;
    state.downR = 0;
  };

  const onWheel = (e: WheelEvent) => {
    state.wheel += e.deltaY; // 누적 방식(필요 시 프레임 델타로 변경 가능)
  };

  target.addEventListener("pointermove", onMove);
  target.addEventListener("pointerdown", onDown);
  target.addEventListener("pointerup", onUp);
  target.addEventListener("pointercancel", onLeave);
  target.addEventListener("pointerleave", onLeave);
  target.addEventListener("wheel", onWheel, { passive: true });

  // 우클릭 메뉴 방지
  const onContext = (e: MouseEvent) => e.preventDefault();
  target.addEventListener("contextmenu", onContext);

  return () => {
    target.removeEventListener("pointermove", onMove);
    target.removeEventListener("pointerdown", onDown);
    target.removeEventListener("pointerup", onUp);
    target.removeEventListener("pointercancel", onLeave);
    target.removeEventListener("pointerleave", onLeave);
    target.removeEventListener("wheel", onWheel as any);
    target.removeEventListener("contextmenu", onContext);
  };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function bindMouseWindow() {
  const onMove = (e: PointerEvent) => {
    const nx = clamp01(e.clientX / window.innerWidth);
    const ny = clamp01(e.clientY / window.innerHeight);

    state.dx = nx - lastX;
    state.dy = ny - lastY;
    state.x = nx;
    state.y = ny;
    lastX = nx;
    lastY = ny;
  };

  const onDown = (e: PointerEvent) => {
    if (e.button === 0) state.downL = 1;
    if (e.button === 1) state.downM = 1;
    if (e.button === 2) state.downR = 1;
  };

  const onUp = (e: PointerEvent) => {
    if (e.button === 0) state.downL = 0;
    if (e.button === 1) state.downM = 0;
    if (e.button === 2) state.downR = 0;
  };

  const onWheel = (e: WheelEvent) => {
    state.wheel += e.deltaY;
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("wheel", onWheel, { passive: true });

  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("wheel", onWheel as any);
  };
}
