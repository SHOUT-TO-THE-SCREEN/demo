import type { SopOpEval, SopGeometry } from "../typesRuntime";

// ─── 3D value noise ───────────────────────────────────────────────────────────

function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let n =
    (ix | 0) * 374761393 +
    (iy | 0) * 668265263 +
    (iz | 0) * 1442695041 +
    (seed | 0) * 2654435761;
  n = ((n ^ (n >>> 13)) * 1274126177) | 0;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function valueNoise3D(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;

  const ux = smoothstep(xf);
  const uy = smoothstep(yf);
  const uz = smoothstep(zf);

  const v000 = hash3(xi, yi, zi, seed);
  const v100 = hash3(xi + 1, yi, zi, seed);
  const v010 = hash3(xi, yi + 1, zi, seed);
  const v110 = hash3(xi + 1, yi + 1, zi, seed);
  const v001 = hash3(xi, yi, zi + 1, seed);
  const v101 = hash3(xi + 1, yi, zi + 1, seed);
  const v011 = hash3(xi, yi + 1, zi + 1, seed);
  const v111 = hash3(xi + 1, yi + 1, zi + 1, seed);

  const x00 = lerp(v000, v100, ux);
  const x10 = lerp(v010, v110, ux);
  const x01 = lerp(v001, v101, ux);
  const x11 = lerp(v011, v111, ux);

  const y0 = lerp(x00, x10, uy);
  const y1 = lerp(x01, x11, uy);

  return lerp(y0, y1, uz);
}

// ─── eval ─────────────────────────────────────────────────────────────────────

export const evalNoiseSop: SopOpEval = ({ nodeId, params, evalSOP, inputMap, ctx }) => {
  const inputId = inputMap[nodeId]?.["in"];
  const inputGeom: SopGeometry | null = inputId ? evalSOP(inputId) : null;
  if (!inputGeom) return null;

  const p = params?.kind === "noiseSop" ? params : null;
  const amplitude = p?.amplitude ?? 0.3;
  const frequency = p?.frequency ?? 2.5;
  const speed = p?.speed ?? 0.5;
  const seed = p?.seed ?? 0;

  const t = ctx.now * 0.001 * speed;

  const { positions, normals, indices, vertexCount, faceCount } = inputGeom;
  const newPositions = new Float32Array(positions);

  for (let i = 0; i < vertexCount; i++) {
    const px = positions[i * 3 + 0];
    const py = positions[i * 3 + 1];
    const pz = positions[i * 3 + 2];

    const nx = normals[i * 3 + 0];
    const ny = normals[i * 3 + 1];
    const nz = normals[i * 3 + 2];

    // fBm: two octaves of noise
    const n1 = valueNoise3D(px * frequency + t, py * frequency, pz * frequency, seed);
    const n2 =
      valueNoise3D(px * frequency * 2.1 + t * 1.4, py * frequency * 2.1, pz * frequency * 2.1, seed + 17) * 0.5;
    const n = (n1 * 0.67 + n2 * 0.33) * 2 - 1; // remap [0,1] → [-1,1]

    const disp = n * amplitude;
    newPositions[i * 3 + 0] = px + nx * disp;
    newPositions[i * 3 + 1] = py + ny * disp;
    newPositions[i * 3 + 2] = pz + nz * disp;
  }

  // Keep original normals (approximate for small displacements; good enough for preview)
  return {
    positions: newPositions,
    normals: new Float32Array(normals),
    indices,
    vertexCount,
    faceCount,
  };
};
