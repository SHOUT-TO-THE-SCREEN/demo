import type { NodeKind } from "../state/studioStore";
import type { SopOpEval } from "./typesRuntime";

import { evalSphereSop } from "./opsSop/sphere";
import { evalGridSop } from "./opsSop/grid";
import { evalNoiseSop } from "./opsSop/noiseSop";
import { evalTorusSop } from "./opsSop/torus";
import { evalMergeSop } from "./opsSop/mergeSop";

export const SOP_REGISTRY: Partial<Record<NodeKind, SopOpEval>> = {
  sphereSop: evalSphereSop,
  gridSop: evalGridSop,
  noiseSop: evalNoiseSop,
  torusSop: evalTorusSop,
  mergeSop: evalMergeSop,
};

export const SOP_KINDS = new Set<NodeKind>(["sphereSop", "gridSop", "noiseSop", "torusSop", "mergeSop"]);
