import { app, BrowserWindow } from 'electron';
import * as tronic from './tronic'
const DEV = process.env.DEV === 'true'
import * as path from 'path'

require('update-electron-app')({
  repo: 'djyde/tronic',
})

tronic.init()

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

let mainWindow: BrowserWindow | null = null

let shouldQuit = false

const createWindow = () => {
  // Create the browser window.
  if (!mainWindow) {
    mainWindow = new BrowserWindow({
      height: 640,
      width: 1024,
      resizable: false,
      title: 'Tronic',
      webPreferences: {
        nodeIntegration: true
      }
    });
  
    // and load the index.html of the app.
    mainWindow.loadURL(DEV ? 'http://localhost:1234' : `file://${path.join(__dirname, '../web/index.html')}`);
  
    // Open the DevTools.
    if (DEV) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.show()
  }

  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin') {
      if (shouldQuit) {
        mainWindow = null
      } else {
        e.preventDefault()
        mainWindow!.hide()
      }
    }
  })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  shouldQuit = true
})

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
  }
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
