const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron')
const path = require('node:path')

let mainWindow
let presenterWindow
let shortcutsEnabled = false
const registeredAccelerators = new Map()
const actionNames = ['advance', 'back', 'faster', 'slower', 'play', 'reset']
const acceleratorNames = { ArrowDown: 'Down', ArrowUp: 'Up', PageDown: 'PageDown', PageUp: 'PageUp', Home: 'Home', End: 'End', Space: 'Space', Enter: 'Enter', BracketRight: ']', BracketLeft: '[', Equal: '=', Minus: '-' }

function toAccelerator(code) {
  if (acceleratorNames[code]) return acceleratorNames[code]
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  return code
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 680,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  const url = process.argv.includes('--dev') ? 'http://localhost:5173' : `file://${path.join(__dirname, 'dist/index.html')}`
  mainWindow.loadURL(url)
  mainWindow.on('closed', () => { mainWindow = null })
}

function broadcast(action) {
  for (const window of [mainWindow, presenterWindow]) {
    if (window && !window.isDestroyed()) window.webContents.send('remote-action', action)
  }
}

function registerShortcuts(bindings) {
  for (const accelerator of registeredAccelerators.keys()) globalShortcut.unregister(accelerator)
  registeredAccelerators.clear()
  if (!shortcutsEnabled) return
  for (const action of actionNames) {
    const accelerator = toAccelerator(bindings[action])
    if (!accelerator) continue
    try {
      const registered = globalShortcut.register(accelerator, () => broadcast(action))
      if (registered) registeredAccelerators.set(accelerator, action)
    } catch (error) {
      console.warn(`No se pudo registrar la tecla ${bindings[action]} para ${action}`, error.message)
    }
  }
}

app.whenReady().then(() => {
  createWindow()
  ipcMain.on('set-global-shortcuts', (_event, payload) => {
    shortcutsEnabled = Boolean(payload.enabled)
    registerShortcuts(payload.bindings || {})
  })
  ipcMain.on('open-presenter', () => {
    if (presenterWindow && !presenterWindow.isDestroyed()) return presenterWindow.focus()
    presenterWindow = new BrowserWindow({ width: 1200, height: 800, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } })
    const url = process.argv.includes('--dev') ? 'http://localhost:5173/?presenter=1' : `file://${path.join(__dirname, 'dist/index.html')}?presenter=1`
    presenterWindow.loadURL(url)
    presenterWindow.on('closed', () => { presenterWindow = null })
  })
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
