const fs = require("fs")
const path = require("path")

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    return
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.cpSync(source, destination, { recursive: true, force: true })
}

const rootDir = process.cwd()
const standaloneDir = path.join(rootDir, ".next", "standalone")

copyDirectory(path.join(rootDir, "public"), path.join(standaloneDir, "public"))
copyDirectory(path.join(rootDir, ".next", "static"), path.join(standaloneDir, ".next", "static"))

console.log("[standalone] copied public assets and static chunks")
