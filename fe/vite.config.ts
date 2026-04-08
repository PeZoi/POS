import path from 'node:path'
import { fileURLToPath } from 'node:url'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { serwist } from '@serwist/vite'

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
    serwist({
      swSrc: 'src/sw.ts',
      swDest: 'sw.js',
      globDirectory: 'dist',
      injectionPoint: 'self.__SW_MANIFEST',
      rollupFormat: 'iife',
      // Dev: cần HTTPS/localhost để SW hoạt động.
      devOptions: {
        // Keep defaults; avoid bundling/minify changes unless needed.
        bundle: false,
        minify: false,
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
