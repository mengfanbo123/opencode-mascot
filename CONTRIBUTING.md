# Contributing to opencode-mascot

感谢你的兴趣！这个项目欢迎任何形式的贡献。

## 开发准备

```bash
git clone https://github.com/mengfanbo123/opencode-mascot.git
cd opencode-mascot
npm install
```

## 开发命令

```bash
npm run typecheck    # TypeScript 类型检查（唯一的验证命令）
```

本项目没有构建步骤——源码直接发布到 npm。typecheck 通过即可。

## 项目结构

```
tui.tsx                      插件入口
src/
├── core/                    核心引擎（渲染/类型/加载器/事件总线）
│   ├── types.ts             类型定义——改接口先看这里
│   ├── ascii-renderer.tsx   动画引擎——blink/breath/walk/jump/effects
│   ├── mascot-loader.ts     角色注册表——新增角色在这里注册
│   ├── celebration-bus.ts   事件总线
│   └── updater.ts           自动更新
├── components/              TUI 组件
│   ├── home-mascot.tsx      首页吉祥物
│   └── sidebar-mascot.tsx   工作页侧栏吉祥物
└── builtins/                内置角色
    ├── yueer/               月儿
    └── baozi/               包子
```

## 新增角色

1. 在 `src/builtins/{name}/` 下创建 `index.ts`
2. 导出一个 `MascotPack`（类型见 `src/core/types.ts`）
3. 在 `src/core/mascot-loader.ts` 的 `BUILTINS` 中注册
4. frames 每行必须等宽（ASCII 对齐）
5. `default` 帧必须，其余表情帧可选

## 新增动画

内置动画在 `src/core/ascii-renderer.tsx`。角色专属动画通过 `MascotEffects` 接口实现：

```typescript
effects: {
  signals: [{ name: "mySignal", initial: 0 }],
  timers: [{
    interval: 1000,
    update(ctx) { ctx.set("mySignal", (ctx.get("mySignal") + 1) % 2); },
  }],
  render(lines, ctx) {
    // 根据 ctx.get("mySignal") 修改 lines
    return lines;
  },
}
```

## 提交规范

- Commit message 用中文：`type: 简短描述`
- type: `feat`（新功能）/ `fix`（修复）/ `docs`（文档）/ `refactor`（重构）
- 提交前确保 `npm run typecheck` 通过

## 发版流程（维护者）

```
1. codegraph sync
2. npm version patch --no-git-tag-version
3. git add -A && git commit -m "中文描述"
4. git push
5. npm publish --access public
6. git tag v{版本号} && git push origin v{版本号}
```

## 行为准则

保持友善、尊重。技术讨论对事不对人。
