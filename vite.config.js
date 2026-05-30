import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'LocationHunt',
        short_name: 'LocationHunt',
        description: 'GPS Hide & Seek Spiel',
        start_url: '/',
        display: 'standalone',
        background_color: '#0D1117',
        theme_color: '#3B82F6',
        icons: [
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
      },
    }),
  ],
})
