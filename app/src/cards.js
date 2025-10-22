let cardsCache = null;

const cardsImportPath = './data/cards.json';

const cardsRequestUrl = (() => {
  try {
    return new URL(cardsImportPath, import.meta.url).href;
  } catch (error) {
    console.warn('Unable to resolve cards.json via import.meta.url, falling back to relative path', error);
    return 'data/cards.json';
  }
})();

const cardPalette = [
  '#fde68a',
  '#bfdbfe',
  '#ddd6fe',
  '#bbf7d0',
  '#fecdd3',
  '#f5d0fe',
];

function resolveTitle({ rawTitle, rawSummary, rawDetails }) {
  if (rawTitle) {
    return { display: rawTitle, full: rawTitle };
  }

  const fallbackSource = [rawSummary, rawDetails].find((value) => Boolean(value));
  if (!fallbackSource) {
    return { display: '', full: '' };
  }

  if (fallbackSource.length <= 64) {
    return { display: fallbackSource, full: fallbackSource };
  }

  const truncated = fallbackSource.slice(0, 64).replace(/\s+\S*$/, '').trim();
  const safe = truncated || fallbackSource.slice(0, 64).trim();
  const display = safe ? `${safe}...` : fallbackSource;
  return { display, full: fallbackSource };
}

function generateCardId(seed = 0) {
  const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }

  const randomSegment = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `card-${timestamp}-${seed}-${randomSegment}`;
}

function normalizeCards(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((card, index) => {
    const rawTitle = typeof card.title === 'string' ? card.title.trim() : '';
    const rawSummary = typeof card.summary === 'string' ? card.summary.trim() : '';

    const detailsSource = card.details;
    let detailItems = null;
    if (Array.isArray(detailsSource)) {
      detailItems = detailsSource
        .map((item) => {
          if (item == null) {
            return '';
          }
          const text = typeof item === 'string' ? item : String(item);
          return text.trim();
        })
        .filter(Boolean);
    }
    const rawDetails = typeof detailsSource === 'string'
      ? detailsSource.trim()
      : detailItems && detailItems.length > 0
        ? detailItems.join(', ')
        : '';

    const { display: title, full: fullTitle } = resolveTitle({ rawTitle, rawSummary, rawDetails });
    const summary = rawSummary;
    const details = detailItems && detailItems.length > 0
      ? detailItems
      : rawDetails || rawSummary || '';

    const tags = Array.isArray(card.tags) ? card.tags.filter((tag) => typeof tag === 'string') : [];
    const image = card.image && typeof card.image === 'object' ? {
      src: typeof card.image.src === 'string' ? card.image.src.trim() : '',
      alt: typeof card.image.alt === 'string' ? card.image.alt.trim() : '',
    } : null;

    return {
      id: generateCardId(index),
      title,
      fullTitle,
      summary,
      details,
      tags,
      image,
    };
  });
}

function shuffleCards(cards) {
  const shuffled = cards.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

async function loadFromImport() {
  try {
    const module = await import(cardsImportPath, { assert: { type: 'json' } });
    const payload = module.default ?? module;
    if (!Array.isArray(payload)) {
      return null;
    }

    return payload;
  } catch (error) {
    try {
      const module = await import(cardsImportPath);
      const payload = module.default ?? module;
      if (!Array.isArray(payload)) {
        return null;
      }

      return payload;
    } catch (nestedError) {
      console.warn('Falling back to network fetch for cards', nestedError);
    }
    return null;
  }
}

async function loadFromNetwork() {
  const response = await fetch(cardsRequestUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Cards request failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload;
}

export function prepareCards(rawCards, { shuffle = true } = {}) {
  const normalized = normalizeCards(rawCards);

  if (!shuffle) {
    return normalized;
  }

  return shuffleCards(normalized);
}

export async function fetchCards() {
  if (cardsCache) {
    return cardsCache;
  }

  const imported = await loadFromImport();
  if (imported && imported.length > 0) {
    cardsCache = prepareCards(imported, { shuffle: true });
    return cardsCache;
  }

  const networkCards = await loadFromNetwork();
  cardsCache = prepareCards(networkCards, { shuffle: true });
  return cardsCache;
}

export function renderCardGrid({ container, cards, onSelect }) {
  if (!container) {
    throw new Error('renderCardGrid requires a valid container element');
  }

  container.innerHTML = '';

  if (!Array.isArray(cards) || cards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No matching ideas yet. Try another search term.';
    container.appendChild(empty);
    return;
  }

  const grid = document.createElement('section');
  grid.className = 'card-grid';
  grid.setAttribute('aria-live', 'polite');

  cards.forEach((card, index) => {
    const cardArticle = document.createElement('article');
    cardArticle.className = 'card';
    cardArticle.tabIndex = 0;
    cardArticle.setAttribute('role', 'button');
    const summaryText = card.summary || '';
    const detailsLabel = Array.isArray(card.details)
      ? card.details.join('; ')
      : card.details;
    const labelSource = card.fullTitle || summaryText || detailsLabel;
    if (labelSource) {
      cardArticle.setAttribute('aria-label', `View details: ${labelSource}`);
    }
    cardArticle.dataset.cardId = card.id;
    const backgroundColor = cardPalette[index % cardPalette.length];
    cardArticle.style.setProperty('--card-background', backgroundColor);

    const body = document.createElement('div');
    body.className = 'card__body';

    const title = document.createElement('h3');
    title.className = 'card__title';
    title.textContent = card.title;

    body.appendChild(title);

    if (Array.isArray(card.tags) && card.tags.length > 0) {
      const meta = document.createElement('div');
      meta.className = 'card__meta';

      const tagsList = document.createElement('ul');
      tagsList.className = 'card__tags';

      card.tags.forEach((tag) => {
        const item = document.createElement('li');
        item.className = 'card__tag';
        item.textContent = tag;
        tagsList.appendChild(item);
      });

      meta.appendChild(tagsList);
      body.appendChild(meta);
    }

    const openCard = () => {
      if (typeof onSelect === 'function') {
        onSelect({ ...card, backgroundColor });
      }
    };

    cardArticle.addEventListener('click', (event) => {
      openCard();
    });

    cardArticle.addEventListener('keydown', (event) => {
      const key = event.key;
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        openCard();
      }
    });

    cardArticle.appendChild(body);

    grid.appendChild(cardArticle);
  });

  container.appendChild(grid);
}
