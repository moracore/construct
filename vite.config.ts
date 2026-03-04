import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE_URL ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Construct - Workout App',
        short_name: 'Construct',
        description: 'Local-first workout tracker',
        theme_color: '#1b1b1b',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/construct/icon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/construct/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/construct/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/construct/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})