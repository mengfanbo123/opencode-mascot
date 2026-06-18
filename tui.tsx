/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { loadAllMascots } from "./src/core/mascot-loader"
import { SidebarMascot } from "./src/components/sidebar-mascot"
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
  );
}

const tui: TuiPlugin = async (api, _options) => {
  const mascots = loadAllMascots()

  api.slots.register({
    slots: {
      sidebar_content() {
        return (
          <box flexDirection="column">
            <SidebarMascot mascots={mascots} api={api} />
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
          if (!next) setPhaseMachineOn(false);
          api.ui.toast({ message: `Mascot ${next ? "ON" : "OFF"}` });
        }
      },
      {
        title: "Mascot: Toggle power (Phase Machine)",
        value: "mascot.power",
        description: "Turn Phase Machine on/off (requires mascot visible)",
        enabled: mascotVisible(),
        onSelect: () => {
          if (!mascotVisible()) {
            api.ui.toast({ message: "Enable mascot first" });
            return;
          }
          const next = !phaseMachineOn();
          setPhaseMachineOn(next);
          api.ui.toast({ message: `Power ${next ? "ON" : "OFF"}` });
        }
      }
    ])
  }

  api.lifecycle.onDispose(() => {});

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
