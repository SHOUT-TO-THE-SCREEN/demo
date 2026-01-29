export function ensureCanvas(cache: Map<string, HTMLCanvasElement>, key: string, w: number, h: number) {
  const c = cache.get(key) ?? document.createElement("canvas");
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  if (!cache.has(key)) cache.set(key, c);
  return c;
}

export function get2d(c: HTMLCanvasElement, willReadFrequently = false) {
  return c.getContext("2d", { willReadFrequently })!;
}
