import { Tray, Menu } from 'electron'
import path from 'path'
export default function initTray(
  options: { onShowHide?: () => any; onQuit?: () => any } = {}
) {
  let trayIcon = new Tray(path.join(__dirname, './assets/icons/png/16x16.png'))
  trayIcon.setIgnoreDoubleClickEvents(true)
  const trayMenuTemplate = [
    {
      label: 'Show/Hide',
      click: options.onShowHide,
    },

    {
      label: 'Quit',
      click: options.onQuit,
    },
  ]

  let trayMenu = Menu.buildFromTemplate(trayMenuTemplate)
  trayIcon.setContextMenu(trayMenu)
  return trayIcon
}
