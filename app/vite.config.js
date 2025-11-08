import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const workspaceRoot = resolve(__dirname, '..');

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
    fs: {
      allow: [workspaceRoot, __dirname],
    },
  },
  preview: {
    open: true,
  },
});
