import * as builder from 'electron-builder'
import shelljs from 'shelljs'
import { join } from 'path'
const Platform = builder.Platform
const buildDir = join(__dirname, '../build/')
const outDir = join(__dirname, '../out/')
const pkgPath = join(__dirname, '../', 'package.json')
shelljs.cp('-f', pkgPath, buildDir)
builder
  .build({
    targets: Platform.current().createTarget(),
    projectDir: buildDir,
    config: {
      target: 'AppImage',
      directories: {
        app: buildDir,
        output: outDir,
      },
      productName: 'Tengable',
      copyright: 'Copyright © 2020 Tengable LLC',
      electronCompile: false,
      npmRebuild: false,
      asar: true,
      appId: 'com.tengable.desktop',
      icon: './build/assets/icon.png',
      publish: {
        owner: 'Tengable',
        repo: 'tengable-releases',
        releaseType: 'prerelease',
        provider: 'github',
      },
      appImage: {
        artifactName: 'Tengable.AppImage',
        category: 'Productivity',
      },
      linux: {
        target: ['AppImage'],
      },
      mac: {
        target: ['dmg', 'zip'],
        icon: './build/assets/icon.png',
      },
      win: {
        target: ['nsis', 'portable', 'msi', 'zip'],
        icon: './build/assets/icon.png',
        publisherName: 'Tengable LLC',
      },
    },
  })
  .then(() => {
    console.log('done')
    // handle result
  })
  .catch((error) => {
    // handle error
  })
