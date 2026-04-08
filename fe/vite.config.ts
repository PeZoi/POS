import path from 'node:path'
import { fileURLToPath } from 'node:url'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.dirname(fileURLToPath(import.meta.url)), '')
  const pyBarcodePort = env.PY_BARCODE_PORT || '8765'
  /** Bật bằng `npm run dev:https` hoặc `DEV_HTTPS=true` — cần cho camera (getUserMedia) khi mở qua IP LAN. */
  const useHttps =
    process.env.DEV_HTTPS === 'true' || env.DEV_HTTPS === 'true'

  return {
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src'),
    },
  },
  plugins: [
    react(),
    ...(useHttps ? [basicSsl()] : []),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-app.png'],
      manifest: {
        name: 'POS',
        short_name: 'POS',
        description: 'Ứng dụng bán hàng POS',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icon-app.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-app.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-app.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: true,
    ...(useHttps
      ? {
          /** Cert do `basicSsl()` gán ở configResolved; không dùng `https: true` (Vite 8 không còn boolean). */
          hmr: { protocol: 'wss' },
        }
      : {}),
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws/pybarcode': {
        target: `ws://127.0.0.1:${pyBarcodePort}`,
        ws: true,
        changeOrigin: true,
        rewrite: () => '/',
      },
    },
  },
}
})
