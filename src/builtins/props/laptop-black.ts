import type { PropPack } from "../../core/types";

const W = 14;
const TOP = "┌" + "─".repeat(W) + "┐";
const BOT = "└" + "─".repeat(6) + "||" + "─".repeat(6) + "┘";
const BASE = " ".repeat(4) + "▓".repeat(8) + " ".repeat(4);
const ln = (s: string) => "│" + s.padEnd(W) + "│";

const pad = (s: string) => s.padEnd(W).slice(0, W);

const black = "█".repeat(6);
const row1 = pad(" ".repeat(4) + black + " ".repeat(4));
const row2 = pad(" ".repeat(4) + black + " ".repeat(4));

const frames: string[][] = [[
  TOP,
  ln(row1),
  ln(row2),
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
