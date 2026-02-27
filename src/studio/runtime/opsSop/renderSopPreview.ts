import type { SopGeometry } from "../typesRuntime";

// ─── Fixed light direction (world space) ─────────────────────────────────────
const RAW_LX = 0.5, RAW_LY = 0.8, RAW_LZ = 0.5;
const LIGHT_LEN = Math.sqrt(RAW_LX * RAW_LX + RAW_LY * RAW_LY + RAW_LZ * RAW_LZ);
const LX = RAW_LX / LIGHT_LEN;
const LY = RAW_LY / LIGHT_LEN;
const LZ = RAW_LZ / LIGHT_LEN;

// Fixed X tilt: tilt camera down ~20° to show top of sphere
const TILT = Math.PI * 0.11;
const cosTilt = Math.cos(TILT);
const sinTilt = Math.sin(TILT);

// Spin speed: radians per millisecond
const SPIN_SPEED = 0.0004;

// Ambient & diffuse weights
const AMBIENT = 0.18;
const DIFFUSE = 1 - AMBIENT;

// Reusable face array — allocated once per call and reused across draws
// We preallocate a typed buffer to avoid GC
type Face = {
  ax: number; ay: number;
  bx: number; by: number;
  cx: number; cy: number;
  z: number;
  shade: number;
};

// ─── Main render function ─────────────────────────────────────────────────────

export function renderSopPreview(
  geom: SopGeometry,
  canvas: HTMLCanvasElement,
  now: number,
  tint: [number, number, number] = [220, 220, 225],
  tintShadow: [number, number, number] = [20, 20, 30],
): void {
  const w = canvas.width || 1;
  const h = canvas.height || 1;
  const g2d = canvas.getContext("2d");
  if (!g2d) return;

  const { positions, normals, indices, faceCount } = geom;

  // ─── Rotation matrices ───────────────────────────────────────────────────
  const angleY = now * SPIN_SPEED;
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);

  // Scale: fit a unit sphere (radius ≈ 1) into the canvas with some padding
  const scale = Math.min(w, h) * 0.4;
  const cx = w * 0.5;
  const cy = h * 0.5;

  // ─── Build face list ─────────────────────────────────────────────────────
  const faces: Face[] = [];

  for (let f = 0; f < faceCount; f++) {
    const i0 = indices[f * 3];
    const i1 = indices[f * 3 + 1];
    const i2 = indices[f * 3 + 2];

    // ── Project vertex i0 ──────────────────────────────────────────────────
    const p0x = positions[i0 * 3];
    const p0y = positions[i0 * 3 + 1];
    const p0z = positions[i0 * 3 + 2];
    // Y rotation
    let rx = p0x * cosY + p0z * sinY;
    let ry = p0y;
    let rz = -p0x * sinY + p0z * cosY;
    // X tilt
    const ax = rx;
    const ay = ry * cosTilt - rz * sinTilt;
    const az = ry * sinTilt + rz * cosTilt;

    // ── Project vertex i1 ──────────────────────────────────────────────────
    const p1x = positions[i1 * 3];
    const p1y = positions[i1 * 3 + 1];
    const p1z = positions[i1 * 3 + 2];
    rx = p1x * cosY + p1z * sinY;
    ry = p1y;
    rz = -p1x * sinY + p1z * cosY;
    const bx = rx;
    const by = ry * cosTilt - rz * sinTilt;
    const bz = ry * sinTilt + rz * cosTilt;

    // ── Project vertex i2 ──────────────────────────────────────────────────
    const p2x = positions[i2 * 3];
    const p2y = positions[i2 * 3 + 1];
    const p2z = positions[i2 * 3 + 2];
    rx = p2x * cosY + p2z * sinY;
    ry = p2y;
    rz = -p2x * sinY + p2z * cosY;
    const ccx = rx;
    const ccy = ry * cosTilt - rz * sinTilt;
    const ccz = ry * sinTilt + rz * cosTilt;

    // Average depth
    const z = (az + bz + ccz) / 3;

    // ── Face normal via cross product (for back-face culling) ───────────────
    const eABx = bx - ax, eABy = by - ay, eABz = bz - az;
    const eACx = ccx - ax, eACy = ccy - ay, eACz = ccz - az;
    const fnx = eABy * eACz - eABz * eACy;
    const fny = eABz * eACx - eABx * eACz;
    const fnz = eABx * eACy - eABy * eACx;

    // Back-face cull: face normal Z < 0 means back face (camera along +Z)
    if (fnz < 0) continue;

    // ── Average vertex normal for shading ──────────────────────────────────
    const n0x = normals[i0 * 3], n0y = normals[i0 * 3 + 1], n0z = normals[i0 * 3 + 2];
    const n1x = normals[i1 * 3], n1y = normals[i1 * 3 + 1], n1z = normals[i1 * 3 + 2];
    const n2x = normals[i2 * 3], n2y = normals[i2 * 3 + 1], n2z = normals[i2 * 3 + 2];

    // Transform average normal (Y rotation then X tilt)
    const anRawX = (n0x + n1x + n2x) / 3;
    const anRawY = (n0y + n1y + n2y) / 3;
    const anRawZ = (n0z + n1z + n2z) / 3;

    rx = anRawX * cosY + anRawZ * sinY;
    ry = anRawY;
    rz = -anRawX * sinY + anRawZ * cosY;
    const transfNX = rx;
    const transfNY = ry * cosTilt - rz * sinTilt;
    const transfNZ = ry * sinTilt + rz * cosTilt;

    // Lambert shading (light in world/view space)
    const dot = transfNX * LX + transfNY * LY + transfNZ * LZ;
    const shade = AMBIENT + DIFFUSE * Math.max(0, dot);

    faces.push({
      ax: cx + ax * scale,
      ay: cy - ay * scale,
      bx: cx + bx * scale,
      by: cy - by * scale,
      cx: cx + ccx * scale,
      cy: cy - ccy * scale,
      z,
      shade,
    });
  }

  // ─── Sort back → front (painter's algorithm) ────────────────────────────
  faces.sort((a, b) => a.z - b.z);

  // ─── Draw ────────────────────────────────────────────────────────────────
  g2d.clearRect(0, 0, w, h);

  const [hr, hg, hb] = tint;
  const [sr, sg, sb] = tintShadow;

  for (const face of faces) {
    const t = face.shade; // 0 (shadow) → 1 (highlight)
    const r = (sr + (hr - sr) * t) | 0;
    const gv = (sg + (hg - sg) * t) | 0;
    const bv = (sb + (hb - sb) * t) | 0;

    g2d.beginPath();
    g2d.moveTo(face.ax, face.ay);
    g2d.lineTo(face.bx, face.by);
    g2d.lineTo(face.cx, face.cy);
    g2d.closePath();
    g2d.fillStyle = `rgb(${r},${gv},${bv})`;
    g2d.fill();
  }
}
