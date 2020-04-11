export enum Event {
  Begin = 'Begin',
  PluginUsed = 'PluginUsed',
  PluginBeginLoad = 'PluginBeginLoad',
  PluginLoadFailed = 'PluginLoadFailed',
  PluginLoadSuccess = 'PluginLoadSuccess',

  PluginUpdated = 'PluginUpdated'
}

export enum Call {
  PassPluginsList = 'PassPluginsList',
  ReloadAllPlugin = 'ReloadAllPlugin',
  OpenPluginFolder = 'OpenPluginFolder',

  ReloadPlugin = 'ReloadPlugin',
  FetchPluginData = 'FetchPluginData',
  GetPluginData = 'GetPluginData',
  LoadPlugin = 'LoadPlugin',
  DeloadPlugin = 'DeloadPlugin',

  FetchLog = 'FetchLog'
}

export enum PluginStatus {
  READY,
  RUNNING,
  STOPPED,
  ERROR
}

export type SerializedPlugin = {
  status: PluginStatus,
  metadata: {
    script: string,
    config: PluginConfig
  }
}


export type PluginConfig = {
  id: string;
  name: string;
  version: string;
};
