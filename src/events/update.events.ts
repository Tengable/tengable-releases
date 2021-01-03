import { autoUpdater } from 'electron-updater'
import { dialog } from 'electron'
import log from 'electron-log'
import App from '../App'
export default function autoUpdate(tengableApp: App) {
  const settings = tengableApp.loadSettings()
  ;(autoUpdater as any).logger = log
  ;(autoUpdater as any).logger.transports.file.level = 'info'
  log.info('App starting...')
  autoUpdater.allowPrerelease = settings.useBeta
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...')
  })
  autoUpdater.on('update-available', (info) => {
    log.info('Update available.')
  })
  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.')
  })
  autoUpdater.on('error', (err) => {
    log.info('Error in auto-updater. ' + err)
  })
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
    log_message =
      log_message +
      ' (' +
      progressObj.transferred +
      '/' +
      progressObj.total +
      ')'
    log.info(log_message)
  })

  // app.on('ready', function()  {
  //   autoUpdater.checkForUpdates();
  // });
  // autoUpdater.on('checking-for-update', () => {
  // })
  // autoUpdater.on('update-available', (info) => {
  // })
  // autoUpdater.on('update-not-available', (info) => {
  // })
  // autoUpdater.on('error', (err) => {
  // })
  // autoUpdater.on('download-progress', (progressObj) => {
  // })
  let applyUpdateAutomatically = true
  autoUpdater.on('update-downloaded', async (info) => {
    if (applyUpdateAutomatically) autoUpdater.quitAndInstall()
    const { response } = await dialog.showMessageBox({
      buttons: ['Yes', 'No'],
      message: 'New version available, restart now?',
    })
    if (response === 0) autoUpdater.quitAndInstall()
  })
  autoUpdater.checkForUpdatesAndNotify()
  setInterval(() => {
    applyUpdateAutomatically = false
    autoUpdater.checkForUpdatesAndNotify()
  }, 1000 * 60 * 60)
}
