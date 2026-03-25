import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,

    allowedHosts: [
      "acm.urdu.uz",
    ],

    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Monaco worker fayllarini alohida chunk sifatida saqlash
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
})
