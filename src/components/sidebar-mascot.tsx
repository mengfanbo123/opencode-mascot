/** @jsxImportSource @opentui/solid */

import { createSignal, onCleanup } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack, MascotState } from "../core/types";
import { createAnimatedRenderer } from "../core/ascii-renderer";
import { onCelebrate } from "../core/celebration-bus";

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
  busy: "baozi",
  sleeping: "baozi",
};

const MASCOT_WIDTH = 10;
const MASCOT_HEIGHT = 5;
const PEEK = 2;
const PEEK_INTERVAL = 1200;

function termWidth(): number {
  return (typeof process !== "undefined" && process.stdout?.columns) || 80;
}

export function SidebarMascot(props: SidebarMascotProps): JSX.Element {
  const names = Object.keys(props.mascots);
  const initialName =
    props.initialMascot && props.mascots[props.initialMascot]
      ? props.initialMascot
      : names[Math.floor(Math.random() * names.length)];

  const [currentName, setCurrentName] = createSignal(initialName);
  const [posX, setPosX] = createSignal(20);
  const [posY, setPosY] = createSignal(2);
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
  };

  const startPeek = () => {
    stopPeek();
    let phase = false;
    peekTimer = setInterval(() => {
      phase = !phase;
      const stretch = phase ? PEEK : 0;
      const w = termWidth();
      if (hideSide === "left") {
        setPosX(-(MASCOT_WIDTH - PEEK) + stretch);
      } else if (hideSide === "right") {
        setPosX(w - PEEK - stretch);
      }
    }, PEEK_INTERVAL);
  };

  const returnToView = () => {
    if (!hideSide) return;
    stopPeek();
    const w = termWidth();
    const cur = posX();
    const targetX = hideSide === "left" ? 0 : Math.max(0, w - MASCOT_WIDTH);
    const step = targetX > cur ? 2 : -2;
    returnTimer = setInterval(() => {
      const now = posX();
      if (Math.abs(now - targetX) <= 2) {
        setPosX(targetX);
        stopReturn();
        hideSide = null;
        renderers[currentName()].bounce();
        return;
      }
      setPosX(now + step);
    }, 16);
  };

  const checkEdge = () => {
    const w = termWidth();
    const x = posX();
    if (x <= -(MASCOT_WIDTH - PEEK) + 1) {
      hideSide = "left";
      startPeek();
    } else if (x >= w - PEEK - 1) {
      hideSide = "right";
      startPeek();
    }
  };

  const clampX = (rawX: number): number => {
    const w = termWidth();
    const minX = -(MASCOT_WIDTH - PEEK);
    const maxX = w - PEEK;
    return Math.max(minX, Math.min(rawX, maxX));
  };

  const clampY = (rawY: number): number => {
    const h = (typeof process !== "undefined" && process.stdout?.rows) || 24;
    return Math.max(0, Math.min(rawY, h - MASCOT_HEIGHT));
  };

  const setStateWithSwitch = (s: MascotState) => {
    const cur = currentName();
    renderers[cur].setState(s);
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
    } else {
      setStateWithSwitch("idle");
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
      if (props.mascots[name] && name !== currentName()) setCurrentName(name);
    } else {
      switchToNext();
    }
  });

  props.api.event.on("mascot.toggleWalk", () => {
    renderers[currentName()].toggleWalk();
  });

  onCelebrate((newVersion) => {
    renderers[currentName()].celebrateUpdate(newVersion);
  });

  return (
    <box
      position="absolute"
      left={posX()}
      top={posY()}
      alignItems="center"
      zIndex={100}
      flexDirection="column"
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
          e.preventDefault();
          e.stopPropagation();
          props.api.renderer.clearSelection();
        }
      }}
      onMouseDrag={(e: any) => {
        if (e.modifiers?.alt && isDragging) {
          setPosX(clampX(dragAnchorX + (e.x - dragStartX)));
          setPosY(clampY(dragAnchorY + (e.y - dragStartY)));
          e.preventDefault();
          e.stopPropagation();
          props.api.renderer.clearSelection();
        }
      }}
      onMouseUp={() => {
        if (isDragging) {
          isDragging = false;
          renderers[currentName()].setDragging(false);
          checkEdge();
        }
      }}
      onMouseDragEnd={() => {
        if (isDragging) {
          isDragging = false;
          renderers[currentName()].setDragging(false);
          checkEdge();
        }
      }}
    >
      {renderers[currentName()]?.element() ?? null}
    </box>
  );
}
