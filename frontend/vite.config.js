import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Запросы к /api во время разработки перенаправляются на сервер FastAPI.
// VITE_BASE задаёт путь сайта при публикации, например /game-collection/ на GitHub Pages
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
});
