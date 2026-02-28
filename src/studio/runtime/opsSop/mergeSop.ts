import type { SopGeometry, SopOpEval } from "../typesRuntime";

export const evalMergeSop: SopOpEval = ({ nodeId, evalSOP, inputMap }) => {
  const in0Id = inputMap[nodeId]?.["in"];
  const in1Id = inputMap[nodeId]?.["in1"];

  const geom0 = in0Id ? evalSOP(in0Id) : null;
  const geom1 = in1Id ? evalSOP(in1Id) : null;

  // If only one input is connected, pass it through
  if (!geom0 && !geom1) return null;
  if (!geom0) return geom1;
  if (!geom1) return geom0;

  return mergeGeometry(geom0, geom1);
};

function mergeGeometry(a: SopGeometry, b: SopGeometry): SopGeometry {
  const vertexCount = a.vertexCount + b.vertexCount;
  const faceCount   = a.faceCount   + b.faceCount;

  const positions = new Float32Array(vertexCount * 3);
  positions.set(a.positions);
  positions.set(b.positions, a.positions.length);

  const normals = new Float32Array(vertexCount * 3);
  normals.set(a.normals);
  normals.set(b.normals, a.normals.length);

  // Offset b's indices so they point into the combined vertex array
  const indices = new Uint32Array(faceCount * 3);
  indices.set(a.indices);
  const offset = a.vertexCount;
  for (let i = 0; i < b.indices.length; i++) {
    indices[a.indices.length + i] = b.indices[i] + offset;
  }

  return { positions, normals, indices, vertexCount, faceCount };
}
