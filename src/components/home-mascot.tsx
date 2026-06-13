/** @jsxImportSource @opentui/solid */

import { createSignal } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack } from "../core/types";
import { createAnimatedRenderer } from "../core/ascii-renderer";
import { onCelebrate, onVersion } from "../core/celebration-bus";

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
  let boxRef: any = null;
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

  onCelebrate((newVersion) => {
    renderers[currentName()].celebrateUpdate(newVersion);
  });

  onVersion((version) => {
    renderers[currentName()].showVersion(version);
  });

  return (
    <box
      alignItems="center"
      zIndex={100}
      flexDirection="column"
      ref={(node: any) => { boxRef = node; }}
      onMouseDown={(e: any) => {
        const now = Date.now();
        if (now - lastClickTime < 300) {
          switchToNext();
          lastClickTime = 0;
          return;
        }
        lastClickTime = now;

        if (e.modifiers?.alt && boxRef) {
          dragStartX = e.x;
          dragStartY = e.y;
          dragAnchorX = boxRef.translateX || 0;
          dragAnchorY = boxRef.translateY || 0;
          isDragging = true;
          renderers[currentName()].setDragging(true);
        }
      }}
      onMouseDrag={(e: any) => {
        if (e.modifiers?.alt && isDragging && boxRef) {
          boxRef.translateX = dragAnchorX + (e.x - dragStartX);
          boxRef.translateY = dragAnchorY + (e.y - dragStartY);
        }
      }}
      onMouseUp={() => {
        isDragging = false;
        renderers[currentName()].setDragging(false);
      }}
      onMouseDragEnd={() => {
        isDragging = false;
        renderers[currentName()].setDragging(false);
      }}
      onMouseOut={() => {
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
