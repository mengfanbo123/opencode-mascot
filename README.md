# 🐱 opencode-mascot

> OpenCode TUI mascot plugin framework — bring your terminal to life

Customizable ASCII mascots that breathe, walk, sleep, get launched across the screen, blown up by falling bombs, then quietly reassemble themselves.

[English](./README.md) | [简体中文](./README_zh-CN.md)

---

## ✨ Features

### 🎭 Built-in Characters (2)

| Character | Description | Color |
|-----------|-------------|-------|
| **yueer** | Purple-haired girl with an ahoge, tsundere style, default mascot | `#8B7EB8` lavender |
| **baozi** | A steaming hot bun, warm and cozy | `#D4885A` warm orange |

Each character includes **5 expression frames**: default / blink / happy / thinking / sleeping

---

### 🎬 Automatic Animations (16)

**Built-in (shared by all characters):**

| # | Animation | Trigger | Effect |
|---|-----------|---------|--------|
| 1 | Blink | Random (30% / 2.5s) | Switch to blink frame for 150ms |
| 2 | Random expression | Every 8s | Cycles expressions while idle |
| 3 | Breathing | Every 3s | Lines shift up one row, simulating breathing |
| 4 | Walking | Every 20-40s | Sways left and right (14-step path) |
| 5 | Jumping | Every 20-40s | Bounces -2 → -1 → 0 |
| 6 | Sleep | Idle 90-120s | Auto-closed eyes + alien-text Zzz |

**yueer exclusive:**

| # | Animation | Trigger | Effect |
|---|-----------|---------|--------|
| 7 | Ahoge sparkle | Random (25% / 1.5s) | ☆ ↔ ★ |
| 8 | Happy head sway | happy state | Face sways left/right + ahoge synced |
| 9 | Thinking foot stomp | thinking state | Left foot fixed, right foot stomps ║↔_ |
| 10 | Thinking face shift | thinking state | 6 expressions rotate (o_o / O_O / >_o / o_< / ⊙_⊙ / ◔_◔) |
| 11 | Alien text bubble | busy/thinking | 12 alien-text phrases rotate |
| 12 | Drag arm flail | While dragging | Arms ┃███┃ ↔ ╱███╲ |
| 13 | Jump arm flail | While jumping | Same as above |

**baozi exclusive:**

| # | Animation | Trigger | Effect |
|---|-----------|---------|--------|
| 14 | Steam | Continuous | 4 steam patterns rotate |
| 15 | Alien text bubble | busy/thinking | 12 alien-text phrases rotate |
| 16 | Drag panic | While dragging | `( °□° )` |

---

### 🖱️ Interactions (5)

| # | Action | Effect |
|---|--------|--------|
| 1 | **Alt + drag** | Freely move the mascot anywhere |
| 2 | **Double-click** | Cycle through characters (within 300ms) |
| 3 | **Drag color flash** | Body flashes through 8 highlight colors at 100ms, locks on release |
| 4 | **Drag alien text** | Pink "let go of me" alien text appears above head while dragging |
| 5 | **Drag panic** | `( °□° )` face + arms flailing while dragging |

---

### 🫣 Peek-a-Boo System (Work Page)

| # | Action | Effect |
|---|--------|--------|
| 1 | Drag to left edge | Mascot hides, only 2 rows visible |
| 2 | Release at edge | Auto peek cycle (peeks 2 more rows every 1.2s, then retreats) |
| 3 | Click / start working | Slides back from edge + bounce |

---

### 💥 Random Events (3)

| # | Event | Trigger | Effect |
|---|-------|---------|--------|
| 1 | **Fall apart** | Jump landing 40% / bounce 50% | Lines scatter → reassemble after 1.5s |
| 2 | **Bomb drop** | 10% chance replacing walk (idle) | Fuse burns ✦/◌ + countdown ³·→²·→¹· → white flash explosion + `ᵇᵒᵒᵐ~` → reassemble |
| 3 | **Scatter & assemble** | Startup / switch to work page | Lines start from random positions, 15-frame linear interpolation to home |

---

### 🔄 Auto-Update

- Checks npm latest version on startup → semver compare → `npm pack` download → `tar` extract overwrite
- File lock prevents concurrency (30s expiry auto-cleanup)
- Syncs opencode plugin manifest version to prevent rollback on restart
- On successful update: mascot jumps to celebrate + alien-text version number `ᵘᵖ→⁰·⁵·¹`

---

### 🎵 State Sync

| Trigger | Effect |
|---------|--------|
| session busy | Alien text bubble + 8-color highlight flash |
| session thinking | Foot stomp + face shift + alien text |
| session happy | Head sway celebration 3s |
| session idle timeout | Auto-sleep + alien-text Zzz (`zᶻ...` → `zᶻᶻ...` → `zᶻᶻᶻ...`) |
| Drag while sleeping | Startles awake to idle + arm flail panic |

> All states default to yueer. Double-click to manually switch to baozi.

---

### 🚀 Startup Effects

- Version number shown 2s after startup as alien-text `ᵛ⁰·⁵·¹` (3s duration)
- Home page mascot appears at random horizontal position
- Work page scatter-assemble animation on first message / `opencode -c`

---

## 📦 Installation

Add to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["@mingxy/opencode-mascot@latest"]
}
```

Restart opencode. The plugin auto-updates to the latest version.

## 🛠️ Tech Stack

- **TypeScript** ESM
- **@opentui/solid** — SolidJS reactive TUI rendering
- **@opencode-ai/plugin** — OpenCode plugin API
- Zero runtime dependencies (peer dep only)
- TypeScript type-checked

## 📂 Project Structure

```
opencode-mascot/
├── tui.tsx                          # Plugin entry, registers slots + startup
├── src/
│   ├── core/
│   │   ├── types.ts                 # MascotPack / MascotState / Effect types
│   │   ├── ascii-renderer.tsx       # Core rendering engine (574 lines, 16+ animations)
│   │   ├── mascot-loader.ts         # Built-in character loader
│   │   ├── celebration-bus.ts       # Module-level event bus
│   │   ├── updater.ts               # npm auto-update
│   │   └── logger.ts                # File logger
│   ├── components/
│   │   ├── home-mascot.tsx          # Home page mascot
│   │   └── sidebar-mascot.tsx       # Work page mascot (peek-a-boo)
│   └── builtins/
│       ├── yueer/                   # yueer (frames + effects)
│       └── baozi/                   # baozi (frames + effects)
```

## 🎨 Custom Characters

Define a `MascotPack`:

```typescript
import type { MascotPack } from "@mingxy/opencode-mascot/types";

const myMascot: MascotPack = {
  name: "@mingxy/mascot-custom",
  displayName: "Kitty",
  version: "0.1.0",
  author: "you",
  description: "My custom mascot",

  frames: {
    default: ["  /\\_/\\  ", " ( o.o ) ", "  > ^ <  "],
    blink:   ["  /\\_/\\  ", " ( -.- ) ", "  > ^ <  "],
    happy:   ["  /\\_/\\  ", " ( ^ω^ ) ", "  > ^ <  "],
    sleeping:["  /\\_/\\  ", " ( -.- ) ", "  > z z  "],
  },

  colors: { defaultFg: "#FFB6C1" },

  effects: {
    signals: [],
    timers: [],
    render(lines, ctx) { return lines; },
  },
};
```

All built-in animations (blink/breath/walk/jump/sleep/drag/color-flash/bomb/fall-apart/reassemble) **work automatically**.

## 📊 Capabilities

| Category | Count |
|----------|-------|
| Built-in characters | 2 |
| Expression frames | 5 / character |
| Auto animations | 16 |
| Interactions | 5 |
| Peek-a-boo behaviors | 3 |
| Random events | 3 |
| Alien text phrases | 24 (12/character) |
| Flash colors | 8 |
| Drag alien text | 6 |
| **Total** | **33+** |

## 📄 License

MIT © [mingxy](https://github.com/mengfanbo123)

## 🔗 Links

- [GitHub](https://github.com/mengfanbo123/opencode-mascot)
- [npm](https://www.npmjs.com/package/@mingxy/opencode-mascot)
- [中文文档](./README_zh-CN.md)
