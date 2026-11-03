import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In dev, the browser only talks to Vite (:5173); Vite forwards these paths to the API.
    // Same origin for the browser, so no CORS in dev.
    // API_PROXY_TARGET lets the end-to-end tests run their own API on another port (see playwright.config.js).
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:4000',
      '/uploads': process.env.API_PROXY_TARGET ?? 'http://localhost:4000',
    },
  },
});
