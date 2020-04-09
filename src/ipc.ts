import { ipcMain, Tray, webContents, WebContents } from "electron";
import { NodeVM } from "vm2";
import path = require("path");
import { Event, Call } from "./constants";

const DEFAULT_MENU_ICON = path.resolve(__dirname, "../../assets/menu.png");

export type PluginConfig = {
  id: string;
  name: string;
  version: string;
};

class Plugin {
  private vm: NodeVM;
  private trays: Tray[];

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
        },
      },
    });
  }

  run(): void {
    try {
      this.vm.run(this.script);
    } catch (e) {
      // TODO: catch error
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

const PLUGINS = [
  {
    meta: {
      id: "com.lutaonan.demo",
      name: "Demo",
      version: "1.0.0",
    },
    script: `
    console.log('?')

    const Tray = require('Tray')
    
    const tray = Tray.init()
    
    tray.on('click', (event, bounds, position) => {
      console.log('click')
    })
    `.trimLeft(),
  },
];

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
    this.plugins.forEach((plugin) => {
      plugin.pluginInstance.destructor()
    })
  }
}

export function init(wc: WebContents): void {
  const core = new Core(wc);

  ipcMain.on(`${Event.Begin}`, (event) => {
    if (core.status === Status.READY) {
      PLUGINS.forEach((plugin) => {
        core.use(new Plugin(plugin.script, plugin.meta));
      });
      core.runAll();
    }
    event.reply(`${Call.PassPluginsList}`, core.plugins.map(plugin => {
      return {
        ...plugin.pluginInstance.config
      }
    }))
  });
}
