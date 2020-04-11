# electron

Tronic exposes a subset of Electron API. You could `require` them:

```js
const { shell } = require('electron')

shell.openExternal('https://github.com')
```

## Supported APIs

- [dialog](https://www.electronjs.org/docs/api/dialog)
- [powerSaveBlocker](https://www.electronjs.org/docs/api/power-save-blocker)
- [globalShortcut](https://www.electronjs.org/docs/api/global-shortcut)
- [Menu](https://www.electronjs.org/docs/api/menu)
- [MenuItem](https://www.electronjs.org/docs/api/menu-item)
- [Notification](https://www.electronjs.org/docs/api/notification)
- [screen](https://www.electronjs.org/docs/api/screen)
- [systemPreferences](https://www.electronjs.org/docs/api/system-preferences)
- [Tray](https://www.electronjs.org/docs/api/tray)
- [clipboard](https://www.electronjs.org/docs/api/clipboard)
- [nativeImage](https://www.electronjs.org/docs/api/native-image)
- [shell](https://www.electronjs.org/docs/api/shell)
