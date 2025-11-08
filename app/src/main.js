import { fetchCards, renderCardGrid, prepareCards, parseCardsContent } from './cards.js';
import { cardsLastModified } from './cards-metadata.js';
import { createModalController } from './modal.js';

const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const siteUpdate = document.getElementById('site-update');
const siteYear = document.getElementById('site-year');

if (!app) {
  throw new Error('Missing #app container');
}

if (!modalRoot) {
  throw new Error('Missing #modal-root container');
}

let updateSiteUpdateText = () => {};

if (siteUpdate) {
  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const parsedLastUpdated = typeof cardsLastModified === 'string' ? new Date(cardsLastModified) : null;
  const resolvedDate = parsedLastUpdated && !Number.isNaN(parsedLastUpdated.getTime())
    ? parsedLastUpdated
    : new Date();

  const baseText = `Last updated ${formatter.format(resolvedDate)}`;

  updateSiteUpdateText = (cardCount) => {
    if (typeof cardCount === 'number' && Number.isFinite(cardCount)) {
      const label = cardCount === 1 ? 'card' : 'cards';
      siteUpdate.textContent = `${baseText} • ${cardCount} ${label}`;
      return;
    }

    siteUpdate.textContent = baseText;
  };

  updateSiteUpdateText();
}

if (siteYear) {
  siteYear.textContent = new Date().getFullYear();
}

const headerCta = document.querySelector('.site-header__cta');

const modal = createModalController(modalRoot);
modal.init();

const tagFilterSection = document.createElement('section');
tagFilterSection.className = 'tag-filter';
tagFilterSection.setAttribute('aria-label', 'Filter cards by tag');
tagFilterSection.hidden = true;

const tagFilterLabel = document.createElement('span');
tagFilterLabel.className = 'tag-filter__label';
tagFilterLabel.textContent = 'Browse by tag';
tagFilterSection.appendChild(tagFilterLabel);

const tagFilterList = document.createElement('div');
tagFilterList.className = 'tag-filter__list';
tagFilterSection.appendChild(tagFilterList);

const searchForm = document.createElement('form');
searchForm.className = 'toolbar';
searchForm.setAttribute('role', 'search');
searchForm.innerHTML = `
  <label class="toolbar__label" for="search-input">Filter ideas</label>
  <input id="search-input" class="toolbar__input" type="search" name="query" placeholder="Search by title or tag" autocomplete="off" />
`;

const searchInput = searchForm.querySelector('#search-input');
if (!searchInput) {
  throw new Error('Missing search input');
}

const uploadInput = document.createElement('input');
uploadInput.type = 'file';
uploadInput.accept = 'text/markdown,.md';
uploadInput.id = 'cards-upload';
uploadInput.hidden = true;

const uploadButton = document.createElement('button');
uploadButton.type = 'button';
uploadButton.textContent = 'Upload cards';

uploadButton.addEventListener('click', () => {
  uploadInput.click();
});

if (headerCta) {
  uploadButton.className = 'site-header__button site-header__button--secondary';

  const browseButton = headerCta.querySelector('.site-header__button');
  const footerNote = headerCta.querySelector('.site-header__cta-note');

  if (browseButton) {
    browseButton.insertAdjacentElement('afterend', uploadButton);
  } else if (footerNote) {
    headerCta.insertBefore(uploadButton, footerNote);
  } else {
    headerCta.appendChild(uploadButton);
  }

  if (footerNote) {
    headerCta.insertBefore(uploadInput, footerNote);
  } else {
    headerCta.appendChild(uploadInput);
  }
} else {
  uploadButton.className = 'toolbar__button';
  const uploadControls = document.createElement('div');
  uploadControls.className = 'toolbar__actions';
  uploadControls.appendChild(uploadButton);
  uploadControls.appendChild(uploadInput);
  searchForm.appendChild(uploadControls);
}

const cardsContainer = document.createElement('div');
cardsContainer.className = 'cards';

app.appendChild(tagFilterSection);
app.appendChild(searchForm);
app.appendChild(cardsContainer);

let cachedCards = [];
let activeTag = '';

function cardMatchesQuery(card, needle) {
  if (!needle) {
    return true;
  }

  const detailTokens = Array.isArray(card.details) ? card.details : [card.details];
  const haystack = [card.title, card.summary, ...detailTokens, ...(card.tags ?? [])]
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

function updateTagButtonStates() {
  const buttons = tagFilterList.querySelectorAll('button');
  buttons.forEach((button) => {
    const buttonTag = button.dataset.tag ?? '';
    const isActive = activeTag === buttonTag;
    button.classList.toggle('tag-filter__button--active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function renderTagFilters(cards) {
  const uniqueTags = Array.from(
    new Set(
      cards.flatMap((card) => {
        if (!Array.isArray(card.tags)) {
          return [];
        }

        return card.tags
          .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
          .filter((tag) => tag !== '');
      }),
    ),
  ).sort((first, second) => first.localeCompare(second, undefined, { sensitivity: 'base' }));

  if (uniqueTags.length === 0) {
    tagFilterList.innerHTML = '';
    tagFilterSection.hidden = true;
    activeTag = '';
    return;
  }

  tagFilterList.innerHTML = '';

  uniqueTags.forEach((tag) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-filter__button';
    button.textContent = tag;
    button.dataset.tag = tag;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      activeTag = activeTag === tag ? '' : tag;
      updateTagButtonStates();
      applyFilters();
    });
    tagFilterList.appendChild(button);
  });

  tagFilterSection.hidden = false;
  updateTagButtonStates();
}

function applyFilters() {
  const queryValue = typeof searchInput.value === 'string' ? searchInput.value : '';
  const trimmed = queryValue.trim().toLowerCase();
  const tagNeedle = activeTag.trim().toLowerCase();

  const filtered = cachedCards.filter((card) => {
    if (tagNeedle) {
      const hasTag = Array.isArray(card.tags)
        && card.tags.some((tag) => typeof tag === 'string' && tag.toLowerCase() === tagNeedle);
      if (!hasTag) {
        return false;
      }
    }

    if (!trimmed) {
      return true;
    }

    return cardMatchesQuery(card, trimmed);
  });

  renderCardGrid({ container: cardsContainer, cards: filtered, onSelect: (card) => modal.open(card) });
}

searchForm.addEventListener('input', () => {
  applyFilters();
});

function reportUploadError(message) {
  if (siteUpdate) {
    siteUpdate.textContent = message;
  }
}

function hydrateFromUploadedCards(rawCards) {
  if (!Array.isArray(rawCards)) {
    throw new Error('Cards file must resolve to a list of cards.');
  }

  const prepared = prepareCards(rawCards, { shuffle: false });
  cachedCards = prepared;
  activeTag = '';
  searchInput.value = '';
  renderTagFilters(prepared);
  updateSiteUpdateText(prepared.length);

  if (siteUpdate) {
    siteUpdate.textContent = `${siteUpdate.textContent} • Loaded from file`;
  }

  applyFilters();
}

function handleFileSelection(file) {
  const reader = new FileReader();

  const resetInput = () => {
    uploadInput.value = '';
  };

  reader.addEventListener('error', () => {
    resetInput();
    reportUploadError(`Failed to read ${file.name}.`);
  });

  reader.addEventListener('load', (event) => {
    resetInput();

    try {
      const textContent = typeof event.target?.result === 'string' ? event.target.result : '';
      if (!textContent.trim()) {
        throw new Error('Cards file was empty.');
      }

      const parsed = parseCardsContent(textContent);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Cards file did not contain any cards.');
      }

      hydrateFromUploadedCards(parsed);
    } catch (error) {
      console.error('Failed to load cards file', error);
      const message = error instanceof Error ? error.message : String(error);
      reportUploadError(`Failed to load cards: ${message}`);
    }
  });

  reader.readAsText(file);
}

uploadInput.addEventListener('change', () => {
  const [file] = uploadInput.files ?? [];
  if (!file) {
    return;
  }

  handleFileSelection(file);
});

fetchCards()
  .then((cards) => {
    cachedCards = cards;
    updateSiteUpdateText(cards.length);
    renderTagFilters(cards);
    applyFilters();
  })
  .catch((error) => {
    cardsContainer.innerHTML = `<p class="error">Failed to load cards: ${String(error)}</p>`;
  });
