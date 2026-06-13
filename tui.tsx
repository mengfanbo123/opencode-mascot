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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pluginVersion = "unknown";
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8"));
  if (pkg?.version && typeof pkg.version === "string") {
    pluginVersion = pkg.version;
  }
} catch {}

const tui: TuiPlugin = async (api, _options) => {
  const mascots = loadAllMascots()

  api.slots.register({
    slots: {
      sidebar_content() {
        return <SidebarMascot mascots={mascots} api={api} />
      },
      home_bottom() {
        return <HomeMascot mascots={mascots} api={api} />
      }
    }
  })

  checkAndUpdate(pluginVersion, (newVersion) => {
    emitCelebrate(newVersion);
  }).catch(() => {});

  setTimeout(() => emitScatter(), 100);
  setTimeout(() => emitVersion(pluginVersion), 2000);
}

const plugin: TuiPluginModule = {
  id: "@mingxy/opencode-mascot",
  tui
}

export default plugin
