import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: {
      '@viswave/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})
