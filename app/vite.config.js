import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';

function resolveCardsLastModified() {
  try {
    const stats = statSync(resolve(__dirname, 'data/cards.json'));
    return stats.mtime.toISOString();
  } catch (error) {
    console.warn('Unable to stat data/cards.json for last modified timestamp', error);
    return null;
  }
}

const cardsLastModified = resolveCardsLastModified();

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
  define: {
    __CARDS_LAST_MODIFIED__: cardsLastModified ? JSON.stringify(cardsLastModified) : 'null',
  },
});
