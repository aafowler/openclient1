import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Only polyfill what swagger-parser actually needs in the browser.
      include: ['buffer', 'path', 'util'],
      globals: { Buffer: true },
    }),
  ],
})
