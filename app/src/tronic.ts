import {
  ipcMain,
  Tray,
  WebContents,
  Notification,
  Menu,
  MenuItem,
  screen,
  dialog,
  shell,
  systemPreferences,
  clipboard,
  nativeImage,
  powerSaveBlocker,
  BrowserWindow,
} from "electron";
import { NodeVM } from "vm2";
import path = require("path");
import {
  Event,
  Call,
  PluginStatus,
  PluginConfig,
  SerializedPlugin,
} from "./shared";
import * as os from "os";
import * as fs from "fs";
import { ipcMain as ipc } from 'electron-better-ipc'

const DEFAULT_MENU_ICON = path.resolve(__dirname, "../../assets/menu.png");
const PLUGINS_PATH = path.resolve(os.homedir(), ".TRONIC");
const LOG_LIMIT = 500;

const callAllWindows = (cb: (w: BrowserWindow) => void) => {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((w) => {
    cb(w)
  })
}

class Plugin {
  private vm: NodeVM;

  status = PluginStatus.STOPPED;

  destructor: () => void = () => { }

  metadata: {
    script: string;
    config: PluginConfig;
  };

  logs: string[] = [];

  static getPluginMetaData(pluginPath: string) {
    return {
      script: fs.readFileSync(path.resolve(pluginPath, "index.js"), {
        encoding: "utf-8",
      }),
      config: JSON.parse(
        fs.readFileSync(path.resolve(pluginPath, "config.json"), {
          encoding: "utf-8",
        })
      ) as PluginConfig,
    };
  }

  constructor(private pluginPath: string) {
    this.metadata = Plugin.getPluginMetaData(pluginPath);
    this.vm = new NodeVM({
      console: "inherit",
      require: {
        builtin: ['path'],
        mock: {
          Tray,
          Notification,
          Menu,
          MenuItem,
          screen,
          dialog,
          systemPreferences,
          clipboard,
          nativeImage,
          powerSaveBlocker,
          shell,
          tronic: {
            logger: this.pushLog.bind(this),
            defaultTrayIcon: nativeImage.createFromPath(path.resolve(__dirname, '../assets/defaultTrayIcon.png'))
          }
        },
      },
    });
  }

  pushLog(...args: any[]) {
    if (this.logs.length > LOG_LIMIT) {
      this.logs.shift();
    }
    const log = args
      .map((content) => JSON.stringify(content, null, 2))
      .join(" ");
    this.logs.push(log);

    this.sendLogs();
  }

  sendLogs() {
    callAllWindows((w) => {
      w.webContents.send(Call.FetchLog, this.metadata.config.id, this.logs.join("\n"));
    })
  }

  sendUpdate() {
    callAllWindows((w) => {
      w.webContents.send(
        Event.PluginUpdated,
        this.metadata.config.id,
        this.serialize()
      )
    })
  }

  load() {
    if (this.status !== PluginStatus.RUNNING) {
      const metaData = Plugin.getPluginMetaData(this.pluginPath);
      try {
        const exported = this.vm.run(metaData.script);
        if (exported.destroy) {
          this.destructor = exported.destroy
        }
        this.status = PluginStatus.RUNNING;
      } catch (e) {
        // TODO: catch error
        this.pushLog(e.message)
      }
      this.sendUpdate();
    }
  }

  deload() {
    this.destructor();
    this.status = PluginStatus.STOPPED;
    this.sendUpdate();
  }

  serialize() {
    return {
      status: this.status,
      metadata: Plugin.getPluginMetaData(this.pluginPath),
    } as SerializedPlugin;
  }
}

class Core {
  loaded = false;

  plugins: Plugin[] = [];

  constructor() { }

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
        return path.resolve(PLUGINS_PATH, dir.name);
      });
  }

  collect() {
    this.plugins.forEach((plugin) => {
      plugin.destructor();
    });

    this.plugins = this.collectPluginsPath().map((p) => new Plugin(p));
  }

  loadAll() {
    this.collect();
    this.plugins.forEach((plugin) => plugin.load());
    this.loaded = true;
  }
}

export function init(): void {
  const core = new Core();

  core.collect();

  ipc.answerRenderer(Call.OpenPluginFolder, () => {
    shell.openItem(PLUGINS_PATH);

  })

  ipc.answerRenderer(Call.LoadPlugin, (pluginId: string) => {
    const plugin = core.plugins.find(
      (plugin) => plugin.metadata.config.id === pluginId
    );
    if (plugin) {
      plugin.load();
    }
  })

  ipc.answerRenderer(Call.DeloadPlugin, (pluginId: string) => {
    const plugin = core.plugins.find(
      (plugin) => plugin.metadata.config.id === pluginId
    );
    if (plugin) {
      plugin.deload();
    }
  })

  ipc.answerRenderer(Call.FetchPluginList, async () => {
    const list = core.plugins.map((plugin) => plugin.serialize())
    return list
  })

  ipcMain.on(Call.FetchLog, (event, pluginId: string) => {
    const plugin = core.plugins.find(
      (plugin) => plugin.metadata.config.id === pluginId
    );
    if (plugin) {
      plugin.sendLogs();
    }
  });
}
