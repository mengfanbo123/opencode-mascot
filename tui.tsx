/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { loadAllMascots, getRandomMascot } from "./src/core/mascot-loader"
import { SidebarMascot } from "./src/components/sidebar-mascot"
import { createAnimatedRenderer } from "./src/core/ascii-renderer"

const tui: TuiPlugin = async (api, _options) => {
  const mascots = loadAllMascots()
  const homeMascot = getRandomMascot()
  const homeRenderer = createAnimatedRenderer(homeMascot)

  api.slots.register({
    slots: {
      sidebar_content() {
        return <SidebarMascot mascots={mascots} api={api} />
      },
      home_bottom() {
        return (
          <box flexDirection="column" alignItems="center">
            {homeRenderer.element()}
          </box>
        )
      }
    }
  })
}

const plugin: TuiPluginModule = {
  id: "@mingxy/opencode-mascot",
  tui
}

export default plugin
