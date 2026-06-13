/** @jsxImportSource @opentui/solid */

import { createSignal } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack, MascotState, SwitchConfig } from "../core/types";
import { createAnimatedRenderer } from "../core/ascii-renderer";
import { onCelebrate } from "../core/celebration-bus";
import { useDraggableMascot } from "./use-draggable-mascot";

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

const MASCOT_WIDTH = 10;
const MASCOT_HEIGHT = 5;

export function SidebarMascot(props: SidebarMascotProps): JSX.Element {
  const names = Object.keys(props.mascots);
  const initialName =
    props.initialMascot && props.mascots[props.initialMascot]
      ? props.initialMascot
      : names[Math.floor(Math.random() * names.length)];

  const [currentName, setCurrentName] = createSignal(initialName);

  const renderers: Record<string, ReturnType<typeof createAnimatedRenderer>> = {};
  for (const [name, pack] of Object.entries(props.mascots)) {
    renderers[name] = createAnimatedRenderer(pack);
  }

  const switchToNext = () => {
    const cur = currentName();
    const idx = names.indexOf(cur);
    setCurrentName(names[(idx + 1) % names.length]);
  };

  const { posX, posY, mouseProps, returnToView } = useDraggableMascot({
    initialX: 20,
    initialY: 2,
    mascotWidth: MASCOT_WIDTH,
    mascotHeight: MASCOT_HEIGHT,
    onSwitch: switchToNext,
    clearSelection: () => props.api.renderer.clearSelection(),
    setDragging: (v) => renderers[currentName()].setDragging(v),
    onReturnComplete: () => renderers[currentName()].bounce(),
  });

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
    const payload = data as { type?: string; properties?: { sessionID?: string; status?: { type?: string } } } | null;
    const statusType = payload?.properties?.status?.type;

    if (statusType === "busy" || statusType === "retry") {
      returnToView();
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
      {...mouseProps}
    >
      {renderers[currentName()]?.element() ?? null}
    </box>
  );
}
