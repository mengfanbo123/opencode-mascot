/** @jsxImportSource @opentui/solid */

import { createSignal } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { MascotPack } from "../core/types";
import { createAnimatedRenderer } from "../core/ascii-renderer";
import { onCelebrate, onVersion, onScatter } from "../core/celebration-bus";
import { getProp } from "../core/prop-loader";

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
  const initialName = props.mascots["yueer"] ? "yueer" : names[0];

  const cw = (typeof process !== "undefined" && process.stdout?.columns) || 80;

  const initX = Math.floor((Math.random() - 0.5) * Math.max(0, cw - 20));
  const initY = 0;

  const [currentName, setCurrentName] = createSignal(initialName);
  const [zBoost, setZBoost] = createSignal(false);
  let boxRef: any = null;
  let curX = initX;
  let curY = initY;
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

  const applyPos = () => {
    if (boxRef) {
      boxRef.translateX = curX;
      boxRef.translateY = curY;
    }
  };

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

  onScatter(() => {
  });

  renderers[currentName()].setCharacterHidden(true);
  renderers[currentName()].setProp(getProp("box") ?? null);

  const finalY = curY;
  curY = finalY - 15;
  applyPos();
  let fallStep = 0;
  const fallInterval = setInterval(() => {
    fallStep++;
    curY = finalY - 15 + fallStep;
    applyPos();
    if (fallStep >= 15) {
      clearInterval(fallInterval);
      curY = finalY;
      applyPos();
    }
  }, 30);

  setTimeout(() => {
    renderers[currentName()].setProp(null);
    renderers[currentName()].setCharacterHidden(false);
  }, 6000);

  const stopDrag = () => {
    isDragging = false;
    renderers[currentName()].setDragging(false);
  };

  return (
    <box
      zIndex={zBoost() ? 9999 : 100}
      flexDirection="column"
      ref={(node: any) => {
        boxRef = node;
        applyPos();
      }}
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
          dragAnchorX = curX;
          dragAnchorY = curY;
          isDragging = true;
          renderers[currentName()].setDragging(true);
          props.api.renderer.clearSelection();
        }
      }}
      onMouseDrag={(e: any) => {
        if (e.modifiers?.alt && isDragging) {
          curX = dragAnchorX + (e.x - dragStartX);
          curY = dragAnchorY + (e.y - dragStartY);
          applyPos();
        }
      }}
      onMouseUp={() => { stopDrag(); }}
      onMouseDragEnd={() => { stopDrag(); }}
    >
      {renderers[currentName()]?.element() ?? null}
    </box>
  );
}
