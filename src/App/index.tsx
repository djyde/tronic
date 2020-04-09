import * as React from 'react'
import { ipcRenderer, remote } from 'electron'
import { Event, Call } from '../constants'
import { SerializedPlugin } from '../ipc'

function App() {

  const [plugins, setPlugins] = React.useState([] as SerializedPlugin[])

  const [currentPlugin, setCurrentPlugin] = React.useState(null as null | SerializedPlugin)

  React.useEffect(() => {
    ipcRenderer.send(`${Event.Begin}`)

    ipcRenderer.on(`${Call.PassPluginsList}`, (event, plugins: SerializedPlugin[]) => {
      setPlugins(plugins)
    })
  }, [])

  function reload(): void {
    ipcRenderer.send(Call.ReloadAllPlugin)
  }

  function openPluginFolder() {
    ipcRenderer.send(Call.OpenPluginFolder)
  }

  function selectPlugin(plugin: SerializedPlugin) {
    setCurrentPlugin(plugin)
  }

  return (
    <div className='flex h-full select-none'>
      <div className='w-64 bg-gray-100 h-full'>

        <div className='p-4'>
          <div>
            <a onClick={openPluginFolder} className='hover:bg-gray-100 text-center cursor-pointer block bg-white text-gray-600 text-sm px-4 py-2 rounded shadow w-full'>Open plugins folder</a>
          </div>
        </div>
        <div>
          {plugins.map(plugin => {
            return (
              <PluginMenuItem plugin={plugin} onClick={() => selectPlugin(plugin)} key={plugin.metadata.config.id} />
            )
          })}
        </div>
      </div>
      <div>
        {currentPlugin && <PluginDetail key={currentPlugin.metadata.config.id} plugin={currentPlugin} />}
      </div>

    </div>
  )
}

function useUpdatePluginData(originPlugin: SerializedPlugin) {
  const [plugin, setPlugin] = React.useState(originPlugin)

  React.useEffect(() => {
    function handler(event: any, pluginId: string, data: SerializedPlugin) {
      if (pluginId === plugin.metadata.config.id) {
        setPlugin(data)
      }
    }

    ipcRenderer.on(Event.PluginUpdated, handler)

    return () => {
      ipcRenderer.removeListener(Event.PluginUpdated, handler)
    }
  }, [])

  return {
    plugin
  }
}

function PluginMenuItem({
  onClick,
  plugin: originPlugin,
  selected
}: {
  selected?: boolean,
  onClick: () => void,
  plugin: SerializedPlugin
}) {

  const { plugin } = useUpdatePluginData(originPlugin)

  return (
    <div onClick={onClick} className='px-4 py-4 hover:bg-gray-200'>
      <h1 className='font-bold'>
        {plugin.metadata.config.name}
      </h1>
      <p className='text-gray-500 text-sm'>{plugin.metadata.config.id}</p>
    </div>
  )
}

function PluginDetail({
  plugin: originPlugin
}: {
  plugin: SerializedPlugin
}) {

  const { plugin } = useUpdatePluginData(originPlugin)

  function reload() {
    ipcRenderer.send(`${Call.ReloadPlugin}`, plugin.metadata.config.id)
  }

  return (
    <div>
      <h1>{plugin.metadata.config.name}</h1>
      <button onClick={reload}>Reload Plugin</button>
    </div>
  )
}

export default <App />
