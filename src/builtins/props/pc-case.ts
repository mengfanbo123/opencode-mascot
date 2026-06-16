import type { PropPack } from "../../core/types";

const CW = 7;

const ln = (content: string, right = "|"): string =>
  "│" + content.padEnd(CW).slice(0, CW) + "│" + right;

const TOP = "┌" + "─".repeat(CW) + "┐┐";
const BOT = "└" + "─".repeat(CW) + "┘┘";

const frames: string[][] = [
  [
    TOP,
    ln("▏▕▣▓▓▓▓"),
    ln("■●○○○○~"),
    ln("▏▕╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤", "/"),
    BOT,
  ],
  [
    TOP,
    ln("▏▕▣▓▓▓▓"),
    ln("■○●○○○~"),
    ln("▏▕╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤", "/"),
    BOT,
  ],
  [
    TOP,
    ln("▏▕▣▓▓▓▓"),
    ln("■●●●○○~"),
    ln("▏▕╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤", "/"),
    BOT,
  ],
  [
    TOP,
    ln("▏▕▣▓▓▓▓"),
    ln("■●○●○○~"),
    ln("▏▕╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤", "/"),
    BOT,
  ],
];

export const pcCaseProp: PropPack = {
  name: "pc-case",
  frames,
  frameInterval: 600,
  trigger: "busy",
  position: "side-right",
  weight: 0.3,
};
