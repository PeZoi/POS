import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.dirname(fileURLToPath(import.meta.url)), '')
  const pyBarcodePort = env.PY_BARCODE_PORT || '8765'

  return {
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src'),
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss()
  ],
  server: {
    // Tunnels (ngrok, etc.): Host header is not localhost
    allowedHosts: true,
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
