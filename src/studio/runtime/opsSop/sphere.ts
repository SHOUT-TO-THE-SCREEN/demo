import type { SopOpEval } from "../typesRuntime";

export const evalSphereSop: SopOpEval = ({ params }) => {
  const p = params?.kind === "sphereSop" ? params : null;
  const radius = p?.radius ?? 1.0;
  const rows = p?.rows ?? 20;
  const cols = p?.cols ?? 20;

  const vertexCount = (rows + 1) * (cols + 1);
  const faceCount = rows * cols * 2;

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(faceCount * 3);

  let vi = 0;
  for (let r = 0; r <= rows; r++) {
    const phi = (r / rows) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let c = 0; c <= cols; c++) {
      const theta = (c / cols) * 2 * Math.PI;
      const nx = sinPhi * Math.cos(theta);
      const ny = cosPhi;
      const nz = sinPhi * Math.sin(theta);

      positions[vi * 3 + 0] = nx * radius;
      positions[vi * 3 + 1] = ny * radius;
      positions[vi * 3 + 2] = nz * radius;
      normals[vi * 3 + 0] = nx;
      normals[vi * 3 + 1] = ny;
      normals[vi * 3 + 2] = nz;
      vi++;
    }
  }

  let fi = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;       // top-left
      const b = r * (cols + 1) + c + 1;   // top-right
      const d = (r + 1) * (cols + 1) + c; // bottom-left
      const e = d + 1;                    // bottom-right

      // CCW winding from outside the sphere
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
