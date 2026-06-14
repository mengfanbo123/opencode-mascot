# 🐱 opencode-mascot

> OpenCode TUI 吉祥物插件框架 — 让你的终端活起来

可自定义的 ASCII 吉祥物，在你的 OpenCode 终端里呼吸、走路、睡觉、被打飞、被炸碎，然后默默爬回来重新组装。

[English](./README.md) | [简体中文](./README_zh-CN.md)

## ✨ 特色

### 🎭 内置形象（2个）

| 形象 | 描述 | 颜色 |
|------|------|------|
| **月儿** (yueer) | 紫发呆毛女孩，傲娇风格，默认形象 | `#8B7EB8` 淡紫 |
| **包子** (baozi) | 热气腾腾的包子，温暖治愈 | `#D4885A` 暖橙 |

每个形象包含 **5 种表情帧**：default / blink / happy / thinking / sleeping

---

### 🎬 自动动画（16种）

**Renderer 内置（所有形象共享）：**

| # | 动画 | 触发 | 效果 |
|---|------|------|------|
| 1 | 眨眼 | 随机（30%概率/2.5s） | 切换 blink 帧 150ms |
| 2 | 随机表情 | 每 8s | idle 时随机切换表情 |
| 3 | 呼吸 | 每 3s | 行向上偏移一格，模拟呼吸起伏 |
| 4 | 走路 | 每 20-40s | 左右晃动（14步路径） |
| 5 | 跳跃 | 每 20-40s | 弹跳 -2→-1→0 |
| 6 | 睡眠 | idle 90-120s | 自动闭眼 + 火星文 Zzz |

**月儿专属（yueer effects）：**

| # | 动画 | 触发 | 效果 |
|---|------|------|------|
| 7 | 呆毛闪烁 | 随机（25%/1.5s） | ☆ ↔ ★ |
| 8 | 开心晃头 | happy 状态 | 脸左右摆 + 呆毛同步偏移 |
| 9 | 思考跺脚 | thinking 状态 | 左脚固定 ║，右脚 ║↔_ 单脚跺 |
| 10 | 思考变脸 | thinking 状态 | 6种表情轮换（o_o / O_O / >_o / o_< / ⊙_⊙ / ◔_◔） |
| 11 | 火星文气泡 | busy/thinking | 12条上标火星文轮换 |
| 12 | 拖拽扇手 | 拖拽中 | 手臂 ┃███┃ ↔ ╱███╲ |
| 13 | 跳跃扇手 | 跳跃中 | 同上 |

**包子专属（baozi effects）：**

| # | 动画 | 触发 | 效果 |
|---|------|------|------|
| 14 | 冒热气 | 持续 | 4种蒸汽图案轮换 |
| 15 | 火星文气泡 | busy/thinking | 12条上标火星文轮换 |
| 16 | 拖拽惊恐 | 拖拽中 | `( °□° )` |

---

### 🖱️ 交互能力（5种）

| # | 操作 | 效果 |
|---|------|------|
| 1 | **Alt + 鼠标拖拽** | 自由移动吉祥物位置（首页 + 工作页） |
| 2 | **双击切换** | 300ms 内双击 → 循环切换形象 |
| 3 | **拖拽变色** | 拖拽时身体 8 种高亮色 100ms 快速闪换，松手定格 |
| 4 | **拖拽火星文** | 拖拽时头顶粉色"放开我"火星文轮换（ᶠᵃⁿᵍ/ᵏᵃⁱ/ᵇᵘᶠᵃⁿᵍ...） |
| 5 | **拖拽惊恐** | 拖拽时 `( °□° )` 表情 + 手臂疯狂扇动 |

---

### 🫣 躲猫猫系统（工作页）

| # | 动作 | 效果 |
|---|------|------|
| 1 | 拖到左边缘 | 吉祥物藏起来，只露 2 格 |
| 2 | 松手贴边 | 自动进入探头循环（每 1.2s 偷偷多露 2 格再缩回） |
| 3 | 点击 / 开始工作 | 从边界滑回 + bounce 弹跳归位 |

---

### 💥 随机意外事件（3种）

| # | 事件 | 触发 | 效果 |
|---|------|------|------|
| 1 | **摔坏** | 跳跃落地 40% / bounce 归位 50% | 行散开倒地 → 1.5s 后自动重组 |
| 2 | **天降炸弹** | idle 时 10% 概率替代走路 | 引线 ✦/◌ 燃烧 + 倒计时 ³·→²·→¹· → 白闪爆炸 + `ᵇᵒᵒᵐ~` → 重组 |
| 3 | **打散聚合** | 启动 / 切到工作页 | 行从随机位置 15 帧线性插值聚合归位 |

---

### 🔄 自动更新

- 启动时检测 npm 最新版 → semver 比较 → `npm pack` 下载 → `tar` 解压覆盖
- 文件锁防并发（30s 过期自动清理）
- 同步更新 opencode 插件管理清单版本号，防止重启回滚
- 更新成功后吉祥物跳跃庆祝 + 火星文版本号 `ᵘᵖ→⁰·⁵·¹`

---

### 🎵 状态联动

| 触发 | 效果 |
|------|------|
| session busy | 火星文气泡 + 8色高亮闪烁 |
| session thinking | 跺脚 + 变脸 + 火星文气泡 |
| session happy | 晃头庆祝 3s |
| session idle 超时 | 自动睡觉 + 火星文 Zzz（`zᶻ...` → `zᶻᶻ...` → `zᶻᶻᶻ...`） |
| 拖拽睡眠中 | 惊醒到 idle + 扇手惊恐 |

> 默认所有状态使用月儿形象。可通过右键双击手动切换包子。

---

### 🚀 启动效果

- 启动 2s 后头顶显示火星文版本号 `ᵛ⁰·⁵·¹`（3秒）
- 首页吉祥物水平随机位置出现
- 工作页首次对话 / `opencode -c` 时打散聚合动画

---

## 📦 安装

在 `~/.config/opencode/tui.json` 中添加插件：

```json
{
  "plugin": ["@mingxy/opencode-mascot@latest"]
}
```

重启 opencode 即可。插件会自动更新到最新版。

## 🛠️ 技术栈

- **TypeScript** ESM
- **@opentui/solid** — SolidJS 响应式 TUI 渲染
- **@opencode-ai/plugin** — OpenCode 插件 API
- 零运行时依赖（peer dep only）
- TypeScript 类型检查通过

## 📂 项目结构

```
opencode-mascot/
├── tui.tsx                          # 插件入口，注册 slots + 启动逻辑
├── src/
│   ├── core/
│   │   ├── types.ts                 # MascotPack / MascotState / Effect 类型
│   │   ├── ascii-renderer.tsx       # 核心渲染引擎（574行，16+ 动画）
│   │   ├── mascot-loader.ts         # 内置形象加载器
│   │   ├── celebration-bus.ts       # 模块级事件总线（celebrate/version/scatter）
│   │   ├── updater.ts               # npm 自动更新（pack + tar + 版本同步）
│   │   └── logger.ts                # 文件日志（~/.cache/opencode/logs/mascot.log）
│   ├── components/
│   │   ├── home-mascot.tsx          # 首页吉祥物（随机位置 + translate 拖拽）
│   │   └── sidebar-mascot.tsx       # 工作页吉祥物（absolute 定位 + 躲猫猫）
│   └── builtins/
│       ├── yueer/                   # 月儿形象（frames + effects）
│       │   ├── frames.ts            # 5 帧 ASCII art
│       │   └── index.ts             # 专属动画（呆毛/晃头/跺脚/变脸/气泡/扇手）
│       └── baozi/                   # 包子形象（frames + effects）
│           ├── frames.ts            # 5 帧 ASCII art
│           └── index.ts             # 专属动画（蒸汽/气泡/惊恐）
```

## 🎨 自定义形象

创建新的吉祥物只需定义一个 `MascotPack`：

```typescript
import type { MascotPack } from "@mingxy/opencode-mascot/types";

const myMascot: MascotPack = {
  name: "@mingxy/mascot-custom",
  displayName: "小猫",
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

所有内置动画（眨眼/呼吸/走路/跳跃/睡眠/拖拽/变色/炸弹/摔坏/重组）**自动生效**。

## 📊 能力统计

| 类别 | 数量 |
|------|------|
| 内置形象 | 2 |
| 表情帧 | 5 / 形象 |
| 自动动画 | 16 |
| 交互操作 | 5 |
| 躲猫猫行为 | 3 |
| 随机意外 | 3 |
| 火星文气泡 | 24（12/形象） |
| 闪色颜色 | 8 |
| 拖拽火星文 | 6 |
| **总能力** | **33+** |

## 📄 License

MIT © [mingxy](https://github.com/mengfanbo123)

## 🔗 Links

- [GitHub](https://github.com/mengfanbo123/opencode-mascot)
- [npm](https://www.npmjs.com/package/@mingxy/opencode-mascot)
