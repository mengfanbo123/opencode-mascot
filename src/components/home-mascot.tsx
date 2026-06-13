/** @jsxImportSource @opentui/solid */

import { createSignal } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack } from "../core/types";
import { createAnimatedRenderer } from "../core/ascii-renderer";
import { onCelebrate } from "../core/celebration-bus";

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
  const [posX, setPosX] = createSignal(0);
  const [posY, setPosY] = createSignal(0);
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

  const switchTo = (name: string) => {
    if (props.mascots[name] && name !== currentName()) {
      setCurrentName(name);
    }
  };

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
      onMouseDown={(e: any) => {
        const now = Date.now();
        if (now - lastClickTime < 300) {
          const cur = currentName();
          const idx = names.indexOf(cur);
          const next = names[(idx + 1) % names.length];
          switchTo(next);
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
