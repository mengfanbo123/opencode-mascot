import type { PropPack } from "../../core/types";

const CW = 7;
const ln = (content: string, right = "|"): string =>
  "│" + content.padEnd(CW).slice(0, CW) + "│" + right;
const TOP = "┌" + "─".repeat(CW) + "┐┐";
const BOT = "└" + "─".repeat(CW) + "┘┘";

const frames: string[][] = [[
  TOP,
  ln("▏▕ ▓▓▓▓"),
  ln("■○○○○○~"),
  ln("▏▕╤╤╤╤╤"),
  ln("▏▕╤╤╤╤╤"),
  ln("▏▕╤╤╤╤╤", "/"),
  BOT,
]];

export const pcCaseBlackProp: PropPack = {
  name: "pc-case-black",
  frames,
  frameInterval: 0,
  trigger: "busy",
  position: "side-right",
  weight: 0,
};
