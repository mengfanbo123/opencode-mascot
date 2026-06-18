/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createRoot, Show, type JSX } from "solid-js"
import { loadAllMascots } from "./src/core/mascot-loader"
import { SidebarMascot, stopPhaseMachine, hideMascotPosition, showMascotPosition, resetLastBusySessionId } from "./src/components/sidebar-mascot"
import { HomeMascot, hideHomeMascotPosition, showHomeMascotPosition } from "./src/components/home-mascot"
import { checkAndUpdate } from "./src/core/updater"
import { emitCelebrate, emitVersion, emitScatter } from "./src/core/celebration-bus"
import { mascotVisible, setMascotVisible, phaseMachineOn, setPhaseMachineOn } from "./src/core/mascot-state"
import { log } from "./src/core/logger"

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pluginVersion = "unknown";
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8"));
  if (pkg?.version && typeof pkg.version === "string") {
    pluginVersion = pkg.version;
  }
} catch {}

// ==========================================================================
// ⚠️ MOUNT 风暴根因修复 - 禁止删除此 createRoot 缓存 ⚠️
// 根因: opencode session/index.tsx 的 Show/Switch 条件渲染导致 Sidebar 子树
//       每秒 destroy/recreate 3-4 次 → opentui reconciler bug #733/#680
//       → native 层 stale node 累积 → RSS 涨到 2GB 卡死
// 修复: createRoot 创建的 reactive scope 不在父组件 owner 下，
//       父组件 destroy 时 dispose 不到这个 root 的 native 节点
// 数据: mount 从 1380 次/2分钟 → 1 次（2026-06-17 独立 demo 验证）
// ⚠️ 月儿 2026-06-17 曾误删此缓存导致 mount 风暴回归，禁止再删 ⚠️
// ==========================================================================
let cachedSidebarElement: JSX.Element | null = null;
let cachedSidebarDispose: (() => void) | null = null;

// 强制卸载 cachedSidebar：清 reactive scope + null 缓存，下次 sidebar_content 调用重建
// 用途：toggle off 时立刻消失（<Show> 在 createRoot 隔离 scope 内不响应，靠 dispose 强制清 native 节点）
const disposeCachedSidebar = () => {
  if (cachedSidebarDispose) {
    cachedSidebarDispose();
    cachedSidebarDispose = null;
    cachedSidebarElement = null;
  }
};

const tui: TuiPlugin = async (api, _options) => {
  const mascots = loadAllMascots()

  api.slots.register({
    order: 160,
    slots: {
      sidebar_content() {
        if (!cachedSidebarElement) {
          cachedSidebarElement = createRoot((dispose) => {
            cachedSidebarDispose = dispose;
            return <SidebarMascot mascots={mascots} api={api} />;
          });
        }
        // Show 在 createRoot 外控制显隐：toggle off 立刻隐藏，on 立刻显示
        // createRoot 内 SidebarMascot 保留（堵 mount 风暴），Show 只切可见性
        return (
          <Show when={mascotVisible()} fallback={<></>}>
            {cachedSidebarElement}
          </Show>
        );
      },
      home_bottom() {
        return <HomeMascot mascots={mascots} api={api} />
      }
    }
  })

  if (api.command?.register) {
    api.command.register(() => [
      {
        title: "Mascot: Toggle visibility",
        value: "mascot.toggle",
        description: "Show/hide mascot character",
        onSelect: () => {
          const next = !mascotVisible();
          setMascotVisible(next);
          if (!next) {
            setPhaseMachineOn(false);
            stopPhaseMachine();
            hideMascotPosition();
            hideHomeMascotPosition();
            log("INFO", "mascot.toggle OFF: position moved offscreen (sidebar+home), stopPhaseMachine called, ascii-renderer timers guarded by mascotVisible()=false");
          } else {
            showMascotPosition();
            showHomeMascotPosition();
            log("INFO", "mascot.toggle ON: position restored (sidebar+home), timers resume");
          }
          api.ui.toast({ message: `Mascot ${next ? "ON" : "OFF"}` });
        }
      },
      {
        title: "Mascot: Toggle Easter eggs",
        value: "mascot.easter",
        description: "Turn Phase Machine on/off",
        onSelect: () => {
          const next = !phaseMachineOn();
          setPhaseMachineOn(next);
          if (!next) stopPhaseMachine();
          else resetLastBusySessionId();
          api.ui.toast({ message: `Easter: ${next ? "ON" : "OFF"}` });
        }
      }
    ])
  }

  api.lifecycle.onDispose(() => {
    disposeCachedSidebar();
  });

  checkAndUpdate(pluginVersion, (newVersion) => {
    emitCelebrate(newVersion);
    emitVersion(newVersion);
  }).catch(() => {});

  setTimeout(() => emitScatter(), 100);
  setTimeout(() => emitVersion(pluginVersion), 2000);
}

const plugin: TuiPluginModule = {
  id: "@mingxy/opencode-mascot",
  tui
}

export default plugin
