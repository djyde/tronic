# Write a plugin

A Tronic plugin is just a folder which contains two required files:

- `index.js` main script
- `config.json` Define plugin metadata

**Example**

```js
// index.js

const { Notification } = require('electron')
const notification = new Notification({ title: 'ping' })

notification.show()
```

```json
// config.js
{
  "name": "demo",
  "version": "1.0.0",
  "id": "com.djyde.demo"
}
```

#### Metadata

- `name` **required** Plugin name
- `version` **required** Plugin version e.g. "1.0.0"
- `id` **required** Plugin id. Should be unique. e.g. "com.djyde.demo"

#### Lifecycle

Since users can enable and disable a plugin, sometimes you need to do some teardown works.

For example, if you create a interval, you should remove it in the `destroy` function, which will be executed by the time your plugin is being disabled:

```js
// index.js

const interval = setInterval(() => {
  // do something
}, 100000)

exports.destroy = () => {
  clearInterval(interval)
}
```