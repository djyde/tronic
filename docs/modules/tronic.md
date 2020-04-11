# tronic

Tronic provides some useful API out of the box.

## logger

```js
const {
  logger
} = require('tronic')

logger('hello world')
```

## defaultTrayIcon

type: `nativeImage`

```js
const { Tray } = require('electron')
const {
  defaultTrayIcon
} = require('tronic')

const tray = new Tray(defaultTrayIcon)
```
