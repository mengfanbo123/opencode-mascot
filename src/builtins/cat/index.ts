import type { MascotPack, EffectRenderCtx } from "../../core/types";
import { frames } from "./frames";

const PURR_TEXTS = [
  "ᵖᵘʳʳʳ~", "ᵐʳʳᵒʷ~", "ᵐʷᵃᵃ~", "ⁿʸᵃᵃ~",
  "ᵖᵘʳʳ..", "ᵐʸᵃ~..", "ᶠᵘʳʳ~", "ᵐⁱᵃᵒ~",
  "ᶜʰᵘʳʳ..", "ᵉᵘⁿ~..", "ˢʰᵖᵘʳʳ~", "ⁿʸᵒ~",
];
const THINKING_FACES = ["o_o", "O_O", ">_o", "o_<", "⊙_⊙", "◑_◑"];

// Neck lines per state — injected as a random-event animation.
// Frames no longer carry the neck row; it is spliced in here when neckExtended.
const NECK_LINES: Record<string, string> = {
  default: "  > ^ <   ",
  happy: "  > ω <   ",
  thinking: "  > ? <   ",
  sleeping: "  > z <   ",
};

const catEffects: MascotPack["effects"] = {
  signals: [
    { name: "tailAlt", initial: false },
    { name: "earTwitch", initial: false },
    { name: "pupilWide", initial: false },
    { name: "kneadAlt", initial: false },
    { name: "purrIdx", initial: 0 },
    { name: "thinkingFaceIdx", initial: 0 },
    { name: "thinkingCountdown", initial: 0 },
    { name: "neckExtended", initial: false },
  ],

  timers: [
    {
      interval: 600,
      update(ctx) {
        ctx.set("tailAlt", !(ctx.get("tailAlt") as boolean));
      },
    },
    {
      interval: 2500,
      update(ctx) {
        if (Math.random() < 0.2) {
          ctx.set("earTwitch", true);
          setTimeout(() => ctx.set("earTwitch", false), 250);
        }
      },
    },
    {
      interval: 4000,
      update(ctx) {
        if (ctx.state === "idle" && Math.random() < 0.15) {
          ctx.set("pupilWide", true);
          setTimeout(() => ctx.set("pupilWide", false), 1000);
        }
      },
    },
    {
      interval: 400,
      update(ctx) {
        if (ctx.state === "idle") {
          ctx.set("kneadAlt", !(ctx.get("kneadAlt") as boolean));
        }
      },
    },
    {
      interval: 2000,
      update(ctx) {
        if (ctx.state === "busy" || ctx.state === "thinking") {
          ctx.set("purrIdx", ((ctx.get("purrIdx") as number) + 1) % PURR_TEXTS.length);
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
    {
      interval: 7000,
      update(ctx) {
        if (ctx.state === "idle" && Math.random() < 0.25) {
          ctx.set("neckExtended", true);
          setTimeout(() => ctx.set("neckExtended", false), 1400);
        }
      },
    },
  ],

  render(lines: string[], ctx: EffectRenderCtx): string[] {
    const { state, breathPhase, dragging, get } = ctx;
    let result = [...lines];

    const tailAlt = get("tailAlt") as boolean;
    const earTwitch = get("earTwitch") as boolean;
    const pupilWide = get("pupilWide") as boolean;
    const kneadAlt = get("kneadAlt") as boolean;

    if (dragging) {
      result[0] = "  /╲╱╲\\   ";
      result[1] = " ( >.< )  ";
      result[2] = " /|   |\\  ";
      result[3] = "(_|   |_) ";
      return result;
    }

    if (!breathPhase) {
      result = result.map((l) => l.replace(/\^/g, "'"));
    }

    if (earTwitch) {
      result[0] = result[0].replace("/\\_/\\", "/╲_/\\");
    }

    if (tailAlt) {
      result[3] = "(_|   |~) ";
    } else {
      result[3] = "(_|   |_) ";
    }

    if (pupilWide) {
      const faceLine = result.findIndex((l) => /\(.*\)/.test(l));
      if (faceLine >= 0) {
        result[faceLine] = result[faceLine].replace("o.o", "@.@");
      }
    }

    if (state === "idle") {
      const armLine = result.findIndex((l) => l.includes("/|   |\\"));
      if (armLine >= 0) {
        result[armLine] = kneadAlt ? " /||  |\\  " : " /|  ||\\  ";
      }
    }

    if (state === "thinking" || state === "busy") {
      const faceIdx = get("thinkingFaceIdx") as number;
      const faceLine = result.findIndex((l) => /\(.*\)/.test(l));
      if (faceLine >= 0) {
        result[faceLine] = result[faceLine].replace(/\(.*?\)/, `( ${THINKING_FACES[faceIdx]} )`);
      }
    }

    if (state === "busy" || state === "thinking") {
      const idx = get("purrIdx") as number;
      const earLine = 0;
      result[earLine] = result[earLine].trimEnd() + " " + PURR_TEXTS[idx];
    }

    const neckExtended = get("neckExtended") as boolean;
    if (neckExtended) {
      result.splice(2, 0, NECK_LINES[state] || NECK_LINES.default);
    }

    return result;
  },
};

export const catPack: MascotPack = {
  name: "@mingxy/mascot-cat",
  displayName: "小猫",
  version: "0.1.0",
  author: "mingxy",
  description: "Orange tabby cat — purring, kneading, and knocking things off your terminal.",

  frames,

  colors: {
    defaultFg: "#FFA500",
  },

  animations: {
    blinkInterval: 2500,
    blinkChance: 0.3,
    expressionInterval: 8000,
    idleTimeout: 90000,
  },

  effects: catEffects,
};
