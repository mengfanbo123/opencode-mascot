/** @jsxImportSource @opentui/solid */

import { createSignal } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack, MascotState } from "../core/types";
import { createAnimatedRenderer } from "../core/ascii-renderer";
import { onCelebrate, onVersion } from "../core/celebration-bus";

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

  const renderers: Record<string, ReturnType<typeof createAnimatedRenderer>> = {};
  for (const [name, pack] of Object.entries(props.mascots)) {
    renderers[name] = createAnimatedRenderer(pack);
  }

  const switchToNext = () => {
    const cur = currentName();
    const idx = names.indexOf(cur);
    setCurrentName(names[(idx + 1) % names.length]);
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

  onVersion((version) => {
    renderers[currentName()].showVersion(version);
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
          setPosX(dragAnchorX + (e.x - dragStartX));
          setPosY(dragAnchorY + (e.y - dragStartY));
          e.preventDefault();
          e.stopPropagation();
          props.api.renderer.clearSelection();
        }
      }}
      onMouseUp={() => {
        if (isDragging) {
          isDragging = false;
          renderers[currentName()].setDragging(false);
        }
      }}
      onMouseDragEnd={() => {
        if (isDragging) {
          isDragging = false;
          renderers[currentName()].setDragging(false);
        }
      }}
    >
      {renderers[currentName()]?.element() ?? null}
    </box>
  );
}
