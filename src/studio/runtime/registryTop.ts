import type { NodeKind } from "../state/studioStore";
import type { TopOpEval } from "./typesRuntime";

import { evalNoise } from "./opsTop/noise";
import { evalRamp } from "./opsTop/ramp";
import { evalLookup } from "./opsTop/lookup";
import { evalOutput } from "./opsTop/output";
import { evalConstant } from "./opsTop/constant";
import { evalTransform } from "./opsTop/transform";
import { evalLevel } from "./opsTop/level";
import { evalHsvAdjust } from "./opsTop/hsvAdjust";
import { evalBlur } from "./opsTop/blur";
import { evalEdgeDetect } from "./opsTop/edgeDetect";
import { evalComposite } from "./opsTop/composite";
import { evalTextTop } from "./opsTop/textTop";

export const TOP_REGISTRY: Partial<Record<NodeKind, TopOpEval>> = {
  noise: evalNoise,
  ramp: evalRamp,
  lookup: evalLookup,
  output: evalOutput,

  constant: evalConstant,
  transform: evalTransform,
  level: evalLevel,
  hsvAdjust: evalHsvAdjust,
  blur: evalBlur,
  edgeDetect: evalEdgeDetect,

  over: evalComposite,
  add: evalComposite,
  multiply: evalComposite,
  screen: evalComposite,
  subtract: evalComposite,

  textTop: evalTextTop,
};
