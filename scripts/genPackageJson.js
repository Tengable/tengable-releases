const fs = require('fs')
const { join } = require('path')
const pkgJSON = require('../package.json')
const { build, devDependencies, scripts, ...updatedPackageJson } = pkgJSON
console.log({ updatedPackageJson })
fs.writeFileSync(
  join(__dirname, '../build/package.json'),
  JSON.stringify(updatedPackageJson, null, 2)
)
