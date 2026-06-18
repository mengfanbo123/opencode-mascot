/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createRoot, type JSX } from "solid-js"
import { loadAllMascots } from "./src/core/mascot-loader"
import { SidebarMascot, stopPhaseMachine } from "./src/components/sidebar-mascot"
import { HomeMascot } from "./src/components/home-mascot"
import { checkAndUpdate } from "./src/core/updater"
import { emitCelebrate, emitVersion, emitScatter } from "./src/core/celebration-bus"
import { mascotVisible, setMascotVisible, phaseMachineOn, setPhaseMachineOn } from "./src/core/mascot-state"

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pluginVersion = "unknown";
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8"));
  if (pkg?.version && typeof pkg.version === "string") {
    pluginVersion = pkg.version;
  }
} catch {}

function MascotStatusView(props: { api: any }) {
  const theme = () => props.api.theme.current;
  return (
    <box gap={0}>
      <text fg={theme()?.text} wrapMode="none">Mascot</text>
      <box flexDirection="row" gap={1}>
        <text
          flexShrink={0}
          style={{ fg: mascotVisible() ? theme()?.success : theme()?.textMuted }}
        >
          •
        </text>
        <text fg={theme()?.textMuted} wrapMode="none">
          {"Mascot: " + (mascotVisible() ? "ON" : "OFF")}
        </text>
      </box>
      <box flexDirection="row" gap={1}>
        <text
          flexShrink={0}
          style={{ fg: phaseMachineOn() ? theme()?.success : theme()?.textMuted }}
        >
          •
        </text>
        <text fg={theme()?.textMuted} wrapMode="none">
          {"Easter: " + (phaseMachineOn() ? "ON" : "OFF")}
        </text>
      </box>
    </box>
  );
}

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
        return (
          <box flexDirection="column">
            {cachedSidebarElement}
            <MascotStatusView api={api} />
          </box>
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
          api.ui.toast({ message: `Easter: ${next ? "ON" : "OFF"}` });
        }
      }
    ])
  }

  api.lifecycle.onDispose(() => {
    if (cachedSidebarDispose) {
      cachedSidebarDispose();
      cachedSidebarDispose = null;
      cachedSidebarElement = null;
    }
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
