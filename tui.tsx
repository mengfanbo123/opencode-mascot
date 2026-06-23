/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createRoot, createSignal, type JSX } from "solid-js"
import { loadAllMascots } from "./src/core/mascot-loader"
import { SidebarMascot, stopPhaseMachine, restoreMascotPosition, resetLastBusySessionId, triggerEasterIfBusy, resumeBusyState } from "./src/components/sidebar-mascot"
import { HomeMascot, hideHomeMascotPosition } from "./src/components/home-mascot"
import { checkAndUpdate } from "./src/core/updater"
import { emitCelebrate, emitVersion, emitScatter } from "./src/core/celebration-bus"
import { mascotVisible, setMascotVisible, phaseMachineOn, setPhaseMachineOn, forceSidebarRebuild, markSlotActive, isSlotStale } from "./src/core/mascot-state"
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
// ⚠️ 2026-06-18 补丁：加 disposed 标志。home→work 跳转时 opencode dispose
//    旧 root（native 节点随之失效），下次 sidebar_content 调用时检测到
//    disposed → recreate 新 root。避免缓存孤儿导致不显示。⚠️
// ==========================================================================
let cachedSidebarDispose: (() => void) | null = null;
const [cachedSidebarEl, setCachedSidebarEl] = createSignal<JSX.Element | null>(null);
const [forceRebuild, setForceRebuild] = createSignal(0);
let lastForceSidebarRebuild = 0;

const disposeCachedSidebar = () => {
  if (cachedSidebarDispose) {
    cachedSidebarDispose();
    cachedSidebarDispose = null;
    setCachedSidebarEl(null);
  }
};

const tui: TuiPlugin = async (api, _options) => {
  const mascots = loadAllMascots()

  api.slots.register({
    order: 160,
    slots: {
      sidebar_content() {
        const staleNow = isSlotStale();
        log("DEBUG", `[sidebar_content] called staleNow=${staleNow} hasCache=${!!cachedSidebarEl()} visible=${mascotVisible()}`);
        markSlotActive();
        if (staleNow && cachedSidebarEl()) {
          log("INFO", "sidebar_content: slot stale, dispose only (return null this frame)");
          disposeCachedSidebar();
          return null;
        }
        forceRebuild();
        const fbr = forceSidebarRebuild();
        if (lastForceSidebarRebuild !== fbr) {
          lastForceSidebarRebuild = fbr;
          disposeCachedSidebar();
          return null;
        }
        if (mascotVisible() && !cachedSidebarEl()) {
          setCachedSidebarEl(createRoot((dispose) => {
            cachedSidebarDispose = dispose;
            return <SidebarMascot mascots={mascots} api={api} />;
          }));
        }
        return cachedSidebarEl() ?? null;
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
          log("INFO", "mascot.toggle onSelect ENTERED, current visible=" + mascotVisible());
          const next = !mascotVisible();
          if (!next) {
            // toggle off：dispose cache，sidebar_content 下次返回 null → 真正 unmount
            // 避免 Show fallback 空 box + measure function 冲突（reconciler 崩溃）
            setMascotVisible(false);
            setPhaseMachineOn(false);
            stopPhaseMachine();
            hideHomeMascotPosition();
            disposeCachedSidebar();
            log("INFO", "mascot.toggle OFF: cache disposed, sidebar_content returns null next");
          } else {
            // toggle on：forceRebuild 自增触发 sidebar_content 重渲染
            // busy 时用 fallToWorkY 掉落到工作位置(5,30)而非 idle 默认(20,2)
            // 延迟 triggerEasterIfBusy 等新 mount 完成再触发彩蛋
            setMascotVisible(true);
            setPhaseMachineOn(true);
            disposeCachedSidebar();
            setForceRebuild(forceRebuild() + 1);
            resetLastBusySessionId();
            resumeBusyState();
            restoreMascotPosition();
            setTimeout(() => triggerEasterIfBusy(), 1500);
            log("INFO", "mascot.toggle ON: forceRebuild++, fallToWorkY, easter trigger scheduled");
          }
          api.ui.toast({ message: `Mascot ${next ? "ON" : "OFF"}` });
        }
      },
      {
        title: "Mascot: Toggle easter eggs",
        value: "mascot.easter",
        description: "Turn Phase Machine on/off",
        onSelect: () => {
          const next = !phaseMachineOn();
          setPhaseMachineOn(next);
          if (!next) stopPhaseMachine();
          else { resetLastBusySessionId(); triggerEasterIfBusy(); }
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
