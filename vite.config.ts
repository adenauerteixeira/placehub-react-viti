import path from 'node:path'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const versionFile = readFileSync(path.resolve(import.meta.dirname, 'VERSION.md'), 'utf8')
const appVersion = /^version=(.+)$/m.exec(versionFile)?.[1]?.trim()

if (!appVersion) {
  throw new Error('VERSION.md deve conter uma linha no formato version=0.0.01')
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
