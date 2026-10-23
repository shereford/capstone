import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so dist/ works from the ZIP and on GitHub Pages
  base: './',
  server: { host: '127.0.0.1' },
});
