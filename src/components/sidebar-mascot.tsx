/** @jsxImportSource @opentui/solid */

import { createSignal, onCleanup } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack, MascotState } from "../core/types";
import { createAnimatedRenderer } from "../core/ascii-renderer";
import { onCelebrate, onVersion, onScatter } from "../core/celebration-bus";
import { pickPropByTrigger, getProp } from "../core/prop-loader";

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

export function SidebarMascot(props: SidebarMascotProps): JSX.Element {
  const names = Object.keys(props.mascots);
  const initialName =
    props.initialMascot && props.mascots[props.initialMascot]
      ? props.initialMascot
      : props.mascots["yueer"]
      ? "yueer"
      : names[0];

  const [currentName, setCurrentName] = createSignal(initialName);
  const [userOverride, setUserOverride] = createSignal(false);
  const [posX, setPosX] = createSignal(20);
  const [posY, setPosY] = createSignal(2);
  const [containerWidth, setContainerWidth] = createSignal(0);
  const [zBoost, setZBoost] = createSignal(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let dragAnchorX = 0;
  let dragAnchorY = 0;
  let lastClickTime = 0;
  let isDragging = false;
  let hideSide: "left" | "right" | null = null;
  let peekTimer: ReturnType<typeof setInterval> | null = null;
  let returnTimer: ReturnType<typeof setInterval> | null = null;

  const renderers: Record<string, ReturnType<typeof createAnimatedRenderer>> = {};
  for (const [name, pack] of Object.entries(props.mascots)) {
    renderers[name] = createAnimatedRenderer(pack);
  }

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

  const setStateWithSwitch = (s: MascotState) => {
    const cur = currentName();
    renderers[cur].setState(s);
    if (userOverride()) return;
    const target = DEFAULT_STATE_MAP[s];
    if (target && target !== cur && props.mascots[target]) {
      setCurrentName(target);
      renderers[target].setState(s);
    }
  };

  props.api.event.on("session.status", (data: unknown) => {
    const payload = data as { type?: string; properties?: { sessionID?: string; status?: { type?: string } } } | null;
    const statusType = payload?.properties?.status?.type;
    if (statusType === "busy" || statusType === "retry") {
      if (hideSide) returnToView();
      renderers[currentName()].setState("busy");
      // 先显示箱子"打开"动画300ms，再切换到 busy 道具（道具从箱子里掉出来）
      const busyProp = pickPropByTrigger("busy");
      if (busyProp) {
        renderers[currentName()].setProp(getProp("box") ?? null);
        setTimeout(() => {
          renderers[currentName()].setProp(busyProp);
        }, 300);
      } else {
        renderers[currentName()].setProp(getProp("box") ?? null);
      }
    } else {
      setStateWithSwitch("idle");
      // idle 时显示箱子常驻
      renderers[currentName()].setProp(getProp("box") ?? null);
    }
  });

  props.api.event.on("session.idle", () => {
    setStateWithSwitch("happy");
    setTimeout(() => setStateWithSwitch("idle"), 3000);
  });

  props.api.event.on("mascot.switch", (data: unknown) => {
    const target = data as { name?: string } | null;
    if (target?.name) {
      const name = target.name;
      if (props.mascots[name] && name !== currentName()) {
        setCurrentName(name);
        setUserOverride(true);
      }
    } else {
      switchToNext();
    }
  });

  props.api.event.on("mascot.toggleWalk", () => {
    renderers[currentName()].toggleWalk();
  });

  onCelebrate((newVersion) => {
    setZBoost(true);
    renderers[currentName()].celebrateUpdate(newVersion);
    setTimeout(() => setZBoost(false), 2000);
  });

  onVersion((version) => {
    setZBoost(true);
    renderers[currentName()].showVersion(version);
    setTimeout(() => setZBoost(false), 3500);
  });

  let scattered = false;

  onScatter(() => {
    if (scattered) return;
    scattered = true;
    renderers[currentName()].scatterIn();
  });

  setTimeout(() => {
    if (scattered) return;
    scattered = true;
    renderers[currentName()].scatterIn();
  }, 2000);

  // 启动后显示箱子（在 scatter 之后）
  setTimeout(() => {
    if (!renderers[currentName()].getProp()) {
      renderers[currentName()].setProp(getProp("box") ?? null);
    }
  }, 2500);

  return (
    <box
      position="absolute"
      left={posX()}
      top={posY()}
      alignItems="center"
      zIndex={zBoost() ? 9999 : 100}
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
      onMouseDown={(e: any) => {
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
      }}
      onMouseDrag={(e: any) => {
        if (e.modifiers?.alt && isDragging) {
          setPosX(clampX(dragAnchorX + (e.x - dragStartX)));
          setPosY(clampY(dragAnchorY + (e.y - dragStartY)));
        }
      }}
      onMouseUp={() => {
        isDragging = false;
        renderers[currentName()].setDragging(false);
        checkEdge();
      }}
      onMouseDragEnd={() => {
        isDragging = false;
        renderers[currentName()].setDragging(false);
        checkEdge();
      }}
    >
      {renderers[currentName()]?.element() ?? null}
    </box>
  );
}
