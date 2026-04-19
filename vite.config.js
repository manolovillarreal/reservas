import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
   server: {
    host: '0.0.0.0',
    port: 5173
  },
  plugins: [
    tailwindcss(),
    vue(),
    // -------------------------------------------------------
    // Config VitePWA original (generateSW implícito, pre-injectManifest — 2026-03-22):
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   manifest: {
    //     name: 'TekMi Inn', short_name: 'TekMi',
    //     description: 'Gestion de reservas para alojamientos',
    //     theme_color: '#4C2FFF', background_color: '#F8F9FC',
    //     display: 'standalone', orientation: 'portrait', start_url: '/',
    //     icons: [
    //       { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
    //       { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
    //       { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    //     ]
    //   }
    // })
    // -------------------------------------------------------
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // injectManifest: usa src/sw.js como fuente del service worker.
      // El precaching workbox se inyecta via self.__WB_MANIFEST en build.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'TekMi Inn',
        short_name: 'TekMi',
        description: 'Gestion de reservas para alojamientos',
        theme_color: '#4C2FFF',
        background_color: '#F8F9FC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
