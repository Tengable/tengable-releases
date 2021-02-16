import { BrowserWindow, shell, app, Tray, ipcMain, dialog } from 'electron'
import { dirname, resolve, basename } from 'path'
import { tc } from './utils'
import Store from 'electron-store'
import { join } from 'path'
import { EventEnum, IdleMonitor } from './IdleMonitor'
import initTray from './tray'
import { environment } from './environment'
import { IElectronSettings, defaultElectronSettings } from './ElectronSettings'
import isNumber from 'lodash/isNumber'
const desktopSettingsName = environment.production ? 'tengable-desktop-settings' : 'tengable-desktop-settings-dev'
const windowSettingsName = environment.production ? 'tengable-window-settings' : 'tengable-window-settings-dev'
export default class App {
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  mainWindow: Electron.BrowserWindow | null = null
  application!: Electron.App
  BrowserWindow!: typeof BrowserWindow
  tray: Tray | null = null
  idleMonitor!: IdleMonitor
  settings: IElectronSettings
  constructor() {
    console.log('loading settings')
    this.settings = this.loadSettings()
    console.log('settings loaded', this.settings)
  }
  onIdle = () => {
    console.log('send idle')
    this.mainWindow?.webContents.send('idle', true)
  }
  onActive = () => {
    this.mainWindow?.webContents.send('idle', false)
  }
  store = new Store({
    name: desktopSettingsName,
  })
  windowStore = new Store({
    name: windowSettingsName,
    defaults: {
      position: [] as number[],
      size: [] as number[],
    },
  })
  private readonly toggleWindowVisibility = (): void => {
    if (this.mainWindow && !this.mainWindow.isVisible()) {
      this.mainWindow?.show()
      this.mainWindow.setAlwaysOnTop(true)
    } else {
      this.mainWindow?.hide()
    }
  }

  private readonly sendShutdownSignal = () => {
    console.log('sending sigterm signal')
    process.kill(process.pid, 'SIGTERM')
  }

  hideTimeout: null | NodeJS.Timeout = null

  static isDevelopmentMode = () => {
    return !environment.production
  }

  destroy = () => {
    console.log('destroying app...')
    if (this.hideTimeout) clearTimeout(this.hideTimeout)
    try {
      this.tray?.destroy()
      console.log('tray menu destroyed...')
    } catch (e) {
      console.error(e)
    }
  }
  onWindowAllClosed = () => {
    if (process.platform !== 'darwin') {
      this.application.quit()
    }
  }

  onClose = () => {
    this.onClose()
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    this.mainWindow = null
  }

  onRedirect = (event: any, url: string) => {
    if (!this.mainWindow) throw new Error('this.mainWindow is null')

    if (url !== this.mainWindow.webContents.getURL()) {
      // this is a normal external redirect, open it in a new browser window
      event.preventDefault()
      shell.openExternal(url)
    }
  }

  onReady = () => {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    this.initMainWindow()
    this.loadMainWindow()
    this.tray = initTray({
      onShowHide: this.toggleWindowVisibility,
      onQuit: this.sendShutdownSignal,
    })
    this.tray.on('click', this.toggleWindowVisibility)
    this.idleMonitor = new IdleMonitor()
    this.idleMonitor.on(EventEnum.idle, this.onIdle)
    this.idleMonitor.on(EventEnum.active, this.onActive)

    console.log('initialized')
  }

  onActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    console.log('activate')
    if (this.mainWindow === null) {
      this.onReady()
    }
  }

  initMainWindow() {
    this.settings = this.loadSettings()
    let options: Electron.BrowserWindowConstructorOptions = {
      title: 'Tengable',
      icon: join(__dirname, 'assets', 'icon.png'),
      frame: false,
      alwaysOnTop: false,
      webPreferences: {
        // TODO: switch to https://www.electronjs.org/docs/api/context-bridge
        contextIsolation: false,
        preload: join(__dirname, 'preload.js'),
        nodeIntegration: false,
        backgroundThrottling: false,
      },
    }
    const [width, height] = this.windowStore.get('size')
    const [x, y] = this.windowStore.get('position')
    if (isNumber(width) && isNumber(height)) {
      options = { ...options, width, height }
    }
    if (isNumber(x) && isNumber(y)) {
      options = { ...options, x, y }
    }
    console.log('options', options)
    // Create the browser window.
    this.mainWindow = new BrowserWindow(options)
    // over ride random os placements or whatever
    let startupPositionerInterval = setInterval(() => {
      if (isNumber(x) && isNumber(y)) this.mainWindow?.setPosition(x, y)
      if (isNumber(width) && isNumber(height)) this.mainWindow?.setSize(width, height, false)
    }, 50)
    setTimeout(() => {
      clearInterval(startupPositionerInterval)
    }, 50)
    this.mainWindow.on('move', this.updateWindowSettings)
    this.mainWindow.on('resize', this.updateWindowSettings)
    ipcMain.on('listening-for-events', () => {
      ipcMain.addListener('open-dev-tools', () => {
        console.log('open dev tools')
        this.mainWindow?.webContents.openDevTools({ mode: 'detach' })
      })
      ipcMain.addListener('app-exit', () => {
        console.log('quit')
        app.quit()
      })
      ipcMain.addListener('update-settings', this.updateSettings)
      this.applySettings(this.settings)
    })
    this.mainWindow.on('close', (e) => {
      e.preventDefault()
      this.mainWindow?.hide()
    })
    this.mainWindow.setMenu(null)
    this.mainWindow.center()
    console.log('app path', app.getAppPath())
    console.log('dirname', __dirname)
    if (this.application.commandLine.hasSwitch('devtools')) {
      this.mainWindow.webContents.openDevTools({ mode: 'detach' })
    }

    // if main window is ready to show, close the splash window and show the main window
    // this.mainWindow.once('ready-to-show', () => {
    //   if (!this.mainWindow) return
    //   this.mainWindow.show()

    // })

    // handle all external redirects in a new browser window
    this.mainWindow.webContents.on('will-navigate', this.onRedirect)
    this.mainWindow.webContents.on(
      'new-window',

      (event, url, frameName, disposition, options) => {
        this.onRedirect(event, url)
      }
    )

    // Emitted when the window is closed.
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
      console.log('main window closed')
    })
    this.mainWindow.on('hide', () => {
      this.mainWindow?.webContents.send('hide')
    })
    this.mainWindow.on('show', () => {
      this.mainWindow?.webContents.send('show')
    })
    this.mainWindow.webContents.on('did-navigate-in-page', (e) =>
      this.setLastUrl(this.mainWindow?.webContents.getURL() || 'awd')
    )
  }
  loadSettings = () => {
    let parsedSettings = tc({
      try: () => {
        const settings: string = (this.store.get('settings') as any) || ''
        if (settings) return JSON.parse(settings) as IElectronSettings
        return defaultElectronSettings
      },
      catch: (e) => {
        dialog.showErrorBox('Could not load settings, reverting to defaults', e.toString())
        return defaultElectronSettings
      },
    })
    parsedSettings = { ...defaultElectronSettings, ...parsedSettings }
    this.settings = parsedSettings
    this.mainWindow?.webContents.send('initial-settings', parsedSettings)
    return parsedSettings
  }
  updateSettings = (event: any, settings: string) => {
    console.log('settings', settings)
    let parsedSettings = tc({
      try: () => {
        const parsed = JSON.parse(settings) as IElectronSettings
        console.log('parsed', typeof parsed, { parsed })
        return parsed
      },
      catch: (e) => {
        dialog.showErrorBox('Could not save settings', e.toString())
        return defaultElectronSettings
      },
    })
    console.log(typeof parsedSettings)
    this.store.set('settings', JSON.stringify({ ...parsedSettings }))
    this.applySettings(parsedSettings)
  }
  updateWindowSettings = () => {
    const position = this.mainWindow?.getPosition()
    const size = this.mainWindow?.getSize()
    this.windowStore.set('position', position)
    this.windowStore.set('size', size)
  }
  applySettings = async (settings: IElectronSettings) => {
    console.log('applying settings', settings, typeof settings)
    if (!App.isDevelopmentMode()) {
      const appFolder = dirname(process.execPath)
      const updateExe = resolve(appFolder, '..', 'Update.exe')
      const exeName = basename(process.execPath)

      app.setLoginItemSettings({
        openAtLogin: settings.autoStart,
        path: updateExe,
        args: ['--processStart', `"${exeName}"`, '--process-start-args', `"--hidden"`],
      })
    } else {
      console.log('ignoring autostart in development mode...')
    }
    console.log('mouse monitor', settings.mouseIdleMute)
    this.idleMonitor.monitorMouseMovements = settings.mouseIdleMute
    this.idleMonitor.timeoutTime = settings.mouseIdleTime
    if (settings.useBeta) {
      this.store.set('use-beta-channel', settings.useBeta)
    }
  }

  loadMainWindow() {
    if (!this.mainWindow) throw new Error('this.mainWindow is null')

    this.mainWindow.loadURL(this.getLastUrl())
  }
  getLastUrl = (): string => {
    console.log('get last url')
    if (this.settings.useStaging) return 'https://staging.app.tengable.com/demo'
    const defaultUrl = this.application.isPackaged ? `https://app.tengable.com/demo` : `http://localhost:4200/demo`
    let lastUrl = this.store.get('last-url')
    if (!!lastUrl && typeof lastUrl == 'string') return lastUrl
    return defaultUrl
  }
  setLastUrl = (url: string) => {
    this.store.set('last-url', url)
  }
  main(app: Electron.App, browserWindow: typeof BrowserWindow) {
    // we pass the Electron.App object and the
    // Electron.BrowserWindow into this function
    // so this class has no dependencies. This
    // makes the code easier to write tests for
    console.log('userData location', app.getPath('userData'))
    this.BrowserWindow = browserWindow
    this.application = app

    console.log('Tengable version: ', app.getVersion())
    // this.application.on('window-all-closed', this.onWindowAllClosed) // Quit when all windows are closed.
    this.application.on('ready', this.onReady) // App is ready to load data
    this.application.on('activate', this.onActivate) // App is activated
  }
}
