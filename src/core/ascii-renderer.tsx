/** @jsxImportSource @opentui/solid */

import { createSignal, onCleanup } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack, MascotState, EffectTimerCtx, EffectRenderCtx } from "./types";

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", ".": "·",
};

function toSuperscript(s: string): string {
  return s.split("").map(c => SUPERSCRIPT[c] ?? c).join("");
}

const STATE_TO_FRAME: Record<MascotState, string> = {
  idle: "default",
  busy: "default",
  happy: "happy",
  thinking: "thinking",
  sleeping: "sleeping",
};

const DEFAULT_ANIM = {
  blinkInterval: 2500,
  blinkChance: 0.3,
  expressionInterval: 8000,
  idleTimeout: 120000,
  breathInterval: 3000,
  walkEnabled: true,
  walkMinDelay: 20000,
  walkMaxDelay: 40000,
  jumpMinDelay: 20000,
  jumpMaxDelay: 40000,
};

const WALK_PATH = [1, 2, 3, 4, 3, 2, 1, 0, -1, -2, -3, -2, -1, 0];

const FLASH_COLORS = ["#FF006E", "#FFBE0B", "#8338EC", "#3A86FF", "#FB5607", "#06FFA5", "#FF4081", "#00E5FF"];
const DRAG_MSGS = ["ᶠᵃⁿᵍ!..", "ᵏᵃⁱ~..", "ᵇᵘᶠᵃⁿᵍ~..", "ʷᵒ~..", "ⁿⁱᵘ~..", "ᵃᵃ~.."];

function getFrameLines(pack: MascotPack, frameName: string): string[] {
  const frames = pack.frames as Record<string, string[] | undefined>;
  return frames[frameName] ?? frames["default"] ?? [];
}

export function createAnimatedRenderer(pack: MascotPack): {
  element: () => JSX.Element;
  setState: (s: MascotState) => void;
  toggleWalk: () => void;
  setDragging: (v: boolean) => void;
  celebrateUpdate: (newVersion: string) => void;
  bounce: () => void;
  showVersion: (version: string) => void;
} {
  const anim = { ...DEFAULT_ANIM, ...pack.animations };
  const fg = pack.colors?.defaultFg || undefined;
  const effects = pack.effects;

  const [currentState, setCurrentState] = createSignal<MascotState>("idle");
  const [frameOverride, setFrameOverride] = createSignal<string | null>(null);
  const [breathPhase, setBreathPhase] = createSignal(true);
  const [walkOffset, setWalkOffset] = createSignal(0);
  const [jumpOffset, setJumpOffset] = createSignal(0);
  const [walkEnabled, setWalkEnabled] = createSignal(anim.walkEnabled ?? true);
  const [dragging, setDraggingSignal] = createSignal(false);
  const [celebrate, setCelebrate] = createSignal<{ text: string; count: number } | null>(null);
  const [flashColor, setFlashColor] = createSignal<string | null>(null);
  const [dragMsg, setDragMsg] = createSignal<string | null>(null);

  let flashTimer: ReturnType<typeof setInterval> | null = null;
  let dragMsgTimer: ReturnType<typeof setInterval> | null = null;
  let bounceTimers: ReturnType<typeof setTimeout>[] = [];
  let celebrateTimers: ReturnType<typeof setTimeout>[] = [];
  let versionTimer: ReturnType<typeof setTimeout> | null = null;

  const stopFlash = () => {
    if (flashTimer) { clearInterval(flashTimer); flashTimer = null; }
  };
  const stopDragMsg = () => {
    if (dragMsgTimer) { clearInterval(dragMsgTimer); dragMsgTimer = null; }
    setDragMsg(null);
  };
  const stopBounce = () => {
    bounceTimers.forEach(t => { clearTimeout(t); });
    bounceTimers = [];
  };
  const stopCelebrate = () => {
    celebrateTimers.forEach(t => { clearTimeout(t); });
    celebrateTimers = [];
  };
  const stopVersion = () => {
    if (versionTimer) { clearTimeout(versionTimer); versionTimer = null; }
    setCelebrate(null);
  };

  const stopAllAnimations = () => {
    stopFlash();
    stopBounce();
    stopCelebrate();
    stopVersion();
    setJumpOffset(0);
  };

  let idleSleepTimeout: ReturnType<typeof setTimeout> | null = null;

  const resetIdleSleep = () => {
    if (idleSleepTimeout) clearTimeout(idleSleepTimeout);
    idleSleepTimeout = null;
    if (currentState() !== "idle") return;
    idleSleepTimeout = setTimeout(() => {
      if (currentState() === "idle") {
        setCurrentState("sleeping");
        stopWalk();
      }
    }, anim.idleTimeout);
  };

  resetIdleSleep();

  // ─── Extra signals from pack effects ───
  const extraSignals = new Map<string, [() => unknown, (v: unknown) => void]>();
  if (effects?.signals) {
    for (const sig of effects.signals) {
      const [get, set] = createSignal(sig.initial);
      extraSignals.set(sig.name, [get, set]);
    }
  }

  const getExtra = (name: string): unknown => extraSignals.get(name)?.[0]() ?? null;
  const setExtra = (name: string, value: unknown) => extraSignals.get(name)?.[1](value);

  const timerCtx: EffectTimerCtx = {
    get: getExtra,
    set: setExtra,
    get state() { return currentState(); },
    get frameOverride() { return frameOverride(); },
    setFrameOverride: (name) => setFrameOverride(name),
  };

  // ─── Built-in timers ───

  // 1. Blink
  const hasBlink = (pack.frames as Record<string, string[] | undefined>)["blink"] !== undefined;

  const blinkTimer = setInterval(() => {
    if (currentState() !== "sleeping" && Math.random() < anim.blinkChance && hasBlink) {
      setFrameOverride("blink");
      setTimeout(() => setFrameOverride(null), 150);
    }
  }, anim.blinkInterval);

  // 2. Random expression
  const availableExpressions = Object.keys(pack.frames).filter(
    (k) => k !== "default" && k !== "blink",
  );

  const expressionTimer = setInterval(() => {
    if (currentState() === "idle" && !frameOverride()) {
      const pick = availableExpressions[Math.floor(Math.random() * availableExpressions.length)];
      if (pick) {
        setFrameOverride(pick);
        setTimeout(() => setFrameOverride(null), 2000);
      }
    }
  }, anim.expressionInterval);

  // 3. Breathing
  const breathTimer = setInterval(() => {
    if (currentState() === "idle") {
      setBreathPhase((v) => !v);
    }
  }, anim.breathInterval);

  // 4. Walk
  let walkStep = -1;
  let walkInterval: ReturnType<typeof setInterval> | null = null;

  const startWalk = () => {
    if (walkInterval || !walkEnabled()) return;
    walkStep = 0;
    walkInterval = setInterval(() => {
      if (currentState() !== "idle") {
        stopWalk();
        return;
      }
      if (walkStep < WALK_PATH.length) {
        setWalkOffset(WALK_PATH[walkStep]);
        walkStep++;
      } else {
        if (walkInterval) clearInterval(walkInterval);
        walkInterval = null;
        walkStep = -1;
        setWalkOffset(0);
      }
    }, 400);
  };

  const stopWalk = () => {
    if (walkInterval) {
      clearInterval(walkInterval);
      walkInterval = null;
    }
    walkStep = -1;
    setWalkOffset(0);
  };

  let walkTimeout: ReturnType<typeof setTimeout>;

  function scheduleNextWalk() {
    if (!walkEnabled()) return setTimeout(() => {}, 60000);
    const delay = anim.walkMinDelay + Math.floor(Math.random() * (anim.walkMaxDelay - anim.walkMinDelay));
    return setTimeout(() => {
      if (currentState() === "idle" && !frameOverride() && walkStep === -1 && walkEnabled()) {
        startWalk();
      }
      if (currentState() !== "sleeping") {
        walkTimeout = scheduleNextWalk();
      }
    }, delay);
  }

  walkTimeout = scheduleNextWalk();

  // 5. Jump
  let jumpTimeout: ReturnType<typeof setTimeout>;

  function scheduleNextJump() {
    const delay = anim.jumpMinDelay + Math.floor(Math.random() * (anim.jumpMaxDelay - anim.jumpMinDelay));
    return setTimeout(() => {
      if (currentState() === "idle" && !frameOverride() && walkStep === -1) {
        setJumpOffset(-2);
        setTimeout(() => setJumpOffset(-1), 1500);
        setTimeout(() => setJumpOffset(0), 2000);
      }
      if (currentState() !== "sleeping") {
        jumpTimeout = scheduleNextJump();
      }
    }, delay);
  }

  jumpTimeout = scheduleNextJump();

  // ─── Pack-defined effect timers ───
  const effectTimers: ReturnType<typeof setInterval>[] = [];
  if (effects?.timers) {
    for (const t of effects.timers) {
      effectTimers.push(setInterval(() => t.update(timerCtx), t.interval));
    }
  }

  // ─── Cleanup ───
  onCleanup(() => {
    clearInterval(blinkTimer);
    clearInterval(expressionTimer);
    clearInterval(breathTimer);
    clearTimeout(walkTimeout);
    clearTimeout(jumpTimeout);
    if (idleSleepTimeout) clearTimeout(idleSleepTimeout);
    if (walkInterval) clearInterval(walkInterval);
    for (const t of effectTimers) clearInterval(t);
    stopFlash();
    stopDragMsg();
    stopBounce();
    stopCelebrate();
    stopVersion();
  });

  // ─── Render ───
  const element = () => {
    breathPhase();
    walkOffset();
    jumpOffset();
    frameOverride();
    currentState();
    dragging();
    celebrate();
    flashColor();
    dragMsg();

    for (const [, [get]] of extraSignals) {
      get();
    }

    const frameName = frameOverride() ?? STATE_TO_FRAME[currentState()] ?? "default";
    const rawLines = getFrameLines(pack, frameName);
    const offset = walkOffset();

    const width = rawLines[0]?.length ?? 10;
    const blank = " ".repeat(width);

    let lines: string[] = rawLines.map((line, i) => {
      if (!breathPhase()) {
        if (i === 0) return blank;
        return rawLines[i - 1];
      }
      return line;
    });

    if (effects?.render) {
        const renderCtx: EffectRenderCtx = {
          state: currentState(),
          frameName,
          breathPhase: breathPhase(),
          jumpOffset: jumpOffset(),
          dragging: dragging(),
          get: getExtra,
        };
      lines = effects.render(lines, renderCtx);
    }

    const top = jumpOffset();
    const left = offset > 0 ? offset : 0;
    const cel = celebrate();
    const dm = dragMsg();

    return (
      <box flexDirection="column" left={left} top={top}>
        {cel ? <text fg={flashColor() ?? fg}>{cel.text}</text> : null}
        {dm ? <text fg="#FF4081">{dm}</text> : null}
        <box flexDirection="column" alignItems="flex-start">
          {lines.map((line: string) => (
            <text fg={flashColor() ?? fg} selectable={false}>{line}</text>
          ))}
        </box>
      </box>
    );
  };

  // ─── State control ───
  const setState = (s: MascotState) => {
    setCurrentState(s);
    setBreathPhase(true);
    resetIdleSleep();

    if (s !== "idle") {
      stopWalk();
    } else if (walkEnabled()) {
      walkTimeout = scheduleNextWalk();
      jumpTimeout = scheduleNextJump();
    }

    if (s === "thinking" || s === "busy") {
      stopFlash();
      flashTimer = setInterval(() => {
        setFlashColor(FLASH_COLORS[Math.floor(Math.random() * FLASH_COLORS.length)]);
      }, 120);
    } else {
      stopFlash();
    }
  };

  const toggleWalk = () => {
    const next = !walkEnabled();
    setWalkEnabled(next);
    if (!next) {
      stopWalk();
    } else if (currentState() === "idle") {
      walkTimeout = scheduleNextWalk();
    }
  };

  const setDragging = (v: boolean) => {
    setDraggingSignal(v);
    if (v) {
      if (currentState() === "sleeping") {
        setState("idle");
      }
      setJumpOffset(-1);
      stopDragMsg();
      setDragMsg(DRAG_MSGS[Math.floor(Math.random() * DRAG_MSGS.length)]);
      dragMsgTimer = setInterval(() => {
        setDragMsg(DRAG_MSGS[Math.floor(Math.random() * DRAG_MSGS.length)]);
      }, 800);
      stopFlash();
      flashTimer = setInterval(() => {
        setFlashColor(FLASH_COLORS[Math.floor(Math.random() * FLASH_COLORS.length)]);
      }, 100);
    } else {
      setJumpOffset(0);
      stopDragMsg();
      stopFlash();
    }
  };

  // 连续跳跃 + 吐火星文泡泡庆祝更新成功
  const celebrateUpdate = (newVersion: string) => {
    const bubbles = ["ᵘᵖ~", "ⁿᵉʷ!", "ʸᵉ~", "ᵍᵒ~", "ᵒᵏ~"];
    stopAllAnimations();
    setState("happy");
    setFrameOverride("happy");

    let step = 0;
    const JUMPS = 3;
    const tick = () => {
      if (step >= JUMPS) {
        setJumpOffset(0);
        setCelebrate(null);
        setFrameOverride(null);
        setState("idle");
        celebrateTimers = [];
        return;
      }
      setJumpOffset(step % 2 === 0 ? -2 : 0);
      const word = bubbles[Math.floor(Math.random() * bubbles.length)];
      setCelebrate({ text: `${word} ᵘᵖ→ᵛ${newVersion}`, count: step });
      step++;
      celebrateTimers.push(setTimeout(tick, 600));
    };
    tick();
  };

  const bounce = () => {
    stopBounce();
    stopCelebrate();
    if (currentState() === "sleeping") setState("idle");
    setJumpOffset(-3);
    bounceTimers.push(setTimeout(() => setJumpOffset(-2), 150));
    bounceTimers.push(setTimeout(() => setJumpOffset(-1), 300));
    bounceTimers.push(setTimeout(() => { setJumpOffset(0); bounceTimers = []; }, 450));
  };

  const showVersion = (version: string) => {
    stopVersion();
    setCelebrate({ text: `ᵛ${toSuperscript(version)}`, count: 0 });
    versionTimer = setTimeout(() => { setCelebrate(null); versionTimer = null; }, 3000);
  };

  return { element, setState, toggleWalk, setDragging, celebrateUpdate, bounce, showVersion };
}
