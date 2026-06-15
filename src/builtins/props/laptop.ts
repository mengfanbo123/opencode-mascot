import type { PropPack } from "../../core/types";

/**
 * 显示器道具 — busy 状态主力道具
 *
 * 尺寸: 16 宽 × 4 高
 * 结构: 屏幕框(┌┐) + 2行内容(提示符+状态) + 底座连接(||) + 底座(▓)
 * 动画: 8 帧屏幕状态轮播
 *   1-2: 光标闪（>_ ↔ > ）
 *   3: thinking
 *   4: writing
 *   5: git push
 *   6: bug!
 *   7: npm install
 *   8: done ✓
 * $ 保留，opencode 火星文，无空格
 */

const W = 14; // 屏幕内容区宽

const TOP = "┌" + "─".repeat(W) + "┐";
const BOT = "└" + "─".repeat(6) + "||" + "─".repeat(6) + "┘";
const BASE = "▓".repeat(16);

const ln = (s: string) => "│" + s.padEnd(W) + "│";

const states = [
  ">_",
  "> ",
  ">ᵗʰⁿᵏⁱⁿᵍ...",
  ">ʷʳⁱᵗⁱⁿᵍ...",
  ">ᵍⁱᵗᵖᵘˢʰ...",
  ">ᵇᵘᵍ!ᵇᵘᵍ!",
  ">ⁿᵖᵐⁱⁿˢᵗᵃˡˡ",
  ">ᵈᵒⁿᵉ✓",
];

const frames: string[][] = states.map((st) => [
  TOP,
  ln("~$ᵒᵖᵉⁿᶜᵒᵈᵉ"),
  ln(st),
  BOT,
  BASE,
]);

export const laptopProp: PropPack = {
  name: "laptop",
  frames,
  frameInterval: 800,
  trigger: "busy",
  position: "side-right",
  weight: 0.7,
};
