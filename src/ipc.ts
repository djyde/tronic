import { ipcMain, Tray, WebContents, Notification } from "electron";
import { NodeVM } from "vm2";
import path = require("path");
import { Event, Call } from "./constants";
import * as os from "os";
import * as fs from "fs";
import open from 'open'

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

  status = Status.STOPPED

  metadata: {
    script: string,
    config: PluginConfig
  }

  static getPluginMetaData(pluginPath: string) {
    return {
      script: fs.readFileSync(path.resolve(pluginPath, 'index.js'), { encoding: 'utf-8' }),
      config: JSON.parse(fs.readFileSync(path.resolve(pluginPath, 'config.json'), { encoding: 'utf-8' })) as PluginConfig
    }
  }

  constructor(private pluginPath: string, private wc: WebContents) {
    this.metadata = Plugin.getPluginMetaData(pluginPath)
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

  sendUpdate () {
    this.wc.send(Event.PluginUpdated, this.metadata.config.id, this.serialize())
  }

  load() {
    const metaData = Plugin.getPluginMetaData(this.pluginPath)
    try {
      this.vm.run(metaData.script);
      this.status = Status.RUNNING
    } catch (e) {
      // TODO: catch error
      console.log(e)
    }
    this.sendUpdate()
  }

  reload() {
    this.deload()
    this.load()
  }

  destructor(): void {
    if (this.trays.length) {
      this.trays.forEach((tray) => {
        tray.destroy();
      });
    }
  }

  deload() {
    this.destructor()
    this.status = Status.STOPPED
    this.sendUpdate()
  }

  serialize() {
    return {
      status: this.status,
      metadata: Plugin.getPluginMetaData(this.pluginPath)
    } as SerializedPlugin
  }
}

export type SerializedPlugin = {
  status: Status,
  metadata: {
    script: string,
    config: PluginConfig
  }
}

enum Status {
  READY,
  RUNNING,
  STOPPED,
  ERROR
}

class Core {

  loaded = false

  plugins: Plugin[] = []

  constructor(private wc: WebContents) {
  }

  collectPluginsPath() {
    if (!fs.existsSync(PLUGINS_PATH)) {
      fs.mkdirSync(PLUGINS_PATH);
    }

    return fs
      .readdirSync(PLUGINS_PATH, { withFileTypes: true })
      .filter((f) => f.isDirectory())
      .filter((dir) => {
        return fs.existsSync(
          path.resolve(PLUGINS_PATH, dir.name, "config.json")
        );
      })
      .map((dir) => {
        return path.resolve(PLUGINS_PATH, dir.name)
      });
  }

  collect() {
    this.plugins.forEach(plugin => {
      plugin.destructor()
    })

    this.plugins = this.collectPluginsPath().map(p => new Plugin(p, this.wc))
  }

  loadAll() {
    this.collect()
    this.plugins.forEach(plugin => plugin.load())
    this.loaded = true
  }
}

export function init(wc: WebContents): void {
  const core = new Core(wc);

  core.collect()

  ipcMain.on(Call.ReloadAllPlugin, (event) => {
    core.loadAll()

    event.reply(
      `${Call.PassPluginsList}`,
      core.plugins.map(plugin => plugin.serialize())
    );
  })

  ipcMain.on(Call.OpenPluginFolder, () => {
    open(PLUGINS_PATH)
  })

  ipcMain.on(Call.ReloadPlugin, (event, pluginId: string) => {
    const plugin = core.plugins.find(plugin => plugin.metadata.config.id === pluginId)
    if (plugin) {
      plugin.reload()
    }
  })

  ipcMain.on(Call.FetchPluginData, (event, pluginId: string) => {
    const plugin = core.plugins.find(plugin => plugin.metadata.config.id === pluginId)
    if (plugin) {
      event.reply(`${Call.GetPluginData}_${pluginId}`, plugin.serialize())
    }
  })

  ipcMain.on(`${Event.Begin}`, (event) => {
    if (!core.loaded) {
      core.loadAll()
    }
    event.reply(
      `${Call.PassPluginsList}`,
      core.plugins.map(plugin => plugin.serialize())
    );
  });
}
