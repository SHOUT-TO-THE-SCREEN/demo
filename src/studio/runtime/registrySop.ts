import type { NodeKind } from "../state/studioStore";
import type { SopOpEval } from "./typesRuntime";

import { evalSphereSop } from "./opsSop/sphere";
import { evalGridSop } from "./opsSop/grid";
import { evalNoiseSop } from "./opsSop/noiseSop";

export const SOP_REGISTRY: Partial<Record<NodeKind, SopOpEval>> = {
  sphereSop: evalSphereSop,
  gridSop: evalGridSop,
  noiseSop: evalNoiseSop,
};

export const SOP_KINDS = new Set<NodeKind>(["sphereSop", "gridSop", "noiseSop"]);
