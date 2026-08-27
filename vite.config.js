import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/stag': {
        target: 'https://stagws.uhk.cz',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/stag/, '')
      },
      '/api/rozvrhy': {
        target: 'https://fim.uhk.cz',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/rozvrhy/, '/rozvrhy')
      }
    }
  }
})
