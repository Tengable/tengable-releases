/* eslint-disable @typescript-eslint/no-var-requires */
/* global document,  location */
import { ipcRenderer } from 'electron'
import { defaultElectronSettings } from './ElectronSettings'
let crtlDown = false
const appBridge = {
  onAppExit: () => {
    ipcRenderer.send('app-exit')
  },
  onSettingsUpdate: (settings) => {
    window.appBridge.settings = settings
    ipcRenderer.send('update-settings', JSON.stringify(settings))
  },
  settings: defaultElectronSettings,
}
export {}
declare global {
  interface Window {
    appBridge: typeof appBridge
    spacesComs: {
      setVisible: (visible: boolean) => unknown
      setIdle: (visible: boolean) => unknown
    }
  }
}

window.appBridge = appBridge
console.log('added', window, window.appBridge)
document.addEventListener('keydown', function (e) {
  try {
    if (e.which === 17) {
      crtlDown = true
    }
    if (e.which === 123) {
      ipcRenderer.send('open-dev-tools', { open: true })
    } else if (e.which === 116 || (crtlDown && e.which === 82)) {
      location.reload()
    }
  } catch (e) {
    // eslint-disable-next-line no-undef
    alert(`Error opening devtools: ${e}`)
  }
})
document.addEventListener('keyup', function (e) {
  try {
    if (e.which === 17) {
      crtlDown = false
    }
  } catch (e) {
    window.alert(`Error opening devtools: ${JSON.stringify(e)}`)
  }
})

function listenForEvents() {
  ipcRenderer.on('hide', () => {
    window.spacesComs.setVisible(false)
  })
  ipcRenderer.on('show', () => {
    window.spacesComs.setVisible(true)
  })
  ipcRenderer.on('idle', (e, idle) => {
    window.spacesComs.setIdle(idle)
  })
  ipcRenderer.on('initial-settings', (event, settings) => {
    window.appBridge.settings = settings
  })
  ipcRenderer.send('listening-for-events')
}

// in case the document is already rendered
if (document.readyState != 'loading') listenForEvents()
// modern browsers
else if (document.addEventListener)
  document.addEventListener('DOMContentLoaded', listenForEvents)
// IE <= 8
else
  document.attachEvent('onreadystatechange', function () {
    if (document.readyState == 'complete') listenForEvents()
  })
