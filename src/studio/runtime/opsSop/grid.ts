import type { SopOpEval } from "../typesRuntime";

export const evalGridSop: SopOpEval = ({ params }) => {
  const p = params?.kind === "gridSop" ? params : null;
  const width = p?.width ?? 2.0;
  const height = p?.height ?? 2.0;
  const rows = p?.rows ?? 20;
  const cols = p?.cols ?? 20;

  const vertexCount = (rows + 1) * (cols + 1);
  const faceCount = rows * cols * 2;

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(faceCount * 3);

  let vi = 0;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const x = (c / cols - 0.5) * width;
      const y = 0;
      const z = (r / rows - 0.5) * height;

      positions[vi * 3 + 0] = x;
      positions[vi * 3 + 1] = y;
      positions[vi * 3 + 2] = z;

      // Normal points up (Y+)
      normals[vi * 3 + 0] = 0;
      normals[vi * 3 + 1] = 1;
      normals[vi * 3 + 2] = 0;
      vi++;
    }
  }

  let fi = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = r * (cols + 1) + c + 1;
      const d = (r + 1) * (cols + 1) + c;
      const e = d + 1;

      indices[fi * 3 + 0] = a;
      indices[fi * 3 + 1] = d;
      indices[fi * 3 + 2] = b;
      fi++;

      indices[fi * 3 + 0] = b;
      indices[fi * 3 + 1] = d;
      indices[fi * 3 + 2] = e;
      fi++;
    }
  }

  return { positions, normals, indices, vertexCount, faceCount };
};
