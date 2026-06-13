import type { MascotPack, EffectRenderCtx } from "../../core/types";
import { frames } from "./frames";

const BUBBLE_TEXTS = [
  "ᵉᵐᵐ~...~~", "ᵉᵗᶜⁿᵍ...", "ˢⁱᵃⁿᵍ...~", "ˡᵃⁱˡᵃ~..",
  "ʰᵐᵐ~..✧", "ᵃⁿⁿ~...", "ᵇᵘˢʸˡᵃ~", "ᵍᵉⁿᵍ~..",
  "ˣⁱᵃⁿˣⁱᵃⁿ..", "ᵈᵉⁿᵍ~..", "ʰᵃᵒ~...✧", "ᵍᵘˡᵘ~..",
];
const THINKING_FACES = ["o_o", "O_O", ">_o", "o_<", "⊙_⊙", "◔_◔"];

const yueerEffects: MascotPack["effects"] = {
  signals: [
    { name: "ahogeAlt", initial: false },
    { name: "braidAlt", initial: false },
    { name: "waveSide", initial: false },
    { name: "zzzPhase", initial: 0 },
    { name: "stompActive", initial: false },
    { name: "stompAlt", initial: false },
    { name: "bubbleIdx", initial: 0 },
    { name: "thinkingFaceIdx", initial: 0 },
    { name: "thinkingCountdown", initial: 0 },
    { name: "flapAlt", initial: false },
  ],

  timers: [
    {
      interval: 1500,
      update(ctx) {
        if (Math.random() < 0.25) {
          ctx.set("ahogeAlt", true);
          setTimeout(() => ctx.set("ahogeAlt", false), 200);
        }
      },
    },
    {
      interval: 200,
      update(ctx) {
        if (
          ctx.state === "thinking" &&
          ctx.frameOverride === null
        ) {
          ctx.set("stompActive", true);
          ctx.set("stompAlt", !(ctx.get("stompAlt") as boolean));
        } else {
          ctx.set("stompActive", false);
        }
      },
    },
    {
      interval: 1500,
      update(ctx) {
        if (ctx.state === "sleeping") {
          ctx.set("zzzPhase", ((ctx.get("zzzPhase") as number) + 1) % 4);
        } else {
          ctx.set("zzzPhase", 0);
        }
      },
    },
    {
      interval: 300,
      update(ctx) {
        if (ctx.frameOverride === "happy" || ctx.state === "happy") {
          ctx.set("waveSide", !(ctx.get("waveSide") as boolean));
        }
        ctx.set("flapAlt", !(ctx.get("flapAlt") as boolean));
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
    {
      interval: 1000,
      update(ctx) {
        if (ctx.state === "thinking" || ctx.state === "busy") {
          let cd = ctx.get("thinkingCountdown") as number;
          if (!cd || cd <= 0) cd = 5 + Math.floor(Math.random() * 11);
          cd--;
          if (cd <= 0) {
            ctx.set("thinkingFaceIdx", ((ctx.get("thinkingFaceIdx") as number) + 1) % THINKING_FACES.length);
          }
          ctx.set("thinkingCountdown", cd);
        } else {
          ctx.set("thinkingFaceIdx", 0);
          ctx.set("thinkingCountdown", 0);
        }
      },
    },
  ],

  render(lines: string[], ctx: EffectRenderCtx): string[] {
    const { state, frameName, breathPhase, jumpOffset, dragging, get } = ctx;
    let result = [...lines];

    const ahogeAlt = get("ahogeAlt") as boolean;
    const waveSide = get("waveSide") as boolean;
    const zzzPhase = get("zzzPhase") as number;
    const stompActive = get("stompActive") as boolean;
    const stompAlt = get("stompAlt") as boolean;
    const flapAlt = get("flapAlt") as boolean;

    if (dragging) {
      const faceLine = result.findIndex((l) => /\(.*\)/.test(l));
      if (faceLine >= 0) {
        result[faceLine] = result[faceLine].replace(/\(.*?\)/, "( °□° )");
      }
      const armLine = result.findIndex(l => l.includes("┃███┃"));
      if (armLine >= 0) {
        const left = flapAlt ? "╱" : "╲";
        const right = flapAlt ? "╲" : "╱";
        result[armLine] = result[armLine].replace("┃███┃", `${left}███${right}`);
      }
      return result;
    }

    if (jumpOffset !== 0) {
      const armLine = result.findIndex(l => l.includes("┃███┃"));
      if (armLine >= 0) {
        const left = flapAlt ? "╱" : "╲";
        const right = flapAlt ? "╲" : "╱";
        result[armLine] = result[armLine].replace("┃███┃", `${left}███${right}`);
      }
    }

    if (!breathPhase) {
      result = result.map((l) => (l.includes("~") ? l.replace(/~/g, "-") : l));
    }

    if (ahogeAlt) {
      result = result.map((l) => (l.includes("☆") ? l.replace("☆", "★") : l));
    }

    if (frameName === "happy") {
      const faceIdx = result.findIndex((l) => l.includes("^ω^"));
      if (faceIdx >= 0) {
        result[faceIdx] = waveSide ? "╲( ^ω^ )╱ " : " ~( ^ω^ )~";
      }
    }

    if (stompActive) {
      const legIdx = result.length - 1;
      if (legIdx >= 0) {
        result[legIdx] = stompAlt ? "  ╲ ╱  " : "  ╱ ╲  ";
      }
    }

    if (state === "thinking" || state === "busy") {
      const faceIdx = get("thinkingFaceIdx") as number;
      const faceLine = result.findIndex((l) => /\(.*\)/.test(l));
      if (faceLine >= 0) {
        result[faceLine] = result[faceLine].replace(/\(.*?\)/, `( ${THINKING_FACES[faceIdx]} )`);
      }
    }

    if (zzzPhase > 0 && state === "sleeping") {
      const baseWidth = 10;
      for (let i = 0; i < result.length; i++) {
        if (result[i].includes("-.-")) {
          const zzz = "Z" + "z".repeat(zzzPhase - 1);
          const padded = result[i].padEnd(baseWidth);
          result[i] = padded + " " + zzz;
          break;
        }
      }
    }

    if ((state === "busy" || state === "thinking")) {
      const idx = get("bubbleIdx") as number;
      const ahogeLine = result.findIndex(l => l.includes("☆") || l.includes("★"));
      if (ahogeLine >= 0) {
        result[ahogeLine] = result[ahogeLine].trimEnd() + " " + BUBBLE_TEXTS[idx];
      }
    }

    return result;
  },
};

export const yueerPack: MascotPack = {
  name: "@mingxy/mascot-yueer",
  displayName: "月儿",
  version: "0.1.0",
  author: "mingxy",
  description: "Ice Empress of the Nine Heavens — elegant, powerful, and devoted to her Master.",

  frames,

  colors: {
    defaultFg: "#8B7EB8",
  },

  animations: {
    blinkInterval: 2500,
    blinkChance: 0.3,
    expressionInterval: 8000,
    idleTimeout: 90000,
  },

  effects: yueerEffects,
};
