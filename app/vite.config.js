import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    open: true,
  },
  preview: {
    open: true,
  },
});
