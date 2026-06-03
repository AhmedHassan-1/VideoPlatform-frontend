import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/upload': 'http://localhost:3000',
      '/videos': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/stream': 'http://localhost:3000',
      '/license': 'http://localhost:3000',
      '/player': 'http://localhost:3000',
      '/thumbnails': 'http://localhost:3000',
    },
  },
});
