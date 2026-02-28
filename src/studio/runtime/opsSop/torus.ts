import type { SopOpEval } from "../typesRuntime";

export const evalTorusSop: SopOpEval = ({ params }) => {
  const p = params?.kind === "torusSop" ? params : null;
  const R    = p?.radiusMajor ?? 1.0;  // distance from center to tube center
  const r    = p?.radiusMinor ?? 0.35; // tube radius
  const rows = p?.rows ?? 24;          // segments around the tube (v)
  const cols = p?.cols ?? 24;          // segments around the ring (u)

  const vertexCount = (rows + 1) * (cols + 1);
  const faceCount   = rows * cols * 2;

  const positions = new Float32Array(vertexCount * 3);
  const normals   = new Float32Array(vertexCount * 3);
  const indices   = new Uint32Array(faceCount * 3);

  let vi = 0;
  for (let i = 0; i <= rows; i++) {
    const v    = (i / rows) * Math.PI * 2;
    const cosV = Math.cos(v);
    const sinV = Math.sin(v);

    for (let j = 0; j <= cols; j++) {
      const u    = (j / cols) * Math.PI * 2;
      const cosU = Math.cos(u);
      const sinU = Math.sin(u);

      // Vertex position
      const px = (R + r * cosV) * cosU;
      const py = r * sinV;
      const pz = (R + r * cosV) * sinU;

      positions[vi * 3 + 0] = px;
      positions[vi * 3 + 1] = py;
      positions[vi * 3 + 2] = pz;

      // Normal: direction from tube center to vertex
      const nx = cosV * cosU;
      const ny = sinV;
      const nz = cosV * sinU;

      normals[vi * 3 + 0] = nx;
      normals[vi * 3 + 1] = ny;
      normals[vi * 3 + 2] = nz;

      vi++;
    }
  }

  let fi = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i       * (cols + 1) + j;
      const b = i       * (cols + 1) + j + 1;
      const c = (i + 1) * (cols + 1) + j;
      const d = (i + 1) * (cols + 1) + j + 1;

      indices[fi * 3 + 0] = a;
      indices[fi * 3 + 1] = c;
      indices[fi * 3 + 2] = b;
      fi++;

      indices[fi * 3 + 0] = b;
      indices[fi * 3 + 1] = c;
      indices[fi * 3 + 2] = d;
      fi++;
    }
  }

  return { positions, normals, indices, vertexCount, faceCount };
};
