import { mkdirSync, copyFileSync, renameSync, existsSync, readdirSync, rmSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = resolve(__dirname, '..', 'dist')

// 1. Create app/ directory in dist
const appDir = resolve(dist, 'app')
mkdirSync(appDir, { recursive: true })

// 2. Copy React app's index.html into app/
copyFileSync(resolve(dist, 'index.html'), resolve(appDir, 'index.html'))

// 3. Move assets/ into app/assets/
const assetsDir = resolve(dist, 'assets')
if (existsSync(assetsDir)) {
  const appAssetsDir = resolve(appDir, 'assets')
  mkdirSync(appAssetsDir, { recursive: true })
  for (const file of readdirSync(assetsDir)) {
    copyFileSync(resolve(assetsDir, file), resolve(appAssetsDir, file))
  }
  rmSync(assetsDir, { recursive: true })
}

// 4. Copy static files into app/
const staticFiles = ['favicon.svg', 'icons.svg', 'registerSW.js', 'manifest.webmanifest']
for (const file of staticFiles) {
  const src = resolve(dist, file)
  if (existsSync(src)) {
    copyFileSync(src, resolve(appDir, file))
    rmSync(src)
  }
}

// Copy workbox file (name has content hash, find it dynamically)
const workboxFile = readdirSync(dist).find(f => f.startsWith('workbox-') && f.endsWith('.js'))
if (workboxFile) {
  copyFileSync(resolve(dist, workboxFile), resolve(appDir, workboxFile))
  rmSync(resolve(dist, workboxFile))
}

// Copy sw.js
const swFile = resolve(dist, 'sw.js')
if (existsSync(swFile)) {
  copyFileSync(swFile, resolve(appDir, 'sw.js'))
  rmSync(swFile)
}

// Copy icon.svg into app/ for SW caching (also keep at root for manifest)
const iconFile = resolve(dist, 'icon.svg')
if (existsSync(iconFile)) {
  copyFileSync(iconFile, resolve(appDir, 'icon.svg'))
}

// 5. Move landing.html to index.html
const landing = resolve(dist, 'landing.html')
if (existsSync(landing)) {
  renameSync(landing, resolve(dist, 'index.html'))
}

console.log('Dist restructured: landing at /, React app at /app/')
