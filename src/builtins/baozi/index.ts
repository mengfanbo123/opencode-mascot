import type { MascotPack } from "../../core/types";
import { frames } from "./frames";

const STEAM_PATTERNS = [
  "  ~∘◦~   ",
  "  ~◦∘~   ",
  "   ∘◦~   ",
  "   ◦∘~   ",
];

const BUBBLE_TEXTS = [
  "ᵃⁿᵍ~", "ˣᶦᵃⁿ!", "ᵏᵘᵃⁱ", "ᶠᵃⁱ",
  "ʳᵉⁿ~..", "ᵖᵃⁿ~", "ᵗᵃⁿᵍ!", "ʸᵉ~..",
  "ᵐⁱᵃⁿ~", "ᵍᵘᵒ!", "ˢʰᵘ~..", "ʰᵘᵒ~",
];

const baoziEffects: MascotPack["effects"] = {
  signals: [
    { name: "steamPhase", initial: 0 },
    { name: "bubbleIdx", initial: 0 },
  ],

  timers: [
    {
      interval: 1200,
      update(ctx) {
        ctx.set("steamPhase", ((ctx.get("steamPhase") as number) + 1) % STEAM_PATTERNS.length);
      },
    },
    {
      interval: 2500,
      update(ctx) {
        if (ctx.state === "busy" || ctx.state === "thinking") {
          ctx.set("bubbleIdx", ((ctx.get("bubbleIdx") as number) + 1) % BUBBLE_TEXTS.length);
        }
      },
    },
  ],

  render(lines, ctx) {
    const steamPhase = ctx.get("steamPhase") as number;

    if (ctx.dragging) {
      const faceIdx = lines.findIndex(l => /\(.*\)/.test(l));
      if (faceIdx >= 0) {
        lines[faceIdx] = lines[faceIdx].replace(/\(.*?\)/, "( °□° )");
      }
      return lines;
    }

    if (lines.length > 0) {
      lines[0] = STEAM_PATTERNS[steamPhase];
    }

    if (ctx.state === "sleeping") {
      const zzzPhase = ((ctx.get("steamPhase") as number) % 3) + 1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("-.-")) {
          const padded = lines[i].padEnd(10);
          lines[i] = padded + " " + "Z" + "z".repeat(zzzPhase - 1);
          break;
        }
      }
    }

    if (ctx.state === "busy" || ctx.state === "thinking") {
      const idx = ctx.get("bubbleIdx") as number;
      if (lines.length > 0) {
        lines[0] = STEAM_PATTERNS[steamPhase] + BUBBLE_TEXTS[idx];
      }
    }

    return lines;
  },
};

export const baoziPack: MascotPack = {
  name: "@mingxy/mascot-baozi",
  displayName: "包子",
  version: "0.1.0",
  author: "mingxy",
  description: "A warm steamed bun mascot — soft, round, and always fresh.",

  frames,

  colors: {
    defaultFg: "#D4885A",
  },

  animations: {
    blinkInterval: 3000,
    blinkChance: 0.25,
    expressionInterval: 10000,
    idleTimeout: 120000,
  },

  sidebar: {
    greetings: ["热乎乎的包子出炉啦~"],
    busyPhrases: ["蒸包子中..."],
  },

  bubbleTexts: ["蒸着...", "发酵中...", "冒热气...", "快熟了..."],

  effects: baoziEffects,
};
