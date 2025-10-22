import { defineConfig } from 'vitest/config';
import { ghPages } from 'vite-plugin-gh-pages'


export default defineConfig({
  base: '/Think-Kendo/',   // ← change this
  plugins: [ghPages()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
});
