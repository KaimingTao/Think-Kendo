let markedInstance = null;
let markedPromise = null;

const CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/marked@5.1.2/lib/marked.esm.js';
const MARKED_OPTIONS = {
  breaks: true,
  gfm: true,
  mangle: false,
};

function configureMarked(candidate) {
  if (!candidate || typeof candidate.parse !== 'function') {
    throw new Error('Unable to resolve marked parser');
  }

  if (typeof candidate.use === 'function') {
    candidate.use(MARKED_OPTIONS);
  } else if (typeof candidate.setOptions === 'function') {
    candidate.setOptions(MARKED_OPTIONS);
  }

  return candidate;
}

async function importMarked() {
  const existing = globalThis.marked;
  if (existing && typeof existing.parse === 'function') {
    return existing;
  }

  try {
    const module = await import('marked');
    return module.marked ?? module.default ?? module;
  } catch (error) {
    if (typeof window !== 'undefined') {
      const module = await import(/* @vite-ignore */ CDN_FALLBACK);
      return module.marked ?? module.default ?? module;
    }
    throw error;
  }
}

export function ensureMarkedReady() {
  if (markedInstance) {
    return Promise.resolve(markedInstance);
  }

  if (markedPromise) {
    return markedPromise;
  }

  markedPromise = importMarked()
    .then((module) => {
      markedInstance = configureMarked(module);
      return markedInstance;
    })
    .catch((error) => {
      markedPromise = null;
      throw error;
    });

  return markedPromise;
}

export function getMarked() {
  if (!markedInstance) {
    throw new Error('Marked has not finished loading');
  }
  return markedInstance;
}

export function parseMarkdown(markdownSource) {
  const source = typeof markdownSource === 'string' ? markdownSource : '';
  if (!source) {
    return '';
  }

  if (!markedInstance) {
    console.warn('Markdown parser requested before it was ready');
    return '';
  }

  try {
    return markedInstance.parse(source);
  } catch (error) {
    console.warn('Failed to parse markdown', error);
    return '';
  }
}

if (typeof window !== 'undefined') {
  ensureMarkedReady().catch((error) => {
    console.warn('Unable to preload markdown parser', error);
  });
}
