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

let homeSingletonRenderers: Record<string, ReturnType<typeof createAnimatedRenderer>> | null = null;
let homeStartupTriggered = false;
const [homeCurX, setHomeCurX] = createSignal(0);
const [homeCurY, setHomeCurY] = createSignal(7);

let homeSavedX = 0;
let homeSavedY = 7;
export const hideHomeMascotPosition = () => {
  homeSavedX = homeCurX();
  homeSavedY = homeCurY();
  setHomeCurX(-1000);
  setHomeCurY(-1000);
};
export const showHomeMascotPosition = () => {
  setHomeCurX(homeSavedX);
  setHomeCurY(homeSavedY);
};

export function HomeMascot(props: HomeMascotProps): JSX.Element {
  const names = Object.keys(props.mascots);
  const initialName = props.mascots["yueer"] ? "yueer" : names[0];

  const cw = (typeof process !== "undefined" && process.stdout?.columns) || 80;

  const [currentName, setCurrentName] = createSignal(initialName);
  const [zBoost, setZBoost] = createSignal(false);
  const curX = homeCurX;
  const setCurX = setHomeCurX;
  const curY = homeCurY;
  const setCurY = setHomeCurY;
  if (!homeStartupTriggered) {
    setCurX(Math.floor(cw / 2) - 5);
  }
  let dragStartX = 0;
  let dragStartY = 0;
  let dragAnchorX = 0;
  let dragAnchorY = 0;
  let lastClickTime = 0;
  let isDragging = false;

  if (!homeSingletonRenderers) {
    homeSingletonRenderers = {};
    for (const [name, pack] of Object.entries(props.mascots)) {
      homeSingletonRenderers[name] = createAnimatedRenderer(pack);
    }
  }
  const renderers = homeSingletonRenderers;

  const switchToNext = () => {
    const cur = currentName();
    const idx = names.indexOf(cur);
    setCurrentName(names[(idx + 1) % names.length]);
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

  if (!homeStartupTriggered) {
    homeStartupTriggered = true;
    renderers[currentName()].setCharacterHidden(true);
    renderers[currentName()].setProp(getProp("box") ?? null);

    const finalY = curY();
    const finalX = curX();
    const fallStartY = finalY - 15;
    const fallDuration = 500;
    const fallStartTime = Date.now();
    setCurY(fallStartY);

    const fallInterval = setInterval(() => {
      const elapsed = Date.now() - fallStartTime;
      const t = Math.min(elapsed / fallDuration, 1);
      const eased = t * t;
      setCurY(Math.round(fallStartY + (finalY - fallStartY) * eased));
      if (t >= 1) {
        clearInterval(fallInterval);
        setCurY(finalY);

        setTimeout(() => {
          const shakeSeq = [1, -1, 1, -1, 0];
          let shakeIdx = 0;
          const shakeInterval = setInterval(() => {
            if (shakeIdx >= shakeSeq.length) {
              clearInterval(shakeInterval);
              setCurX(finalX);
              return;
            }
            setCurX(finalX + shakeSeq[shakeIdx]);
            shakeIdx++;
          }, 60);
        }, 2000);
      }
    }, 16);

    setTimeout(() => {
      renderers[currentName()].setProp(null);
      renderers[currentName()].setCharacterHidden(false);
      const dropStart = curY();
      const dropEnd = 10;
      const dropDuration = 300;
      const dropStartTime = Date.now();
      const dropInterval = setInterval(() => {
        const elapsed = Date.now() - dropStartTime;
        const t = Math.min(elapsed / dropDuration, 1);
        const eased = t * t;
        setCurY(Math.round(dropStart + (dropEnd - dropStart) * eased));
        if (t >= 1) {
          clearInterval(dropInterval);
          setCurY(dropEnd);
        }
      }, 16);
    }, 6000);
  }

  const stopDrag = () => {
    isDragging = false;
    renderers[currentName()].setDragging(false);
  };

  const handleMouseDown = (e: any) => {
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
      dragAnchorX = curX();
      dragAnchorY = curY();
      isDragging = true;
      renderers[currentName()].setDragging(true);
      props.api.renderer.clearSelection();
    }
  };
  const handleMouseDrag = (e: any) => {
    if (e.modifiers?.alt && isDragging) {
      setCurX(dragAnchorX + (e.x - dragStartX));
      setCurY(dragAnchorY + (e.y - dragStartY));
    }
  };
  const handleMouseUp = () => { stopDrag(); };

  return (
    <>
      {renderers[currentName()]?.propElement() ? (
        <box
          position="absolute"
          left={renderers[currentName()].getPropPosition() === "front" ? curX() - 4 : curX()}
          top={renderers[currentName()].getPropPosition() === "front" ? curY() - 5 : curY()}
          zIndex={zBoost() ? 9998 : 50}
          onMouseDown={handleMouseDown}
          onMouseDrag={handleMouseDrag}
          onMouseUp={handleMouseUp}
          onMouseDragEnd={handleMouseUp}
        >
          {renderers[currentName()].propElement()}
        </box>
      ) : null}
      {renderers[currentName()]?.element() ? (
        <box
          position="absolute"
          left={curX()}
          top={curY()}
          zIndex={zBoost() ? 9999 : 100}
          onMouseDown={handleMouseDown}
          onMouseDrag={handleMouseDrag}
          onMouseUp={handleMouseUp}
          onMouseDragEnd={handleMouseUp}
        >
          {renderers[currentName()].element()}
        </box>
      ) : null}
    </>
  );
}
