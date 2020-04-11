import * as React from "react";
import { Event, Call, SerializedPlugin, PluginStatus } from "../../app/src/shared";
import classnames from 'classnames'
const { ipcRenderer } = window.nodeRequire('electron')
const { ipcRenderer: ipc } = window.nodeRequire('electron-better-ipc')

function App() {
  const [plugins, setPlugins] = React.useState([] as SerializedPlugin[]);

  const [currentPlugin, setCurrentPlugin] = React.useState(
    null as null | SerializedPlugin
  );

  React.useEffect(() => {
    ;(async () => {
      const list: SerializedPlugin[] = await ipc.callMain(Call.FetchPluginList)
      setPlugins(list)
    })()
  }, []);

  function openPluginFolder() {
    ipc.callMain(Call.OpenPluginFolder)
  }

  function selectPlugin(plugin: SerializedPlugin) {
    setCurrentPlugin(plugin);
  }

  return (
    <div className="flex h-full select-none">
      <div className="w-64 bg-gray-100 h-full">
        <div className="p-4">
          <div>
            <a
              onClick={openPluginFolder}
              className="hover:bg-gray-100 text-center cursor-pointer block bg-white text-gray-600 text-sm px-4 py-2 rounded shadow w-full"
            >
              Open plugins folder
            </a>
          </div>
        </div>
        <div>
          {plugins.map((plugin) => {
            return (
              <PluginMenuItem
                selected={currentPlugin?.metadata.config.id === plugin.metadata.config.id}
                plugin={plugin}
                onClick={() => selectPlugin(plugin)}
                key={plugin.metadata.config.id}
              />
            );
          })}
        </div>
      </div>
      <div className='flex-1'>
        {currentPlugin && (
          <PluginDetail
            key={currentPlugin.metadata.config.id}
            plugin={currentPlugin}
          />
        )}
      </div>
    </div>
  );
}

function useUpdatePluginData(originPlugin: SerializedPlugin) {
  const [plugin, setPlugin] = React.useState(originPlugin);

  React.useEffect(() => {
    function handler(event: any, pluginId: string, data: SerializedPlugin) {
      if (pluginId === plugin.metadata.config.id) {
        setPlugin(data);
      }
    }

    ipcRenderer.on(Event.PluginUpdated, handler);

    return () => {
      ipcRenderer.removeListener(Event.PluginUpdated, handler);
    };
  }, []);

  return {
    plugin,
  };
}

function PluginMenuItem({
  onClick,
  plugin: originPlugin,
  selected,
}: {
  selected?: boolean;
  onClick: () => void;
  plugin: SerializedPlugin;
}) {
  const { plugin } = useUpdatePluginData(originPlugin);

  function togglePluginStatus(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.checked) {
      // load
      ipc.callMain(Call.LoadPlugin, plugin.metadata.config.id)
    } else {
      // deload
      ipc.callMain(Call.DeloadPlugin, plugin.metadata.config.id)
    }
  }

  return (
    <div onClick={onClick} className={classnames('px-4 py-4 hover:bg-gray-200 flex jsutify-center', {
      'bg-gray-200': selected
    })}>
      <div className='flex-1'>
        <h1 className="font-bold">{plugin.metadata.config.name}</h1>
        <p className="text-gray-500 text-sm">{plugin.metadata.config.id}</p>
      </div>
      <div className='self-center w-12'>
        <SwitchButton
          onChange={togglePluginStatus}
          checked={plugin.status === PluginStatus.RUNNING}
        />
      </div>
    </div>
  );
}

function PluginDetail({ plugin: originPlugin }: { plugin: SerializedPlugin }) {
  const { plugin } = useUpdatePluginData(originPlugin);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">{plugin.metadata.config.name}</h1>
      <div className="text-sm text-gray-500">
        <p>{plugin.metadata.config.id}</p>
        <p>version: {plugin.metadata.config.version}</p>
      </div>
      <div className='mt-4'>
        <LogViewer pluginId={plugin.metadata.config.id} />
      </div>
    </div>
  );
}

function SwitchButton({
  checked,
  onChange,
}: {
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  checked: boolean;
}) {
  return (
    <label className="switch-btn">
      <input onChange={onChange} type="checkbox" checked={checked} />
      <span className="slider"></span>
    </label>
  );
}

function LogViewer ({ pluginId }: {
  pluginId: string
}) {
  
  const [log, setLog] = React.useState('')
  const divRef = React.useRef(null as null | HTMLDivElement)

  React.useEffect(() => {
    function handler(event: any, id: string, logs: string) {
      if (id === pluginId) {
        setLog(logs)
      }
    }
    ipcRenderer.send(Call.FetchLog, pluginId)

    ipcRenderer.on(Call.FetchLog, handler)

    return () => {
      ipcRenderer.removeListener(Call.FetchLog, handler)
    }
  }, [])

  React.useLayoutEffect(() => {
    if (divRef.current) {
      divRef.current.scrollTop = divRef.current.scrollHeight
    }
  }, [log])

  return (
    <div>
      <div ref={divRef} className='w-full border border-gray-200 h-64 whitespace-pre overflow-scroll text-sm select-text p-2'>
        {log}
      </div>
    </div>
  )
}

export default <App />;
