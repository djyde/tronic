import * as React from 'react'
import { ipcRenderer } from 'electron'
import { Event, Call } from '../constants'
import { PluginConfig } from '../ipc'

function App () {

  const [ plugins, setPlugins ] = React.useState([] as PluginConfig[])

  React.useEffect(() => {
    ipcRenderer.send(`${Event.Begin}`)

    ipcRenderer.on(`${Call.PassPluginsList}`, (event, plugins: PluginConfig[]) => {
      setPlugins(plugins)
    })
  }, [])

  function reload(): void {
    ipcRenderer.send(Call.ReloadAllPlugin)
  }

  return (
    <div>
      <div>
        <button onClick={reload}>Reload</button>
      </div>
      {plugins.map(plugin => {
        return (
          <div key={plugin.id}>
            {plugin.name}
          </div>
        )
      })}
    </div>
  )
}

export default <App/>
