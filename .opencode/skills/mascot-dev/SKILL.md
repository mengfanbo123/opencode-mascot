---
name: mascot-dev
description: opencode-mascot 项目开发规范。在本项目中做任何修改、新增角色、添加动画、发版时必须使用。触发关键词：改mascot、加动画、加角色、改月儿、改包子、发版、publish、tui插件、ascii角色、sidebar动画、home动画。
---

# opencode-mascot 开发规范

## 项目身份

- **包名**: `@mingxy/opencode-mascot`
- **npm scope**: `@mingxy`（所有 opencode 插件统一前缀）
- **仓库**: github.com/mengfanbo123/opencode-mascot
- **License**: MIT
- **Author**: mingxy
- **当前主角色**: 月儿 (yueer)，辅助角色: 包子 (baozi)

## 技术栈

- TypeScript ESM（源码直接发布，无构建步骤）
- SolidJS reactive（`@opentui/solid`）
- OpenCode 插件 API（`@opencode-ai/plugin`）
- `main` 指向 `tui.tsx`，npm 包含 `tui.tsx` + `src/`

## 项目结构

```
opencode-mascot/
├── tui.tsx                      # 插件入口，注册 TUI 组件
├── package.json                 # @mingxy/opencode-mascot
├── src/
│   ├── components/
│   │   ├── home-mascot.tsx      # 首页吉祥物（全屏区域）
│   │   └── sidebar-mascot.tsx   # 侧栏吉祥物（工作页边缘）
│   ├── core/
│   │   ├── types.ts             # MascotPack / MascotState / Effect 等类型定义
│   │   ├── ascii-renderer.tsx   # 动画渲染引擎（blink/breath/walk/jump/effects）
│   │   ├── mascot-loader.ts     # 角色注册表 BUILTINS map
│   │   ├── celebration-bus.ts   # 事件总线（celebrate/version/scatter）
│   │   ├── logger.ts            # 日志
│   │   └── updater.ts           # 自动更新检查
│   └── builtins/
│       ├── yueer/index.ts       # 月儿角色定义
│       └── baozi/index.ts       # 包子角色定义
```

## 开发命令

```bash
# 类型检查（唯一的验证命令，无 build/test）
npm run typecheck    # tsc --noEmit

# codegraph 同步（提交前必须执行）
codegraph sync
```

**没有 build 命令**——源码直接发布到 npm。

## 本地调试（新版本迭代时）

开发调试期间用本地文件引用，改完代码重启 opencode 立即生效，省去 npm publish + commit + push 流程。

### 配置 tui.json

编辑 `~/.config/opencode/tui.json`，把 plugin 从线上改成本地路径：

```json
{
  "plugin": ["@slkiser/opencode-quota@latest", "/mnt/d/dev/github/project/opencode-mascot"]
}
```

本地路径直接写绝对路径（不带 `file:` 前缀）。

### 调试流程

1. 改代码 → `npm run typecheck` 验证
2. 重启 opencode → 本地代码立即生效
3. 测试满意后按发版流程发版
4. **发版后恢复 tui.json 回线上引用**：`@mingxy/opencode-mascot@latest`

### 查看日志

调试日志在 `~/.cache/opencode/logs/mascot.log`，用 `log("DEBUG", "...")` 输出。

## 发版规则

**只有 `src/` 或 `tui.tsx` 代码逻辑变更才发版。**

| 改动类型 | 发版？ | 操作 |
|---|---|---|
| `src/` 或 `tui.tsx` 逻辑变更 | ✅ 发版 | 完整发版流程 |
| 纯文档（README/CHANGELOG/CONTRIBUTING/CI/.gitignore） | ❌ 不发版 | 只 commit + push |

## 发版流程（严格遵守顺序）

```
1. codegraph sync
2. npm version patch --no-git-tag-version
3. git add -A && git commit -m "中文描述"
4. git push
5. npm publish --access public
6. git tag v{版本号} && git push origin v{版本号}
```

**铁律**：commit 前必须 `codegraph sync`。commit message 用中文。

## 角色开发规范

### MascotPack 结构（src/core/types.ts）

```typescript
interface MascotPack {
  name: string;
  displayName: string;
  version: string;
  author: string;
  description: string;

  // ASCII 艺术帧，每个 string 是一行，所有行必须等宽
  frames: {
    default: string[];    // 必须
    blink?: string[];     // 眨眼
    happy?: string[];     // 开心
    thinking?: string[];  // 思考
    busy?: string[];      // 忙碌
    sleeping?: string[];  // 睡觉
  };

  colors?: { defaultFg?: string };
  animations?: AnimationConfig;    // 时序配置
  effects?: MascotEffects;         // 自定义动画效果
}
```

### 新增角色步骤

1. 创建 `src/builtins/{角色名}/index.ts`
2. 导出一个完整的 `MascotPack`
3. 在 `src/core/mascot-loader.ts` 的 `BUILTINS` 中注册
4. frames 每行**必须等宽**（ASCII 对齐）
5. `default` 帧是必须的，其余可选

### AnimationConfig 参数

```typescript
{
  blinkInterval?: number;       // 眨眼间隔 ms
  blinkChance?: number;         // 每次眨眼概率
  expressionInterval?: number;  // 表情切换间隔
  idleTimeout?: number;         // 空闲超时 ms
  breathInterval?: number;      // 呼吸间隔 ms
  walkEnabled?: boolean;        // 是否随机走动
  walkMinDelay?: number;        // 走动最小间隔
  walkMaxDelay?: number;
  jumpMinDelay?: number;        // 跳跃最小间隔
  jumpMaxDelay?: number;
}
```

### MascotEffects（角色专属动画）

```typescript
interface MascotEffects {
  signals?: SignalDef[];         // 额外状态信号
  timers?: EffectTimer[];        // 定时器驱动信号变化
  render: EffectRenderFn;        // 渲染钩子，修改最终输出行
}
```

effects 系统：timers 更新 signals → render 函数读 signals 修改 ASCII 行。

### 注册新角色

```typescript
// src/core/mascot-loader.ts
import { yueerPack } from "../builtins/yueer";
import { baoziPack } from "../builtins/baozi";

const BUILTINS: Record<string, MascotPack> = {
  yueer: yueerPack,
  baozi: baoziPack,
  // 新角色加这里
};
```

## 核心系统

### ascii-renderer.tsx

动画引擎，内置动画类型：
- **blink** - 随机眨眼
- **breath** - 呼吸（周期性微调）
- **walk** - 随机走动（水平移动）
- **jump** - 随机跳跃（垂直弹跳）
- **idle** - 空闲超时切 sleeping
- **effects** - 角色自定义动画（通过 signals + timers + render）

### celebration-bus.ts

事件总线，导出：
- `onCelebrate` - 庆祝事件（撒花等）
- `onVersion` - 版本显示
- `onScatter` - 散开重组动画

### 组件层

- **home-mascot.tsx** - 首页角色，全屏可拖拽区域，启动默认 yueer
- **sidebar-mascot.tsx** - 工作页侧栏角色，边缘 peek/hide，`DEFAULT_STATE_MAP` 控制状态→角色映射

### 状态映射（sidebar-mascot.tsx）

```typescript
const DEFAULT_STATE_MAP: Partial<Record<MascotState, string>> = {
  idle: "yueer",
  happy: "yueer",
  thinking: "yueer",
  busy: "yueer",
  sleeping: "yueer",
};
```

当前所有状态锁定 yueer。要解除锁定改这里。

## 编码约定

- **角色选择**: 启动和状态切换默认 yueer，不随机
- **ASCII 对齐**: frames 每行必须等宽，否则渲染错位
- **中文 commit**: `type: 中文描述` 格式
- **版本号**: patch 递增，如 0.5.5 → 0.5.6
- **无 build 步骤**: 改完 typecheck 过了就能发
- **solid signals**: 用 `createSignal` 管理状态，不直接操作 DOM
- **timer 清理**: 组件用 `onCleanup` 清理所有 setInterval/setTimeout

## 已知能力清单（参考）

- 内置角色：月儿 + 包子
- 表情帧：5 个/角色（default/blink/happy/thinking/busy/sleeping）
- 自动动画：blink/breath/walk/jump/idle + 角色专属 effects
- 交互：拖拽、右键切换角色、双击触发
- 躲猫猫：sidebar peek/hide
- 随机意外：炸弹爆炸、摔坏重组、启动打散聚合
- 状态联动：idle/busy/thinking/happy/sleeping 表情切换
- 启动效果：散开重组、版本号显示
- 自动更新：版本检查
