/** @jsxImportSource @opentui/solid */

import { createSignal } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack } from "../core/types";
import { createAnimatedRenderer } from "../core/ascii-renderer";
import { onCelebrate } from "../core/celebration-bus";
import { useDraggableMascot } from "./use-draggable-mascot";

interface HomeMascotProps {
  mascots: Record<string, MascotPack>;
  api: {
    renderer: {
      clearSelection(): void;
    };
  };
}

export function HomeMascot(props: HomeMascotProps): JSX.Element {
  const names = Object.keys(props.mascots);
  const initialName = names[Math.floor(Math.random() * names.length)];

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

  const { posX, posY, mouseProps } = useDraggableMascot({
    initialX: 0,
    initialY: 0,
    mascotWidth: 10,
    mascotHeight: 5,
    onSwitch: switchToNext,
    clearSelection: () => props.api.renderer.clearSelection(),
    setDragging: (v) => renderers[currentName()].setDragging(v),
    enableEdge: false,
  });

  onCelebrate((newVersion) => {
    renderers[currentName()].celebrateUpdate(newVersion);
  });

  return (
    <box
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
