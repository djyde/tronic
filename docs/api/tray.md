# Tray

```js
// index.js

const Tray = require('Tray')
const tray = Tray.init()

tray.on('click', () => {
  console.log('click on menu bar item')
})
```

More on [Electron Tray](https://www.electronjs.org/docs/api/tray)