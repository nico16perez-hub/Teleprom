const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('teleprompterDesktop', {
  setGlobalShortcuts: (enabled, bindings) => ipcRenderer.send('set-global-shortcuts', { enabled, bindings }),
  openPresenter: () => ipcRenderer.send('open-presenter'),
  onRemoteAction: (callback) => {
    const listener = (_event, action) => callback(action)
    ipcRenderer.on('remote-action', listener)
    return () => ipcRenderer.removeListener('remote-action', listener)
  },
})
