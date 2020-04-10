# menu

```js
const tray = Tray.init()

const menu = Menu.buildFromTemplate([
  {
    label: 'Dark Mode'
  }
])

tray.setContextMenu(menu)
```

More on [Electron Menu](https://www.electronjs.org/docs/api/menu)

