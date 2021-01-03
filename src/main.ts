import SquirrelEvents from './events/squirrel.events'
import ElectronEvents from './events/electron.events'
import autoUpdate from './events/update.events'
import { app, BrowserWindow } from 'electron'
import App from './App'
import once from 'lodash/once'
import installExtension, {
  REACT_DEVELOPER_TOOLS,
  REDUX_DEVTOOLS,
} from 'electron-devtools-installer'
import log from 'electron-log'
Object.assign(console, log.functions)
export default class Main {
  tengableApp: App | null = null
  constructor() {
    console.log('new app created')
    process.on('SIGINT', this.destroy)
    process.on('SIGTERM', this.destroy)
    process.on('exit', this.destroy)
    process.on('beforeExit', this.destroy)
    app.on('before-quit', this.destroy)
    if (app.isPackaged) {
      app.whenReady().then(() => {
        installExtension(REDUX_DEVTOOLS).catch((err) =>
          console.log('An error occurred: ', err)
        )

        installExtension(REACT_DEVELOPER_TOOLS).catch((err) =>
          console.log('An error occurred: ', err)
        )
      })
    }
  }
  destroy = once(() => {
    console.log('exiting...')
    try {
      this.tengableApp?.destroy()
      app.quit()
    } catch (e) {
      console.error('shutdown error', e)
    } finally {
      console.log('...exited')
      process.exit()
    }
  })
  initialize() {
    if (SquirrelEvents.handleEvents()) {
      // squirrel event handled (except first run event) and app will exit in 1000ms, so don't do anything else
      app.quit()
      this.tengableApp?.destroy()
    }
  }

  bootstrapApp() {
    if (this.tengableApp) this.tengableApp.destroy()
    console.log('bootstrapping app')
    this.tengableApp = new App()
    this.tengableApp.main(app, BrowserWindow)
  }

  bootstrapAppEvents() {
    ElectronEvents.bootstrapElectronEvents()

    // initialize auto updater service
    if (!App.isDevelopmentMode()) {
      console.log('checking for updates')
      if (!this.tengableApp)
        throw new Error('Startup error, app not initialized')
      autoUpdate(this.tengableApp)
    }
  }
}

const main = new Main()
// handle setup events as quickly as possible
main.initialize()

// bootstrap app
main.bootstrapApp()
main.bootstrapAppEvents()
