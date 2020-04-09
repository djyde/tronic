export enum Event {
  Begin = 'Begin',
  PluginUsed = 'PluginUsed',
  PluginBeginLoad = 'PluginBeginLoad',
  PluginLoadFailed = 'PluginLoadFailed',
  PluginLoadSuccess = 'PluginLoadSuccess',
}

export enum Call {
  PassPluginsList = 'PassPluginsList',
  ReloadAllPlugin = 'ReloadAllPlugin'
}