import { ipcMain, Tray } from 'electron'
import { NodeVM } from 'vm2'
const path = require('path')

const tray = {
  addItem(item: { title: string }) {
    const t = new Tray(path.resolve(__dirname, '../../assets/menu.png'))
    t.setTitle(item.title)
  }
}

const vm = new NodeVM({
  console: 'inherit',
  require: {
    mock: {
      tray
    }
  }
})

export function init() {
  ipcMain.on('run-script', (_, script) => {
    try {
      vm.run(script)
    } catch (e) {
      console.log('run script error', e)
    }
  })
}