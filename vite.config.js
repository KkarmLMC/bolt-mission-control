import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,

      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'apple-touch-icon-180x180.png',
        'maskable-icon-512x512.png',
        'badge-72x72.png',
      ],

      manifest: {
        name: 'StormStack Mission Control',
        short_name: 'Mission Control',
        description: 'Lightning protection operations dashboard and team management.',
        theme_color: '#04245c',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/?source=pwa',
        id: '/',
        orientation: 'portrait-primary',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          { src: 'screenshot-wide.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Operations dashboard' },
          { src: 'screenshot-narrow.png', sizes: '750x1334', type: 'image/png', form_factor: 'narrow', label: 'Project details' },
        ],
      },

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },

      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/@phosphor-icons')) {
            return 'vendor-ui'
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
