// Run once to generate PWA PNG icons from public/icon.svg
// Usage: node scripts/generate-icons.mjs
// Requires: npm install -D sharp

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(resolve(__dirname, '../public/icon.svg'))

const icons = [
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32,  name: 'favicon-32x32.png' },
]

for (const { size, name } of icons) {
  await sharp(svg).resize(size, size).png().toFile(resolve(__dirname, '../public', name))
  console.log(`Generated public/${name}`)
}
console.log('Done!')
