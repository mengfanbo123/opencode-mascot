/** @jsxImportSource @opentui/solid */

import { createSignal, onCleanup, type Accessor } from "solid-js";

type DragState = "normal" | "edge_hidden" | "returning";
type HideSide = "left" | "right" | null;

export interface MouseProps {
  onMouseDown: (e: any) => void;
  onMouseDrag: (e: any) => void;
  onMouseUp: (e: any) => void;
  onMouseDragEnd: (e: any) => void;
}

interface UseDraggableOpts {
  initialX: number;
  initialY: number;
  mascotWidth: number;
  mascotHeight: number;
  onSwitch: () => void;
  clearSelection: () => void;
  setDragging: (v: boolean) => void;
  onReturnComplete?: () => void;
  peekVisible?: number;
  enableEdge?: boolean;
}

function getTermSize(): { width: number; height: number } {
  const width = (typeof process !== "undefined" && process.stdout?.columns) || 80;
  const height = (typeof process !== "undefined" && process.stdout?.rows) || 24;
  return { width, height };
}

export function useDraggableMascot(opts: UseDraggableOpts): {
  posX: Accessor<number>;
  posY: Accessor<number>;
  mouseProps: MouseProps;
  returnToView: () => void;
  isHidden: () => boolean;
} {
  const peek = opts.peekVisible ?? 2;
  const enableEdge = opts.enableEdge ?? true;

  const [posX, setPosX] = createSignal(opts.initialX);
  const [posY, setPosY] = createSignal(opts.initialY);

  let dragStartX = 0;
  let dragStartY = 0;
  let dragAnchorX = 0;
  let dragAnchorY = 0;
  let lastClickTime = 0;
  let isDragging = false;
  let state: DragState = "normal";
  let hideSide: HideSide = null;
  let peekTimer: ReturnType<typeof setInterval> | null = null;
  let returnTimer: ReturnType<typeof setInterval> | null = null;

  const stopPeek = () => {
    if (peekTimer) { clearInterval(peekTimer); peekTimer = null; }
  };
  const stopReturn = () => {
    if (returnTimer) { clearInterval(returnTimer); returnTimer = null; }
  };

  onCleanup(() => { stopPeek(); stopReturn(); });

  const clampX = (rawX: number): number => {
    if (!enableEdge) return rawX;
    const { width } = getTermSize();
    const minX = -(opts.mascotWidth - peek);
    const maxX = width - peek;
    return Math.max(minX, Math.min(rawX, maxX));
  };

  const clampY = (rawY: number): number => {
    if (!enableEdge) return rawY;
    const { height } = getTermSize();
    return Math.max(0, Math.min(rawY, height - opts.mascotHeight));
  };

  const startPeek = () => {
    stopPeek();
    state = "edge_hidden";
    let phase = false;
    peekTimer = setInterval(() => {
      phase = !phase;
      const stretch = phase ? 2 : 0;
      const { width } = getTermSize();
      if (hideSide === "left") {
        setPosX(-(opts.mascotWidth - peek) + stretch);
      } else if (hideSide === "right") {
        setPosX(width - peek - stretch);
      }
    }, 1200);
  };

  const returnToView = () => {
    if (state !== "edge_hidden") return;
    stopPeek();
    state = "returning";
    const { width } = getTermSize();
    const cur = posX();
    const targetX = hideSide === "left" ? 0 : Math.max(0, width - opts.mascotWidth);
    const step = targetX > cur ? 2 : -2;

    returnTimer = setInterval(() => {
      const now = posX();
      if (Math.abs(now - targetX) <= 2) {
        setPosX(targetX);
        stopReturn();
        state = "normal";
        hideSide = null;
        opts.onReturnComplete?.();
        return;
      }
      setPosX(now + step);
    }, 16);
  };

  const checkEdgeOnRelease = () => {
    if (!enableEdge) return;
    const { width } = getTermSize();
    const x = posX();
    if (x <= -(opts.mascotWidth - peek) + 1) {
      hideSide = "left";
      startPeek();
    } else if (x >= width - peek - 1) {
      hideSide = "right";
      startPeek();
    }
  };

  const mouseProps: MouseProps = {
    onMouseDown(e: any) {
      if (state === "edge_hidden") {
        returnToView();
        return;
      }
      if (state === "returning") return;

      const now = Date.now();
      if (now - lastClickTime < 300) {
        opts.onSwitch();
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
        opts.setDragging(true);
        e.preventDefault();
        e.stopPropagation();
        opts.clearSelection();
      }
    },
    onMouseDrag(e: any) {
      if (e.modifiers?.alt && isDragging) {
        setPosX(clampX(dragAnchorX + (e.x - dragStartX)));
        setPosY(clampY(dragAnchorY + (e.y - dragStartY)));
        e.preventDefault();
        e.stopPropagation();
        opts.clearSelection();
      }
    },
    onMouseUp() {
      if (isDragging) {
        isDragging = false;
        opts.setDragging(false);
        checkEdgeOnRelease();
      }
    },
    onMouseDragEnd() {
      if (isDragging) {
        isDragging = false;
        opts.setDragging(false);
        checkEdgeOnRelease();
      }
    },
  };

  return { posX, posY, mouseProps, returnToView, isHidden: () => state === "edge_hidden" };
}
