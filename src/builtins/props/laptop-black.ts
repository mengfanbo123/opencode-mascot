import type { PropPack } from "../../core/types";

const W = 14;
const TOP = "┌" + "─".repeat(W) + "┐";
const BOT = "└" + "─".repeat(6) + "||" + "─".repeat(6) + "┘";
const BASE = " ".repeat(4) + "▓".repeat(8) + " ".repeat(4);
const ln = (s: string) => "│" + s.padEnd(W) + "│";

const full = "░▒▒▓▓▓██▓▓▓▒▒░".slice(0, W).padEnd(W, "░");

const frames: string[][] = [[
  TOP,
  ln(full),
  ln(full),
  BOT,
  BASE,
]];

export const laptopBlackProp: PropPack = {
  name: "laptop-black",
  frames,
  frameInterval: 0,
  trigger: "busy",
  position: "side-right",
  weight: 0,
};
