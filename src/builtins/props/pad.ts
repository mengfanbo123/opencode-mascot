import type { PropPack } from "../../core/types";
import { globalCurrentName } from "../../core/mascot-state";
import { yueerPadFrames } from "../yueer/frames-pad";
import { catPadFrames } from "../cat/frames-pad";
import { baoziPadFrames } from "../baozi/frames-pad";

export const padProp: PropPack = {
  name: "pad",
  get frames(): string[][] {
    const name = globalCurrentName();
    if (name === "cat") return catPadFrames;
    if (name === "baozi") return baoziPadFrames;
    return yueerPadFrames;
  },
  frameInterval: 1000,
  trigger: "busy",
  position: "front",
  weight: 0.3,
};
