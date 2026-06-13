/**
 * Expression frame names available for a mascot.
 * All are optional except "default".
 */
export type ExpressionName = 'default' | 'blink' | 'happy' | 'thinking' | 'busy' | 'sleeping';

/**
 * Current state of the mascot, determines which expression is shown.
 */
export type MascotState = 'idle' | 'busy' | 'thinking' | 'sleeping' | 'happy';

/**
 * Animation timing configuration with sensible defaults.
 */
export interface AnimationConfig {
  blinkInterval?: number;
  blinkChance?: number;
  expressionInterval?: number;
  idleTimeout?: number;
  breathInterval?: number;
  walkEnabled?: boolean;
  walkMinDelay?: number;
  walkMaxDelay?: number;
  jumpMinDelay?: number;
  jumpMaxDelay?: number;
}

// ─── Effect system types ───

/**
 * A single extra signal managed by the effect system.
 * The renderer creates a Solid signal for each and exposes get/set to timers and render.
 */
export interface SignalDef {
  name: string;
  initial: unknown;
}

/**
 * Timer context passed to EffectTimer.update().
 */
export interface EffectTimerCtx {
  /** Read an extra signal by name */
  get: (name: string) => unknown;
  /** Write an extra signal by name */
  set: (name: string, value: unknown) => void;
  /** Current mascot state */
  state: MascotState;
  /** Current frame override (null = use state mapping) */
  frameOverride: string | null;
  /** Override the displayed frame */
  setFrameOverride: (name: string | null) => void;
}

/**
 * A recurring timer that updates extra signals.
 */
export interface EffectTimer {
  /** Interval in ms */
  interval: number;
  /** Called on each tick */
  update: (ctx: EffectTimerCtx) => void;
}

/**
 * Context passed to EffectRenderFn.
 */
export interface EffectRenderCtx {
  state: MascotState;
  frameName: string;
  breathPhase: boolean;
  jumpOffset: number;
  dragging: boolean;
  get: (name: string) => unknown;
}

/**
 * Pack-defined render effect. Called after built-in rendering (breathing),
 * before final output. Return modified lines.
 */
export type EffectRenderFn = (lines: string[], ctx: EffectRenderCtx) => string[];

/**
 * Effect bundle: extra signals, timers, and render function.
 * Packs use this to define mascot-specific animations.
 */
export interface MascotEffects {
  /** Extra signals (name → initial value) */
  signals?: SignalDef[];
  /** Recurring timers that drive signal changes */
  timers?: EffectTimer[];
  /** Render hook — modify lines based on signals */
  render: EffectRenderFn;
}

/**
 * A complete mascot pack definition.
 *
 * Frames are plain string arrays — each string is one line, all lines same width.
 * "default" is required; all other expressions are optional.
 */
export interface MascotPack {
  name: string;
  displayName: string;
  version: string;
  author: string;
  description: string;

  /** ASCII-art frames keyed by expression name. "default" is required. */
  frames: {
    default: string[];
    blink?: string[];
    happy?: string[];
    thinking?: string[];
    busy?: string[];
    sleeping?: string[];
  };

  /** Optional color for the mascot text */
  colors?: {
    defaultFg?: string;
  };

  animations?: AnimationConfig;

  /** Mascot-specific animation effects (timers + render) */
  effects?: MascotEffects;
}
