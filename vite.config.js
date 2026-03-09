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
    // Dev-only proxy endpoint that fetches external URLs server-side, bypassing browser CORS restrictions for the URL input tab.
    // Temp solution (maybe swap to something like Vercel later on)
    {
      name: 'fetch-spec-proxy',
      configureServer(server) {
        server.middlewares.use('/api/fetch-spec', async (req, res) => {
          const url = new URL(req.url, 'http://localhost').searchParams.get('url')
          if (!url) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Missing "url" query parameter.' }))
            return
          }

          try {
            const response = await fetch(url)
            const text = await response.text()
            res.writeHead(response.status, {
              'Content-Type': response.headers.get('Content-Type') || 'text/plain',
            })
            res.end(text)
          } catch (err) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: `Failed to fetch: ${err.message}` }))
          }
        })
      },
    },
  ],
})
