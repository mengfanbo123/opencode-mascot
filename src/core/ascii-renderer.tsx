/** @jsxImportSource @opentui/solid */

import { createSignal, onCleanup } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack, MascotState, EffectTimerCtx, EffectRenderCtx, PropPack, PropPosition } from "./types";

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
  getState: () => MascotState;
  setState: (s: MascotState) => void;
  toggleWalk: () => void;
  setDragging: (v: boolean) => void;
  setCharacterHidden: (v: boolean) => void;
  celebrateUpdate: (newVersion: string) => void;
  bounce: () => void;
  showVersion: (version: string) => void;
  scatterIn: () => void;
  explode: () => void;
  setProp: (prop: PropPack | null) => void;
  getProp: () => PropPack | null;
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
  const [versionMsg, setVersionMsg] = createSignal<string | null>(null);
  const [flashColor, setFlashColor] = createSignal<string | null>(null);
  const [dragMsg, setDragMsg] = createSignal<string | null>(null);
  const [zzz, setZzz] = createSignal<string | null>(null);
  const [bomb, setBomb] = createSignal<{ fuse: string; count: string } | null>(null);
  const [scatter, setScatter] = createSignal<{ dx: number; dy: number }[] | null>(null);
  const [activeProp, setActiveProp] = createSignal<PropPack | null>(null);
  const [characterHidden, setCharacterHiddenSignal] = createSignal(false);
  const [propFrameIdx, setPropFrameIdx] = createSignal(0);
  const [propPosition, setPropPosition] = createSignal<PropPosition | null>(null);

  let propTimer: ReturnType<typeof setInterval> | null = null;
  let flashTimer: ReturnType<typeof setInterval> | null = null;
  let dragMsgTimer: ReturnType<typeof setInterval> | null = null;
  let zzzTimer: ReturnType<typeof setInterval> | null = null;
  let scatterTimer: ReturnType<typeof setInterval> | null = null;
  let bombTimer: ReturnType<typeof setTimeout> | null = null;
  let explodeTimer: ReturnType<typeof setTimeout> | null = null;
  let bounceTimers: ReturnType<typeof setTimeout>[] = [];
  let celebrateTimers: ReturnType<typeof setTimeout>[] = [];
  let versionTimer: ReturnType<typeof setTimeout> | null = null;
  let fallTimers: ReturnType<typeof setTimeout>[] = [];

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
  const stopFall = () => {
    fallTimers.forEach(t => { clearTimeout(t); });
    fallTimers = [];
  };
  const stopCelebrate = () => {
    celebrateTimers.forEach(t => { clearTimeout(t); });
    celebrateTimers = [];
  };
  const stopVersion = () => {
    if (versionTimer) { clearTimeout(versionTimer); versionTimer = null; }
    setVersionMsg(null);
  };
  const stopScatter = () => {
    if (scatterTimer) { clearInterval(scatterTimer); scatterTimer = null; }
    setScatter(null);
  };
  const stopBomb = () => {
    if (bombTimer) { clearTimeout(bombTimer); bombTimer = null; }
    if (explodeTimer) { clearTimeout(explodeTimer); explodeTimer = null; }
    setBomb(null);
  };
  const stopPropTimer = () => {
    if (propTimer) { clearInterval(propTimer); propTimer = null; }
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
        setState("sleeping");
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
        if (Math.random() < 0.1) {
          explode();
        } else {
          startWalk();
        }
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
        setTimeout(() => {
          setJumpOffset(0);
          if (Math.random() < 0.4) {
            fallApart();
          }
        }, 2000);
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
    stopScatter();
    stopFall();
    stopBomb();
    if (zzzTimer) { clearInterval(zzzTimer); zzzTimer = null; }
    stopPropTimer();
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
    zzz();
    scatter();
    bomb();
    versionMsg();
    activeProp();
    propFrameIdx();
    propPosition();

    for (const [, [get]] of extraSignals) {
      get();
    }

    const frameName = frameOverride() ?? STATE_TO_FRAME[currentState()] ?? "default";
    const rawLines = getFrameLines(pack, frameName);
    const offset = walkOffset();

    const width = rawLines[0]?.length ?? 10;
    const blank = " ".repeat(width);

    let lines: string[] = characterHidden()
      ? rawLines.map(() => blank)
      : rawLines.map((line, i) => {
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

    // ─── Prop overlay ───
    const prop = activeProp();
    if (prop) {
      const propFramesRaw = Array.isArray(prop.frames[0])
        ? (prop.frames as string[][])
        : [prop.frames as string[]];
      const propLines = propFramesRaw[propFrameIdx() % propFramesRaw.length] ?? propFramesRaw[0];

      if (propLines.length > 0) {
        const pos = propPosition();
        if (pos === 'front') {
          const overlayCount = Math.min(propLines.length, lines.length);
          const startRow = Math.floor((lines.length - overlayCount) / 2);
          for (let i = 0; i < overlayCount; i++) {
            lines[startRow + i] = propLines[i];
          }
        } else {
          const charWidth = lines[0]?.length ?? 0;
          const propWidth = propLines[0]?.length ?? 0;
          const charHeight = lines.length;
          const propHeight = propLines.length;
          const maxLines = Math.max(charHeight, propHeight);
          const charPad = Math.floor((maxLines - charHeight) / 2);
          const propPad = Math.floor((maxLines - propHeight) / 2);
          const sep = "  ";

          const merged: string[] = [];
          for (let i = 0; i < maxLines; i++) {
            const cLine = (i >= charPad && i < charPad + charHeight)
              ? lines[i - charPad]
              : " ".repeat(charWidth);
            const pLine = (i >= propPad && i < propPad + propHeight)
              ? propLines[i - propPad]
              : " ".repeat(propWidth);
            merged.push(pos === 'side-right' ? cLine + sep + pLine : pLine + sep + cLine);
          }
          lines = merged;
        }
      }
    }

    const top = jumpOffset();
    const left = offset > 0 ? offset : 0;
    const cel = celebrate();
    const dm = dragMsg();
    const sc = scatter();

    return (
      <box flexDirection="column" alignItems="flex-start" left={left} top={top}>
        {cel ? <box position="absolute" top={-1} left={0}><text fg={flashColor() ?? fg}>{cel.text}</text></box> : null}
        {dm ? <box position="absolute" top={-1} left={0}><text fg="#FF4081">{dm}</text></box> : null}
        {zzz() ? <box position="absolute" top={-1} left={0}><text fg={flashColor() ?? fg}>{zzz()}</text></box> : null}
        {versionMsg() ? <box position="absolute" top={-1} left={0}><text fg={flashColor() ?? fg}>{versionMsg()}</text></box> : null}
        {bomb() ? (
          <box position="absolute" top={-2} left={3}>
            <text fg="#FF4444">{bomb()!.fuse}↘</text>
            <text fg="#FF6666">{"  ◉"}</text>
            {bomb()!.count ? <text fg="#FFAA00">{bomb()!.count}</text> : null}
          </box>
        ) : null}
        {lines.map((line: string, i: number) => (
          <text fg={flashColor() ?? fg} left={sc?.[i]?.dx ?? 0} top={sc?.[i]?.dy ?? 0}>{line}</text>
        ))}
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
      setZzz(null);
      flashTimer = setInterval(() => {
        setFlashColor(FLASH_COLORS[Math.floor(Math.random() * FLASH_COLORS.length)]);
      }, 120);
    } else {
      stopFlash();
    }

    if (s === "sleeping") {
      let phase = 1;
      setZzz("zᶻ...");
      zzzTimer = setInterval(() => {
        phase = (phase % 3) + 1;
        setZzz("z" + "ᶻ".repeat(phase) + "...");
      }, 1500);
    } else {
      if (zzzTimer) { clearInterval(zzzTimer); zzzTimer = null; }
      setZzz(null);
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

  const setCharacterHidden = (v: boolean) => {
    setCharacterHiddenSignal(v);
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
      setCelebrate({ text: `${word} ᵘᵖ→${toSuperscript(newVersion)}`, count: step });
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
    bounceTimers.push(setTimeout(() => {
      setJumpOffset(0);
      bounceTimers = [];
      if (Math.random() < 0.5) {
        fallApart();
      }
    }, 450));
  };

  const fallApart = () => {
    const lineCount = getFrameLines(pack, "default").length;
    const offsets = Array.from({ length: lineCount }, (_, i) => ({
      dx: Math.floor((Math.random() - 0.3) * 20),
      dy: i === 0 ? 2 : Math.floor(Math.random() * 3) + 1,
    }));
    setScatter(offsets);
    fallTimers.push(setTimeout(() => {
      scatterIn();
      fallTimers = [];
    }, 1500));
  };

  const showVersion = (version: string) => {
    stopVersion();
    setVersionMsg(`ᵛ${toSuperscript(version)}`);
    versionTimer = setTimeout(() => { setVersionMsg(null); versionTimer = null; }, 5000);
  };

  const scatterIn = () => {
    stopScatter();
    const lineCount = getFrameLines(pack, "default").length;
    const offsets = Array.from({ length: lineCount }, () => ({
      dx: Math.floor((Math.random() - 0.5) * 30),
      dy: Math.floor((Math.random() - 0.5) * 12),
    }));
    setScatter(offsets);

    let ticks = 0;
    const MAX_TICKS = 15;
    scatterTimer = setInterval(() => {
      ticks++;
      if (ticks >= MAX_TICKS) {
        setScatter(offsets.map(() => ({ dx: 0, dy: 0 })));
        stopScatter();
        return;
      }
      const t = ticks / MAX_TICKS;
      setScatter(offsets.map(o => ({
        dx: Math.round(o.dx * (1 - t)),
        dy: Math.round(o.dy * (1 - t)),
      })));
    }, 80);
  };

  const explode = () => {
    stopBomb();
    stopScatter();
    setFrameOverride("thinking");
    setBomb({ fuse: "✦", count: "³·" });

    let fuseAlt = false;
    const fuseTimer = setInterval(() => {
      fuseAlt = !fuseAlt;
      setBomb({ fuse: fuseAlt ? "✦" : "◌", count: "³·" });
    }, 400);

    bombTimer = setTimeout(() => {
      clearInterval(fuseTimer);
      setBomb({ fuse: fuseAlt ? "✦" : "◌", count: "²·" });
      bombTimer = setTimeout(() => {
        clearInterval(fuseTimer);
        setBomb({ fuse: fuseAlt ? "✦" : "◌", count: "¹·" });
        bombTimer = setTimeout(() => {
          clearInterval(fuseTimer);
          setBomb(null);
          setFrameOverride(null);
          setFlashColor("#FFFFFF");
          const lineCount = getFrameLines(pack, "default").length;
          const offsets = Array.from({ length: lineCount }, () => ({
            dx: Math.floor((Math.random() - 0.5) * 30),
            dy: Math.floor((Math.random() - 0.5) * 15),
          }));
          setScatter(offsets);
          setCelebrate({ text: "ᵇᵒᵒᵐ~", count: 0 });
          explodeTimer = setTimeout(() => {
            setFlashColor(null);
            setCelebrate(null);
            scatterIn();
          }, 1200);
        }, 700);
      }, 700);
    }, 700);
  };

  const setProp = (prop: PropPack | null) => {
    setActiveProp(prop);
    setPropFrameIdx(0);
    if (prop) {
      const pos: PropPosition = prop.position === 'random'
        ? (Math.random() < 0.5 ? 'side-left' : 'side-right')
        : prop.position;
      setPropPosition(pos);
      stopPropTimer();
      if (Array.isArray(prop.frames[0]) && prop.frameInterval) {
        propTimer = setInterval(() => {
          setPropFrameIdx((idx) => (idx + 1) % (prop.frames as string[][]).length);
        }, prop.frameInterval);
      }
    } else {
      setPropPosition(null);
      stopPropTimer();
    }
  };

  const getProp = () => activeProp();

  return { element, getState: currentState, setState, toggleWalk, setDragging, setCharacterHidden, celebrateUpdate, bounce, showVersion, scatterIn, explode, setProp, getProp };
}
