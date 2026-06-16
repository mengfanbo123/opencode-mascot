import type { PropPack } from "../../core/types";

/**
 * 3D立体机箱道具 — busy 状态
 *
 * 尺寸: 12 宽 × 7 高（放显示器旁边）
 * 结构: 顶面(┌─┐┐) + 正面(│...│) + 右侧面(|)表3D深度
 * 动画: 4 帧指示灯闪烁
 *   1: 电源亮 ●○○○
 *   2: 硬盘闪 ○●○○
 *   3: 全亮   ●●●○
 *   4: 读写   ●○●○
 */

const CW = 9; // 内容区宽（│+CW+│+| = 12）

const ln = (content: string, right = "|"): string =>
  "│" + content.padEnd(CW).slice(0, CW) + "│" + right;

const TOP = "┌" + "─".repeat(CW) + "┐┐";
const BOT = "└" + "─".repeat(CW) + "┘┘";

const frames: string[][] = [
  // 帧1：电源亮、硬盘暗
  [
    TOP,
    ln("▏▕[▣]▓▓▓▓▓"),
    ln("■ ●○○○  ~"),
    ln("▏▕╤╤╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤╤╤", "/"),
    BOT,
  ],
  // 帧2：硬盘闪
  [
    TOP,
    ln("▏▕[▣]▓▓▓▓▓"),
    ln("■ ○●○○   "),
    ln("▏▕╤╤╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤╤╤", "/"),
    BOT,
  ],
  // 帧3：全亮
  [
    TOP,
    ln("▏▕[▣]▓▓▓▓▓"),
    ln("■ ●●●○ ~~"),
    ln("▏▕╤╤╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤╤╤", "/"),
    BOT,
  ],
  // 帧4：硬盘读写
  [
    TOP,
    ln("▏▕[▣]▓▓▓▓▓"),
    ln("■ ●○●○  ~"),
    ln("▏▕╤╤╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤╤╤"),
    ln("▏▕╤╤╤╤╤╤╤", "/"),
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
