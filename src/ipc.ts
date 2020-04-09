import { ipcMain, Tray, WebContents, Notification } from "electron";
import { NodeVM } from "vm2";
import path = require("path");
import { Event, Call } from "./constants";
import * as os from "os";
import * as fs from "fs";

const DEFAULT_MENU_ICON = path.resolve(__dirname, "../../assets/menu.png");
const PLUGINS_PATH = path.resolve(os.homedir(), ".ISLAND");

export type PluginConfig = {
  id: string;
  name: string;
  version: string;
};

class Plugin {
  private vm: NodeVM;
  private trays: Tray[] = [];

  constructor(private script: string, public config: PluginConfig) {
    this.vm = new NodeVM({
      console: "inherit",
      require: {
        mock: {
          Tray: {
            init: (image?: string): Tray => {
              const t = new Tray(image || DEFAULT_MENU_ICON);
              this.trays.push(t);
              return t;
            },
          },
          Notification
        },
      },
    });
  }

  run(): void {
    try {
      this.vm.run(this.script);
    } catch (e) {
      // TODO: catch error
      console.log(e)
    }
  }

  destructor(): void {
    if (this.trays.length) {
      this.trays.forEach((tray) => {
        tray.destroy();
      });
    }
  }
}

enum Status {
  READY,
  RUNNING,
}

class Core {
  plugins = [] as {
    pluginInstance: Plugin;
  }[];

  status: Status;

  constructor(private wc: WebContents) {
    this.status = Status.READY;
  }

  loadPlugins(): void {
    if (!fs.existsSync(PLUGINS_PATH)) {
      fs.mkdirSync(PLUGINS_PATH);
    }

    const plugins = fs
      .readdirSync(PLUGINS_PATH, { withFileTypes: true })
      .filter((f) => f.isDirectory())
      .filter((dir) => {
        return fs.existsSync(
          path.resolve(PLUGINS_PATH, dir.name, "config.json")
        );
      })
      .map((dir) => {
        return {
          script: fs.readFileSync(
            path.resolve(PLUGINS_PATH, dir.name, "index.js"),
            { encoding: "utf-8" }
          ),
          metadata: JSON.parse(
            fs.readFileSync(
              path.resolve(PLUGINS_PATH, dir.name, "config.json"),
              { encoding: "utf-8" }
            )
          ) as PluginConfig,
        };
      });

    plugins.forEach((plugin) => {
      this.use(new Plugin(plugin.script, plugin.metadata));
    });


  }

  use(plugin: Plugin): void {
    this.plugins.push({
      pluginInstance: plugin,
    });
    this.wc.send(`${Event.PluginUsed}`, plugin.config);
  }

  runAll(): void {
    this.plugins.forEach((plugin) => {
      this.wc.send(
        `${Event.PluginBeginLoad}_${plugin.pluginInstance.config.id}`
      );
      try {
        plugin.pluginInstance.run();
        this.wc.send(
          `${Event.PluginLoadSuccess}_${plugin.pluginInstance.config.id}`
        );
      } catch (e) {
        this.wc.send(
          `${Event.PluginLoadFailed}_${plugin.pluginInstance.config.id}`,
          JSON.stringify(e)
        );
      }
    });
    this.status = Status.RUNNING;
  }

  reload(): void {
    // teardown all plugin
    this.plugins.forEach((plugin) => {
      plugin.pluginInstance.destructor();
    });

    this.plugins = []
    this.loadPlugins()
    this.runAll()
  }
}

export function init(wc: WebContents): void {
  const core = new Core(wc);

  ipcMain.on(Call.ReloadAllPlugin, (event) => {
    core.reload()

    event.reply(
      `${Call.PassPluginsList}`,
      core.plugins.map((plugin) => {
        return {
          ...plugin.pluginInstance.config,
        };
      })
    );
  })

  ipcMain.on(`${Event.Begin}`, (event) => {
    if (core.status === Status.READY) {
      core.reload()
    }
    event.reply(
      `${Call.PassPluginsList}`,
      core.plugins.map((plugin) => {
        return {
          ...plugin.pluginInstance.config,
        };
      })
    );
  });
}
