/** @jsxImportSource @opentui/solid */

import { createSignal, onCleanup } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack, MascotState } from "../core/types";
import { createAnimatedRenderer } from "../core/ascii-renderer";
import { onCelebrate, onVersion, onScatter, onPropShow } from "../core/celebration-bus";
import { pickPropByTrigger } from "../core/prop-loader";
import { log } from "../core/logger";

interface SidebarMascotProps {
  mascots: Record<string, MascotPack>;
  initialMascot?: string;
  api: {
    event: {
      on(event: string, callback: (data: unknown) => void): void;
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
const [globalCurrentName, setGlobalCurrentName] = createSignal<string>("yueer");
const [globalUserOverride, setGlobalUserOverride] = createSignal(false);
const [globalPosX, setGlobalPosX] = createSignal(20);
const [globalPosY, setGlobalPosY] = createSignal(2);
const [globalPacingX, setGlobalPacingX] = createSignal(0);
const [globalZBoost, setGlobalZBoost] = createSignal(false);
let globalScattered = false;
let globalLastUserY: number | null = null;
let globalLastUserX: number | null = null;
let globalFallTimer: ReturnType<typeof setInterval> | null = null;

const fallToWorkY = () => {
  const targetY = globalLastUserY ?? 25;
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
  }, 16);
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
};

export function SidebarMascot(props: SidebarMascotProps): JSX.Element {
  log("DEBUG", "SidebarMascot mount");
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

  onCleanup(() => { stopPeek(); stopReturn(); });

  const switchToNext = () => {
    const cur = currentName();
    const idx = names.indexOf(cur);
    setCurrentName(names[(idx + 1) % names.length]);
    setUserOverride(true);
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

    props.api.event.on("session.status", (data: unknown) => {
      const payload = data as { type?: string; properties?: { sessionID?: string; status?: { type?: string } } } | null;
      const statusType = payload?.properties?.status?.type;
      log("DEBUG", `session.status: statusType=${statusType}`);
      if (statusType === "busy" || statusType === "retry") {
        renderers[globalCurrentName()].setState("busy");
        if (!renderers[globalCurrentName()].getProp()) {
          const busyProp = pickPropByTrigger("busy");
          renderers[globalCurrentName()].setProp(busyProp);
          renderers[globalCurrentName()].setCharacterHidden(busyProp?.position === "front");
          fallToWorkY();
        }
        startBusyPacing();
      } else {
        renderers[globalCurrentName()].setState("idle");
        stopBusyPacing();
        if (!globalUserOverride()) {
          const target = DEFAULT_STATE_MAP["idle" as MascotState];
          if (target && target !== globalCurrentName() && singletonRenderers && singletonRenderers[target]) {
            setGlobalCurrentName(target);
            singletonRenderers[target].setState("idle");
          }
        }
        renderers[globalCurrentName()].setProp(null);
        renderers[globalCurrentName()].setCharacterHidden(false);
      }
    });

    props.api.event.on("session.idle", () => {
      renderers[globalCurrentName()].setState("happy");
      setTimeout(() => {
        renderers[globalCurrentName()].setState("idle");
      }, 3000);
    });

    props.api.event.on("mascot.switch", (data: unknown) => {
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
    });

    props.api.event.on("mascot.toggleWalk", () => {
      renderers[globalCurrentName()].toggleWalk();
    });

    onCelebrate((newVersion) => {
      setGlobalZBoost(true);
      renderers[globalCurrentName()].celebrateUpdate(newVersion);
      setTimeout(() => setGlobalZBoost(false), 2000);
    });

    onVersion((version) => {
      setGlobalZBoost(true);
      renderers[globalCurrentName()].showVersion(version);
      setTimeout(() => setGlobalZBoost(false), 3500);
    });

    onScatter(() => {
      if (globalScattered) return;
      globalScattered = true;
      renderers[globalCurrentName()].scatterIn();
    });

    onPropShow(() => {
      fallToWorkY();
    });

    globalScattered = true;
    renderers[globalCurrentName()].scatterIn();
  }

  const propOffset = () => {
    const pos = renderers[currentName()]?.getPropPosition();
    if (pos === "side-left") return -18;
    if (pos === "side-right") return 12;
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
    <>
      {renderers[currentName()]?.propElement() ? (
        <box
          position="absolute"
          left={posX() + propOffset()}
          top={posY()}
          zIndex={globalZBoost() ? 9998 : 50}
          onMouseDown={handleMouseDown}
          onMouseDrag={handleMouseDrag}
          onMouseUp={handleMouseUp}
          onMouseDragEnd={handleMouseUp}
        >
          {renderers[currentName()].propElement()}
        </box>
      ) : null}
      {renderers[currentName()].getPropPosition() !== "front" ? (
        <box
          position="absolute"
          left={posX() + globalPacingX()}
          top={posY()}
          alignItems="center"
        zIndex={globalZBoost() ? 9999 : 100}
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
  );
}
