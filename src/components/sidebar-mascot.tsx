/** @jsxImportSource @opentui/solid */

import { createSignal } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack, MascotState, SwitchConfig } from "../core/types";
import { createAnimatedRenderer } from "../core/ascii-renderer";

interface SidebarMascotProps {
  mascots: Record<string, MascotPack>;
  switchConfig?: SwitchConfig;
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

  const renderers: Record<string, ReturnType<typeof createAnimatedRenderer>> = {};
  for (const [name, pack] of Object.entries(props.mascots)) {
    renderers[name] = createAnimatedRenderer(pack);
  }

  const switchTo = (name: string) => {
    if (props.mascots[name] && name !== currentName()) {
      setCurrentName(name);
    }
  };

  const setStateWithSwitch = (s: MascotState) => {
    const cur = currentName();
    renderers[cur].setState(s);

    const stateMap = props.switchConfig?.onState ?? DEFAULT_STATE_MAP;
    const target = stateMap[s];
    if (target && target !== cur && props.mascots[target]) {
      setCurrentName(target);
      renderers[target].setState(s);
    }
  };

  props.api.event.on("session.status", (data: unknown) => {
    // Plugin receives: { id, type, properties: { sessionID, status: { type } } }
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
      switchTo(target.name);
    } else {
      const others = names.filter((n) => n !== currentName());
      if (others.length > 0) {
        switchTo(others[Math.floor(Math.random() * others.length)]);
      }
    }
  });

  props.api.event.on("mascot.toggleWalk", () => {
    renderers[currentName()].toggleWalk();
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
        if (e.modifiers?.alt) {
          dragStartX = e.x;
          dragStartY = e.y;
          dragAnchorX = posX();
          dragAnchorY = posY();
          e.preventDefault();
          e.stopPropagation();
          props.api.renderer.clearSelection();
        }
      }}
      onMouseDrag={(e: any) => {
        if (e.modifiers?.alt) {
          setPosX(dragAnchorX + (e.x - dragStartX));
          setPosY(dragAnchorY + (e.y - dragStartY));
          e.preventDefault();
          e.stopPropagation();
          props.api.renderer.clearSelection();
        }
      }}
    >
      {renderers[currentName()]?.element() ?? null}
    </box>
  );
}
