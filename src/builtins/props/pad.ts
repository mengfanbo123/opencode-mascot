import type { PropPack } from "../../core/types";

const W = 12;

const OUTER_TOP = "╭.•" + "─".repeat(14) + "╮";
const INNER_TOP = "│ ┌" + "─".repeat(W) + "┐ │";
const INNER_BOT = "│ └" + "─".repeat(W) + "┘ │";
const DOT_ROW = "│ " + " ".repeat(6) + "◉" + " ".repeat(7) + " │";
const OUTER_BOT = "╰" + "─".repeat(16) + "╯";

const scr = (rows: string[]) =>
  rows.map((r) => "│ │" + r.padEnd(W) + "│ │");

const games: string[][] = [
  ["  ☆  ᵇᵉᵍⁱⁿ ", "(^-^) ◯→  ●", " ┃█┃  ˢ:0  ", "           "],
  ["  ☆       ", "(^-^) ◯◯→ ●", " ┃█┃  ˢ:1  ", "           "],
  ["  ☆       ", "(×_×) ◯◯💥 ", " ┃█┃  ᵍᵍ!  ", "           "],
  ["  ☆       ", "(╥_╥)      ", " ┃█┃  ˢ:1  ", " ᵍᵃᵐᵉᵒᵛᵉʳ "],
  ["  ☆       ", "(¬_¬) ᵃᵍᵃⁱⁿ", " ┃█┃       ", "           "],
  ["  ☆  ᵍᵒ!  ", "(^-^) ◯→  ●", " ┃█┃  ˢ:0  ", "           "],
  ["  ☆  ᵇᵉᵍⁱⁿ ", "(^-^)  ▣   ", " ┃█┃       ", "           "],
  ["  ☆       ", "(^-^) ▣▣   ", " ┃█┃ ▣▣▣▣  ", "           "],
  ["  ☆       ", "(×_×)      ", " ┃█┃ ▣▣▣▣▣▣", "  ᶠᵘˡˡ!    "],
  ["  ☆       ", "(╥_╥)      ", " ┃█┃       ", " ᵍᵃᵐᵉᵒᵛᵉʳ "],
  ["  ☆  ᵇᵉᵍⁱⁿ ", "(^-^) [ 2 ]", " ┃█┃       ", "           "],
  ["  ☆       ", "(^-^) [ 4 ]", " ┃█┃  ᵒᵒⁿ  ", "           "],
  ["  ☆       ", "(⊙_⊙) [128]", " ┃█┃  ʷᵒʷ  ", "           "],
  ["  ☆       ", "(╥_╥)      ", " ┃█┃       ", " ᵍᵃᵐᵉᵒᵛᵉʳ "],
  ["  ☆       ", "(^-^) ⁿᵉˣᵗ!", " ┃█┃       ", "           "],
];

const frames: string[][] = games.map((rows) => [
  OUTER_TOP,
  INNER_TOP,
  ...scr(rows),
  INNER_BOT,
  DOT_ROW,
  OUTER_BOT,
]);

export const padProp: PropPack = {
  name: "pad",
  frames,
  frameInterval: 1000,
  trigger: "busy",
  position: "front",
  weight: 0.35,
};
