import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// FIX for 401 on page reload:
// The problem: /admin, /videos, /users etc. are proxied to NestJS.
// When you reload /admin/videos, Vite sends it to NestJS → 401.
//
// Solution: use `bypass` on each proxy rule.
// If the request has Accept: text/html (browser page load/reload),
// return null to let Vite serve index.html instead of proxying.
// API calls (fetch/axios) have Accept: application/json → still proxied normally.

function bypassHtml(req: any) {
  const accept = req.headers?.accept ?? '';
  if (accept.includes('text/html')) return '/index.html';
  return null; // proxy normally
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api':           { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
      '/auth':          { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
      '/upload':        { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
      '/videos':        { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
      '/users':         { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
      '/admin':         { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
      '/stream':        { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
      '/license':       { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
      '/player':        { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
      '/thumbnails':    { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
      '/watermark':     { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
      '/notifications': { target: 'http://localhost:3000', changeOrigin: true, bypass: bypassHtml },
    },
  },
  build: {
    outDir: 'dist',
  },
});
