/** @jsxImportSource @opentui/solid */

import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack, MascotState } from "../core/types";
import { createAnimatedRenderer } from "../core/ascii-renderer";
import { onCelebrate, onVersion, onScatter, onPropShow } from "../core/celebration-bus";
import { getProp } from "../core/prop-loader";
import { log } from "../core/logger";
import { mascotVisible, phaseMachineOn, globalCurrentName, setGlobalCurrentName } from "../core/mascot-state";

interface SidebarMascotProps {
  mascots: Record<string, MascotPack>;
  initialMascot?: string;
  api: {
    event: {
      on(event: string, callback: (data: unknown) => void): () => void;
    };
    renderer: {
      clearSelection(): void;
    };
  };
}

const DEFAULT_STATE_MAP: Partial<Record<MascotState, string>> = {
  idle: "yueer",
  happy: "yueer",
  thinking: "yueer",
  busy: "yueer",
  sleeping: "yueer",
};

const MASCOT_WIDTH = 10;
const PEEK = 2;
const PEEK_INTERVAL = 1200;
const EDGE_THRESHOLD = 3;

let singletonRenderers: Record<string, ReturnType<typeof createAnimatedRenderer>> | null = null;
let singletonListener = false;
let singletonUnsubs: (() => void)[] = [];
const [globalUserOverride, setGlobalUserOverride] = createSignal(false);
const [globalPosX, setGlobalPosX] = createSignal(20);
const [globalPosY, setGlobalPosY] = createSignal(2);
const [globalPacingX, setGlobalPacingX] = createSignal(0);
const [globalZBoost, setGlobalZBoost] = createSignal(false);
const [globalOnMachine, setGlobalOnMachine] = createSignal(false);
const [globalRopeVisible, setGlobalRopeVisible] = createSignal(false);
const [globalPowerLineVisible, setGlobalPowerLineVisible] = createSignal(false);
const [globalSparkVisible, setGlobalSparkVisible] = createSignal(false);
const [globalFlyOffset, setGlobalFlyOffset] = createSignal(0);
const [globalDiving, setGlobalDiving] = createSignal(false);
const [globalPadVisible, setGlobalPadVisible] = createSignal(false);
const [globalPadOffsetX, setGlobalPadOffsetX] = createSignal(0);
const [globalPadFrameIdx, setGlobalPadFrameIdx] = createSignal(0);
const [globalVibeVisible, setGlobalVibeVisible] = createSignal(false);
const [globalVibeDots, setGlobalVibeDots] = createSignal(0);
const [globalVibeColor, setGlobalVibeColor] = createSignal("#FF00FF");
let globalJumping = false;
let diveTimer: ReturnType<typeof setInterval> | null = null;
let padSlideTimer: ReturnType<typeof setInterval> | null = null;
let padFrameTimer: ReturnType<typeof setInterval> | null = null;
let vibeTimer: ReturnType<typeof setInterval> | null = null;
let lastBusySessionId: string | null = null;
export const resetLastBusySessionId = () => { lastBusySessionId = null; };

export const triggerEasterIfBusy = () => {
  if (lastBusySessionId !== null && phaseMachineOn()) {
    trackTimeout(() => triggerEasterEgg(), 1200);
  }
};

export const resumeBusyState = () => {
  if (lastBusySessionId !== null) {
    const r = singletonRenderers?.[globalCurrentName()];
    if (r) {
      r.setState("busy");
      startBusyPacing();
    }
  }
};
let globalScattered = false;
let globalLastUserY: number | null = null;
let globalLastUserX: number | null = null;
// toggle off 移屏（命令式）：createEffect 在 createRoot 隔离 scope 内不响应模块级 signal，
// 由 tui.tsx handler 直接调。opentui 必响应 position 变化（小人靠 position 动）。
export const hideMascotPosition = () => {
  if (globalLastUserX === null) globalLastUserX = globalPosX();
  if (globalLastUserY === null) globalLastUserY = globalPosY();
  setGlobalPosX(-1000);
  setGlobalPosY(-1000);
};
export const showMascotPosition = () => {
  if (globalLastUserX !== null) { setGlobalPosX(globalLastUserX); globalLastUserX = null; }
  if (globalLastUserY !== null) { setGlobalPosY(globalLastUserY); globalLastUserY = null; }
};
let globalFallTimer: ReturnType<typeof setInterval> | null = null;

const fallToWorkY = () => {
  const targetY = globalLastUserY ?? 30;
  const targetX = globalLastUserX ?? 5;
  const startY = globalPosY();
  const startX = globalPosX();
  const needMove = Math.abs(startY - targetY) >= 2 || Math.abs(startX - targetX) >= 2;
  if (!needMove) return;
  const startTime = Date.now();
  const duration = 500;
  if (globalFallTimer) clearInterval(globalFallTimer);
  globalFallTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = t * t;
    setGlobalPosY(Math.round(startY + (targetY - startY) * eased));
    setGlobalPosX(Math.round(startX + (targetX - startX) * eased));
    if (t >= 1) {
      if (globalFallTimer) { clearInterval(globalFallTimer); globalFallTimer = null; }
    }
  }, 50);
};

let busyPacingTimer: ReturnType<typeof setInterval> | null = null;

const startBusyPacing = () => {
  if (busyPacingTimer) clearInterval(busyPacingTimer);
  let step = 0;
  let direction = 1;
  let phaseTimer = 0;
  let walking = true;
  busyPacingTimer = setInterval(() => {
    const prop = singletonRenderers?.[globalCurrentName()]?.getProp();
    if (prop && prop.position === "front") return;
    phaseTimer += 100;
    if (walking) {
      if (phaseTimer >= 3000) {
        walking = false;
        phaseTimer = 0;
        setGlobalPacingX(0);
        return;
      }
      step += direction;
      if (Math.abs(step) >= 3) direction *= -1;
      setGlobalPacingX(step);
    } else {
      if (phaseTimer >= 2000) {
        walking = true;
        phaseTimer = 0;
        step = 0;
        direction = Math.random() < 0.5 ? -1 : 1;
      }
    }
  }, 100);
};

const stopBusyPacing = () => {
  if (busyPacingTimer) { clearInterval(busyPacingTimer); busyPacingTimer = null; }
  setGlobalPacingX(0);
};

let currentPhase: 0 | 1 | 2 | 3 = 0;
let phaseMode: "p1p2" | "p3" | "bomb" | "none" = "none";
let phaseSessionId = 0;
let phaseTimer: ReturnType<typeof setTimeout> | null = null;
let flyTimer: ReturnType<typeof setInterval> | null = null;
let fallTimer: ReturnType<typeof setInterval> | null = null;
let swayTimer: ReturnType<typeof setInterval> | null = null;

let pendingPhaseTimeouts: ReturnType<typeof setTimeout>[] = [];

const trackTimeout = (fn: () => void, delay: number): ReturnType<typeof setTimeout> => {
  const id = setTimeout(() => {
    pendingPhaseTimeouts = pendingPhaseTimeouts.filter(t => t !== id);
    fn();
  }, delay);
  pendingPhaseTimeouts.push(id);
  return id;
};

const clearAllPhaseTimeouts = () => {
  pendingPhaseTimeouts.forEach((t) => { clearTimeout(t); });
  pendingPhaseTimeouts = [];
};

const stopDive = () => {
  if (diveTimer) { clearInterval(diveTimer); diveTimer = null; }
  setGlobalDiving(false);
};

const stopPadSlide = () => {
  if (padSlideTimer) { clearInterval(padSlideTimer); padSlideTimer = null; }
  if (padFrameTimer) { clearInterval(padFrameTimer); padFrameTimer = null; }
  setGlobalPadVisible(false);
  setGlobalPadOffsetX(0);
  singletonRenderers?.[globalCurrentName()]?.setExtra("peekingPad", false);
};

const stopVibe = () => {
  if (vibeTimer) { clearInterval(vibeTimer); vibeTimer = null; }
  setGlobalVibeVisible(false);
  setGlobalVibeDots(0);
};

const VIBE_COLORS = ["#FF00FF", "#00FFFF", "#FFFF00", "#00FF00", "#FF6600", "#FF0066"];

const startVibeCoding = (sid: number) => {
  if (vibeTimer) { clearInterval(vibeTimer); vibeTimer = null; }
  setGlobalVibeVisible(true);
  setGlobalVibeDots(0);
  setGlobalVibeColor(VIBE_COLORS[0]);
  let tick = 0;
  let colorIdx = 0;
  vibeTimer = setInterval(() => {
    if (sid !== phaseSessionId) { stopVibe(); return; }
    tick = (tick + 1) % 3;
    setGlobalVibeDots(tick);
    colorIdx = (colorIdx + 1) % VIBE_COLORS.length;
    setGlobalVibeColor(VIBE_COLORS[colorIdx]);
  }, 300);
};

const startPadSlideIn = (sid: number, onDone: () => void) => {
  if (padSlideTimer) { clearInterval(padSlideTimer); padSlideTimer = null; }
  if (padFrameTimer) { clearInterval(padFrameTimer); padFrameTimer = null; }
  setGlobalPadVisible(true);
  const hidden = -18;
  setGlobalPadOffsetX(hidden);
  setGlobalPacingX(0);
  singletonRenderers?.[globalCurrentName()]?.setExtra("peekingPad", true);
  const peekSteps = [-8, hidden, -4, 0];
  const pacingSteps = [-2, -3, -4, -5];
  let i = 0;
  padSlideTimer = setInterval(() => {
    if (sid !== phaseSessionId) { stopPadSlide(); return; }
    setGlobalPadOffsetX(peekSteps[i]);
    setGlobalPacingX(pacingSteps[i]);
    i++;
    if (i >= peekSteps.length) {
      if (padSlideTimer) { clearInterval(padSlideTimer); padSlideTimer = null; }
      setGlobalPacingX(0);
      singletonRenderers?.[globalCurrentName()]?.setExtra("peekingPad", false);
      const pad = getProp("pad");
      if (pad && Array.isArray(pad.frames[0])) {
        const total = (pad.frames as string[][]).length;
        padFrameTimer = setInterval(() => {
          if (sid !== phaseSessionId) { if (padFrameTimer) { clearInterval(padFrameTimer); padFrameTimer = null; } return; }
          setGlobalPadFrameIdx((idx) => (idx + 1) % total);
        }, pad.frameInterval ?? 1000);
      }
      onDone();
    }
  }, 300);
};

const startPadSlideOut = (sid: number, onDone: () => void) => {
  const start = Date.now();
  const duration = 600;
  const startX = globalPadOffsetX();
  const targetX = -20;
  if (padFrameTimer) { clearInterval(padFrameTimer); padFrameTimer = null; }
  padSlideTimer = setInterval(() => {
    if (sid !== phaseSessionId) { stopPadSlide(); return; }
    const t = Math.min((Date.now() - start) / duration, 1);
    const eased = t * t; // easeInQuad
    setGlobalPadOffsetX(Math.round(startX + (targetX - startX) * eased));
    if (t >= 1) {
      stopPadSlide();
      onDone();
    }
  }, 50);
};

export const stopPhaseMachine = () => {
  phaseSessionId++; // invalidate all in-flight callbacks
  clearAllPhaseTimeouts();
  if (phaseTimer) { clearTimeout(phaseTimer); phaseTimer = null; }
  stopFlyAnimation();
  stopDive();
  stopPadSlide();
  stopVibe();
  stopBusyPacing();
  if (globalFallTimer) { clearInterval(globalFallTimer); globalFallTimer = null; }
  setGlobalRopeVisible(false);
  setGlobalPowerLineVisible(false);
  setGlobalSparkVisible(false);
  setGlobalFlyOffset(0);
  setGlobalOnMachine(false);
  const r = singletonRenderers?.[globalCurrentName()];
  if (r) {
    r.setProp(null);
    r.setSecondaryProp(null);
    r.setCharacterHidden(false);
  }
  currentPhase = 0;
  phaseMode = "none";
  globalJumping = false;
};

const stopFlyAnimation = () => {
  if (flyTimer) { clearInterval(flyTimer); flyTimer = null; }
  if (fallTimer) { clearInterval(fallTimer); fallTimer = null; }
  if (swayTimer) { clearInterval(swayTimer); swayTimer = null; }
};

const startFlySequence = (sid: number, onFallStart: () => void, onComplete: () => void) => {
  stopFlyAnimation();
  setGlobalRopeVisible(true);
  setGlobalFlyOffset(0);
  const targetY = -28;
  const flyDuration = 5000;
  const flyStart = Date.now();
  flyTimer = setInterval(() => {
    if (sid !== phaseSessionId) { if (flyTimer) { clearInterval(flyTimer); flyTimer = null; } return; }
    const t = Math.min((Date.now() - flyStart) / flyDuration, 1);
    const base = targetY * t;
    const wobble = Math.sin(t * Math.PI * 6) * 2 * (1 - t);
    setGlobalFlyOffset(Math.round(base + wobble));
    if (t >= 1) {
      if (flyTimer) { clearInterval(flyTimer); flyTimer = null; }
      trackTimeout(() => {
        if (sid !== phaseSessionId) return;
        onFallStart();
        const fallStart = Date.now();
        const fallDuration = 800;
        fallTimer = setInterval(() => {
          if (sid !== phaseSessionId) { if (fallTimer) { clearInterval(fallTimer); fallTimer = null; } return; }
          const ft = Math.min((Date.now() - fallStart) / fallDuration, 1);
          const eased = ft * ft;
          setGlobalFlyOffset(Math.round(targetY * (1 - eased)));
          if (ft >= 1) {
            if (fallTimer) { clearInterval(fallTimer); fallTimer = null; }
            setGlobalFlyOffset(0);
            setGlobalRopeVisible(false);
            if (swayTimer) { clearInterval(swayTimer); swayTimer = null; }
            onComplete();
          }
        }, 50);
      }, 1000);
    }
  }, 50);
};

const startDiveSequence = (sid: number, onDone: () => void) => {
  if (diveTimer) { clearInterval(diveTimer); diveTimer = null; }
  setGlobalDiving(true);
  const diveStart = Date.now();
  const diveDuration = 500;
  const startY = globalPosY();
  const sinkY = 3; // sink 3 rows down into machine
  diveTimer = setInterval(() => {
    if (sid !== phaseSessionId) { stopDive(); return; }
    const t = Math.min((Date.now() - diveStart) / diveDuration, 1);
    setGlobalPosY(Math.round(startY + sinkY * t));
    if (t >= 1) {
      stopDive();
      onDone();
    }
  }, 50);
};

const enterPhase1 = () => {
  if (globalJumping) return;
  const sid = phaseSessionId;
  currentPhase = 1;
  setGlobalPosY(30);
  log("DEBUG", `enterPhase${currentPhase} sid=${sid}`);
  const r = singletonRenderers?.[globalCurrentName()];
  if (!r) { currentPhase = 0; return; }
  stopBusyPacing();
  globalJumping = true;
  const pcCase = getProp("pc-case");
  if (!pcCase) { globalJumping = false; currentPhase = 0; return; }
  r.setProp(pcCase);
  r.setSecondaryProp(null);
  r.setCharacterHidden(false);
  setGlobalOnMachine(false);
  setGlobalPowerLineVisible(true);
  r.bounceSafe();
  trackTimeout(() => { if (sid !== phaseSessionId) return; setGlobalOnMachine(true); }, 450);
  trackTimeout(() => {
    if (sid !== phaseSessionId) { log("DEBUG", `enterPhase1: mid aborted sid=${sid}`); return; }
    globalJumping = false;
    startBusyPacing();
    trackTimeout(() => {
      if (sid !== phaseSessionId) return;
      stopBusyPacing();
      startFlySequence(
        sid,
        () => {
          const laptop = getProp("laptop");
          if (laptop) r.setSecondaryProp(laptop);
        },
        () => {
          startDiveSequence(sid, () => {
            r.setCharacterHidden(true);
            setGlobalPosY(30); // reset Y for next cycle
            enterPhase2();
          });
        }
      );
    }, 2000);
  }, 950);
};

const enterPhase2 = () => {
  currentPhase = 2;
  const sid = phaseSessionId;
  log("DEBUG", `enterPhase${currentPhase} sid=${sid}`);
  const r = singletonRenderers?.[globalCurrentName()];
  if (!r) return;
  const pcCase = getProp("pc-case");
  if (!pcCase) return;
  const laptop = getProp("laptop");
  r.setProp(pcCase);
  if (laptop) r.setSecondaryProp(laptop);
  log("DEBUG", `enterPhase2: mainProp=${r.getProp()?.name}, propPos=${r.getPropPosition()}`);
  setGlobalOnMachine(false);
  r.setCharacterHidden(false);
  startVibeCoding(sid);
  phaseTimer = trackTimeout(() => {
    if (sid !== phaseSessionId) return;
    startBlackoutSequence(sid);
  }, 45000);
};

const enterPhase3 = () => {
  currentPhase = 3;
  const sid = phaseSessionId;
  log("DEBUG", `enterPhase${currentPhase} sid=${sid}`);
  const r = singletonRenderers?.[globalCurrentName()];
  if (!r) return;
  r.setCharacterHidden(false);
  setGlobalOnMachine(false);
  trackTimeout(() => {
    if (sid !== phaseSessionId) return;
    startPadSlideIn(sid, () => {
      log("DEBUG", `phase3 pad slid in sid=${sid}`);
      r.setCharacterHidden(true);
      phaseTimer = trackTimeout(() => {
        if (sid !== phaseSessionId) return;
        startPadSlideOut(sid, () => {
          if (sid !== phaseSessionId) return;
          stopVibe();
          setGlobalPowerLineVisible(false);
          r.setProp(null);
          r.setSecondaryProp(null);
          setGlobalPosY(Math.max(10, globalPosY() - 10));
          r.setCharacterHidden(false);
          fallToWorkY();
          trackTimeout(() => {
            if (sid !== phaseSessionId) return;
            startBlackoutSequence(sid);
          }, 800);
        });
      }, 30000);
    });
  }, 800);
};

const startBlackoutSequence = (sid: number) => {
  log("DEBUG", `blackout start sid=${sid} mode=${phaseMode}`);
  stopBusyPacing();
  stopVibe();
  const flickerCount = 6 + Math.floor(Math.random() * 3); // 6-8 flickers（延长，看清断电过程）
  let flicker = 0;
  const doFlicker = () => {
    if (sid !== phaseSessionId) return;
    if (flicker >= flickerCount) {
      // stage 2: sparks（延长火花展示）
      setGlobalPowerLineVisible(true);
      setGlobalSparkVisible(true);
      log("DEBUG", `blackout sparks sid=${sid}`);
      trackTimeout(() => {
        if (sid !== phaseSessionId) return;
        // stage 3: full blackout, machine stopped（机箱+显示器+电源线消失，小人保留惊恐表情）
        setGlobalSparkVisible(false);
        setGlobalPowerLineVisible(false);
        setGlobalVibeVisible(false);
        setGlobalRopeVisible(false);
        setGlobalFlyOffset(0);
        setGlobalOnMachine(false);
        const r = singletonRenderers?.[globalCurrentName()];
        if (r) {
          r.setProp(null);
          r.setSecondaryProp(null);
          r.setState("scared");
          trackTimeout(() => {
            if (sid !== phaseSessionId) return;
            const rr = singletonRenderers?.[globalCurrentName()];
            if (rr) rr.setState("busy");
          }, 3000);
        }
        currentPhase = 0;
        phaseMode = "none";
        log("DEBUG", `blackout complete sid=${sid}, mascot scared, resume busy in 3s`);
      }, 1200);
      return;
    }
    flicker++;
    setGlobalPowerLineVisible(flicker % 2 === 1);
    trackTimeout(doFlicker, 300 + Math.floor(Math.random() * 200));
  };
  doFlicker();
};

const triggerEasterEgg = () => {
  if (currentPhase > 0) return;
  if (!phaseMachineOn()) {
    phaseMode = "none";
    startBusyPacing();
    return;
  }
  const rnd = Math.random();
  log("DEBUG", `easter egg roll rnd=${rnd.toFixed(3)}`);
  if (rnd < 1.0) {
    // P1+P2 连贯：梯子爬完→显示器掉落→罚站 vibe，不可拆（测试场景1+2: 100%触发）
    phaseMode = "p1p2";
    enterPhase1();
  } else if (rnd < 0.45) {
    // P3 单独：pad peek
    phaseMode = "p3";
    const r = singletonRenderers?.[globalCurrentName()];
    if (!r) { phaseMode = "none"; return; }
    r.setProp(null);
    r.setSecondaryProp(null);
    r.setCharacterHidden(false);
    setGlobalOnMachine(false);
    enterPhase3();
  } else if (rnd < 0.55) {
    // 炸弹 scatter
    phaseMode = "bomb";
    singletonRenderers?.[globalCurrentName()]?.scatterIn();
    trackTimeout(() => {
      if (phaseMode === "bomb") { phaseMode = "none"; startBusyPacing(); }
    }, 1500);
  } else {
    // 无彩蛋：纯 busy
    phaseMode = "none";
    startBusyPacing();
  }
};

export function SidebarMascot(props: SidebarMascotProps): JSX.Element {
  const _cols = (typeof process !== "undefined" && process.stdout?.columns) || 0;
  log("DEBUG", `SidebarMascot mount cols=${_cols}`);
  const names = Object.keys(props.mascots);
  const initialName =
    props.initialMascot && props.mascots[props.initialMascot]
      ? props.initialMascot
      : props.mascots["yueer"]
      ? "yueer"
      : names[0];

  if (!singletonRenderers) {
    singletonRenderers = {};
    for (const [name, pack] of Object.entries(props.mascots)) {
      singletonRenderers[name] = createAnimatedRenderer(pack);
    }
    setGlobalCurrentName(initialName);
  }
  const renderers = singletonRenderers;

  const currentName = globalCurrentName;
  const setCurrentName = setGlobalCurrentName;
  const setUserOverride = setGlobalUserOverride;
  const posX = globalPosX;
  const setPosX = setGlobalPosX;
  const posY = globalPosY;
  const setPosY = setGlobalPosY;

  const [containerWidth, setContainerWidth] = createSignal(0);
  let dragStartX = 0;
  let dragStartY = 0;
  let dragAnchorX = 0;
  let dragAnchorY = 0;
  let lastClickTime = 0;
  let isDragging = false;
  let hideSide: "left" | "right" | null = null;
  let peekTimer: ReturnType<typeof setInterval> | null = null;
  let returnTimer: ReturnType<typeof setInterval> | null = null;

  const stopPeek = () => {
    if (peekTimer) { clearInterval(peekTimer); peekTimer = null; }
  };
  const stopReturn = () => {
    if (returnTimer) { clearInterval(returnTimer); returnTimer = null; }
  };

  onCleanup(() => {
    log("DEBUG", "SidebarMascot onCleanup");
    stopPeek();
    stopReturn();
  });

  createEffect(() => {
    if (!phaseMachineOn()) {
      stopPhaseMachine();
      const r = renderers[currentName()];
      if (r) {
        r.setProp(null);
        r.setSecondaryProp(null);
        r.setCharacterHidden(false);
      }
      setGlobalRopeVisible(false);
      setGlobalPowerLineVisible(false);
      setGlobalPadVisible(false);
      setGlobalVibeVisible(false);
      setGlobalOnMachine(false);
      log("DEBUG", "power off: Phase Machine stopped, props hidden");
    }
  });




  const switchToNext = () => {
    const cur = currentName();
    const idx = names.indexOf(cur);
    const nextName = names[(idx + 1) % names.length];

    const inPhase = currentPhase > 0;
    if (inPhase) {
      stopPhaseMachine();
    }

    const oldRenderer = renderers[cur];
    const newRenderer = renderers[nextName];
    const oldState = oldRenderer.getState();

    oldRenderer.setProp(null);
    oldRenderer.setSecondaryProp(null);
    oldRenderer.setCharacterHidden(false);

    newRenderer.setState(oldState);
    newRenderer.setProp(null);
    newRenderer.setSecondaryProp(null);
    newRenderer.setCharacterHidden(false);

    setCurrentName(nextName);
    setUserOverride(true);

    if (inPhase && phaseMachineOn()) {
      trackTimeout(() => triggerEasterEgg(), 1200);
    }
  };

  const getCw = () => containerWidth() || 30;

  const clampX = (rawX: number): number => {
    const cw = getCw();
    return Math.max(-(MASCOT_WIDTH - PEEK), Math.min(rawX, cw - PEEK));
  };

  const clampY = (rawY: number): number => {
    return Math.max(0, rawY);
  };

  const checkEdge = () => {
    const cw = getCw();
    const x = posX();
    if (x <= -(MASCOT_WIDTH - PEEK) + EDGE_THRESHOLD) {
      hideSide = "left";
      startPeek();
    } else if (x >= cw - PEEK - EDGE_THRESHOLD) {
      hideSide = "right";
      startPeek();
    }
  };

  const startPeek = () => {
    stopPeek();
    let phase = false;
    peekTimer = setInterval(() => {
      phase = !phase;
      const stretch = phase ? PEEK : 0;
      const cw = getCw();
      if (hideSide === "left") {
        setPosX(-(MASCOT_WIDTH - PEEK) + stretch);
      } else if (hideSide === "right") {
        setPosX(cw - PEEK - stretch);
      }
    }, PEEK_INTERVAL);
  };

  const returnToView = () => {
    if (!hideSide) return;
    stopPeek();
    stopReturn();
    const cw = getCw();
    const cur = posX();
    const targetX = hideSide === "left" ? 0 : Math.max(0, cw - MASCOT_WIDTH);
    const step = targetX > cur ? 1 : -1;

    returnTimer = setInterval(() => {
      const now = posX();
      if (Math.abs(now - targetX) <= 1) {
        setPosX(targetX);
        stopReturn();
        hideSide = null;
        const r = renderers[currentName()];
        if (r.getState() === "idle") {
          r.bounce();
        }
        return;
      }
      setPosX(now + step);
    }, 16);
  };

  if (!singletonListener) {
    singletonListener = true;

    singletonUnsubs.push(props.api.event.on("session.status", (data: unknown) => {
      const payload = data as { type?: string; properties?: { sessionID?: string; status?: { type?: string } } } | null;
      const statusType = payload?.properties?.status?.type;
      log("DEBUG", `session.status: statusType=${statusType}`);
      if (statusType === "busy" || statusType === "retry") {
        renderers[globalCurrentName()].setState("busy");
        const sessionId = payload?.properties?.sessionID ?? null;
        if (sessionId !== lastBusySessionId) {
          lastBusySessionId = sessionId;
          stopPhaseMachine();
          const r = renderers[globalCurrentName()];
          r.setProp(null);
          r.setSecondaryProp(null);
          r.setCharacterHidden(false);
          setGlobalOnMachine(false);
          fallToWorkY();
          if (phaseMachineOn()) {
            trackTimeout(() => triggerEasterEgg(), 1200);
          } else {
            startBusyPacing();
          }
        }
      } else {
        renderers[globalCurrentName()].setState("idle");
        stopBusyPacing();
        stopPhaseMachine();
        lastBusySessionId = null;
        if (!globalUserOverride()) {
          const target = DEFAULT_STATE_MAP["idle" as MascotState];
          if (target && target !== globalCurrentName() && singletonRenderers && singletonRenderers[target]) {
            setGlobalCurrentName(target);
            singletonRenderers[target].setState("idle");
          }
        }
        setGlobalOnMachine(false);
        renderers[globalCurrentName()].setSecondaryProp(null);
        renderers[globalCurrentName()].setProp(null);
        renderers[globalCurrentName()].setCharacterHidden(false);
      }
    }));

    singletonUnsubs.push(props.api.event.on("session.idle", () => {
      renderers[globalCurrentName()].setState("happy");
      setTimeout(() => {
        renderers[globalCurrentName()].setState("idle");
      }, 3000);
    }));

    singletonUnsubs.push(props.api.event.on("mascot.switch", (data: unknown) => {
      const target = data as { name?: string } | null;
      if (target?.name) {
        const name = target.name;
        if (singletonRenderers && singletonRenderers[name] && name !== globalCurrentName()) {
          setGlobalCurrentName(name);
          setGlobalUserOverride(true);
        }
      } else {
        const cur = globalCurrentName();
        const allNames = Object.keys(singletonRenderers ?? {});
        const idx = allNames.indexOf(cur);
        setGlobalCurrentName(allNames[(idx + 1) % allNames.length]);
        setGlobalUserOverride(true);
      }
    }));

    singletonUnsubs.push(props.api.event.on("mascot.toggleWalk", () => {
      renderers[globalCurrentName()].toggleWalk();
    }));

    singletonUnsubs.push(onCelebrate((newVersion) => {
      setGlobalZBoost(true);
      renderers[globalCurrentName()].celebrateUpdate(newVersion);
      setTimeout(() => setGlobalZBoost(false), 2000);
    }));

    singletonUnsubs.push(onVersion((version) => {
      setGlobalZBoost(true);
      renderers[globalCurrentName()].showVersion(version);
      setTimeout(() => setGlobalZBoost(false), 3500);
    }));

    singletonUnsubs.push(onScatter(() => {
      if (globalScattered) return;
      globalScattered = true;
      renderers[globalCurrentName()].scatterIn();
    }));

    singletonUnsubs.push(onPropShow(() => {
      fallToWorkY();
    }));

    globalScattered = true;
    renderers[globalCurrentName()].scatterIn();
  }

  const propOffset = () => {
    const pos = renderers[currentName()]?.getPropPosition();
    if (pos === "side-left") return -18;
    if (pos === "side-right") return Math.max(18, getCw() - 10);
    if (pos === "front") return -5;
    return 0;
  };

  const handleMouseDown = (e: any) => {
    if (hideSide) { returnToView(); return; }
    const now = Date.now();
    if (now - lastClickTime < 300) {
      switchToNext();
      lastClickTime = 0;
      return;
    }
    lastClickTime = now;
    if (e.modifiers?.alt) {
      dragStartX = e.x;
      dragStartY = e.y;
      dragAnchorX = posX();
      dragAnchorY = posY();
      isDragging = true;
      renderers[currentName()].setDragging(true);
      props.api.renderer.clearSelection();
    }
  };
  const handleMouseDrag = (e: any) => {
    if (e.modifiers?.alt && isDragging) {
      setPosX(clampX(dragAnchorX + (e.x - dragStartX)));
      setPosY(clampY(dragAnchorY + (e.y - dragStartY)));
      globalLastUserY = posY();
      globalLastUserX = posX();
    }
  };
  const handleMouseUp = () => {
    isDragging = false;
    renderers[currentName()].setDragging(false);
    checkEdge();
  };

  return (
    <Show when={mascotVisible()} fallback={<></>}>
      <>
        {globalRopeVisible() ? (
          <box position="absolute" left={posX() + propOffset() + 4} top={0} zIndex={40} flexDirection="column" width={3}>
            {Array.from({ length: Math.max(0, posY() - 4) }, (_, i) => (
              <text fg="#FFD700">{i % 2 === 0 ? "├─┤" : "│ │"}</text>
            ))}
          </box>
        ) : null}
      {renderers[currentName()]?.propElement() ? (() => {
        const isPad = renderers[currentName()]?.getProp()?.name === "pad";
        return (
          <box
            position="absolute"
            left={posX() + (isPad ? -1 : propOffset())}
            top={posY() - (isPad ? 2 : 0)}
            zIndex={globalZBoost() ? 9998 : (isPad ? 45 : 50)}
            onMouseDown={handleMouseDown}
            onMouseDrag={handleMouseDrag}
            onMouseUp={handleMouseUp}
            onMouseDragEnd={handleMouseUp}
          >
            {renderers[currentName()].propElement()}
          </box>
        );
      })() : null}
      {globalPowerLineVisible() ? (
        <box position="absolute" left={posX() + propOffset() + 10} top={posY() + 4} zIndex={49}>
          <text fg="#888888">{"━".repeat(80)}</text>
        </box>
      ) : null}
      {globalSparkVisible() ? (
        <box position="absolute" left={posX() + propOffset() + 10} top={posY() + 3} zIndex={51}>
          <text fg="#FFFF00">⚡💥⚡</text>
        </box>
      ) : null}
      {renderers[currentName()]?.secondaryPropElement() ? (
        <box
          position="absolute"
          left={posX() + propOffset() - 3}
          top={posY() - 5 + globalFlyOffset()}
          zIndex={globalZBoost() ? 9998 : 50}
        >
          {renderers[currentName()].secondaryPropElement()}
        </box>
      ) : null}
      {globalPadVisible() ? (() => {
        const pad = getProp("pad");
        if (!pad) return null;
        const fg = props.mascots[currentName()]?.colors?.defaultFg || undefined;
        const framesRaw = Array.isArray(pad.frames[0]) ? (pad.frames as string[][]) : [pad.frames as string[]];
        const lines = framesRaw[globalPadFrameIdx() % framesRaw.length] ?? framesRaw[0];
        return (
          <box
            position="absolute"
            left={posX() + globalPadOffsetX() - 1}
            top={posY() - 2}
            zIndex={globalZBoost() ? 9998 : 45}
            flexDirection="column"
          >
            {lines.map((line: string) => (
              <text fg={fg}>{line}</text>
            ))}
          </box>
        );
      })() : null}
      {globalVibeVisible() ? (() => {
        const dots = "·".repeat(globalVibeDots() + 1);
        const pad = " ".repeat(Math.max(0, 3 - dots.length));
        return (
          <box
            position="absolute"
            left={posX() + propOffset() - 3}
            top={posY() - 6}
            zIndex={globalZBoost() ? 9999 : 60}
          >
            <text fg={globalVibeColor()}>{`ᵛⁱᵇᵉ ᶜᵒᵈⁱⁿᵍ ${dots}${pad}`}</text>
          </box>
        );
      })() : null}
      {renderers[currentName()].getPropPosition() !== "front" && !renderers[currentName()].getCharacterHidden() ? (
        <box
          position="absolute"
          left={posX() + globalPacingX() + (globalOnMachine() ? propOffset() : 0)}
          top={posY() - (globalOnMachine() ? 4 : 0) + globalFlyOffset()}
          alignItems="center"
        zIndex={globalZBoost() ? 9999 : (globalDiving() ? 40 : 100)}
        flexDirection="column"
        ref={(node: any) => {
          if (node) {
            setContainerWidth(node.width || 0);
            if (node.onSizeChange !== undefined) {
              node.onSizeChange = () => {
                setContainerWidth(node.width || 0);
              };
            }
          }
        }}
        onMouseDown={handleMouseDown}
        onMouseDrag={handleMouseDrag}
        onMouseUp={handleMouseUp}
        onMouseDragEnd={handleMouseUp}
      >
        {renderers[currentName()]?.element() ?? null}
      </box>
      ) : null}
      </>
    </Show>
  );
}
