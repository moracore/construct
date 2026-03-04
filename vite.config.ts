import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE_URL ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.png'],
      manifest: {
        name: 'Construct - Workout App',
        short_name: 'Construct',
        description: 'Local-first workout tracker',
        theme_color: '#0080FF',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          // Updated manifest icon entry for the new PNG
          { src: 'icon.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})