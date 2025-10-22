let markedPromise = null;

function resolveMarkedInstance() {
  if (markedPromise) {
    return markedPromise;
  }

  markedPromise = (async () => {
    const existing = globalThis.marked;
    if (existing && typeof existing.parse === 'function') {
      return existing;
    }

    const module = await import('marked');
    const candidate = module.marked ?? module.default ?? module;
    if (!candidate || typeof candidate.parse !== 'function') {
      throw new Error('Unable to load marked parser');
    }

    return candidate;
  })()
    .then((instance) => {
      if (typeof instance.setOptions === 'function') {
        instance.setOptions({
          breaks: true,
          gfm: true,
        });
      }
      return instance;
    })
    .catch((error) => {
      markedPromise = null;
      throw error;
    });

  return markedPromise;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input[type="text"]:not([disabled])',
  'input[type="search"]:not([disabled])',
  'input[type="radio"]:not([disabled])',
  'input[type="checkbox"]:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
]
  .map((selector) => `${selector}:not([aria-hidden="true"])`)
  .join(',');

function normalizeToText(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null) {
          return '';
        }
        const text = typeof item === 'string' ? item : String(item);
        return text.trim();
      })
      .filter(Boolean)
      .join(', ');
  }

  return '';
}

function renderMarkdown(target, markdown) {
  if (!target) {
    return Promise.resolve(false);
  }

  const text = typeof markdown === 'string' ? markdown.trim() : '';
  if (!text) {
    return Promise.resolve(false);
  }

  return resolveMarkedInstance()
    .then((instance) => {
      const parser = typeof instance.parse === 'function' ? instance.parse.bind(instance) : null;
      const html = parser ? parser(text) : '';
      if (!html) {
        return false;
      }

      target.innerHTML = html;
      target.querySelectorAll('ul').forEach((list) => {
        list.classList.add('modal__list');
      });
      return true;
    })
    .catch((error) => {
      console.error('Failed to render markdown content', error);
      return false;
    });
}

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null,
  );
}

export function createModalController(root) {
  if (!root) {
    throw new Error('Modal root element is required');
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay is-hidden';
  overlay.setAttribute('role', 'presentation');

  const dialog = document.createElement('div');
  dialog.className = 'modal';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-hidden', 'true');

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'modal__close';
  closeButton.setAttribute('aria-label', 'Close dialog');
  closeButton.innerHTML = '&times;';

  const title = document.createElement('h2');
  title.className = 'modal__title';
  const titleId = 'idea-modal-title';
  title.id = titleId;
  dialog.setAttribute('aria-labelledby', titleId);

  const description = document.createElement('p');
  description.className = 'modal__description';
  const descriptionId = 'idea-modal-summary';
  description.id = descriptionId;
  description.hidden = true;

  const figure = document.createElement('figure');
  figure.className = 'modal__figure';
  figure.hidden = true;

  const image = document.createElement('img');
  image.className = 'modal__image';
  image.loading = 'lazy';
  image.decoding = 'async';
  figure.appendChild(image);

  const content = document.createElement('div');
  content.className = 'modal__content';
  const contentId = 'idea-modal-details';
  content.id = contentId;
  dialog.setAttribute('aria-describedby', contentId);

  dialog.appendChild(closeButton);
  dialog.appendChild(title);
  dialog.appendChild(description);
  dialog.appendChild(figure);
  dialog.appendChild(content);
  overlay.appendChild(dialog);

  root.appendChild(overlay);

  let lastFocusedElement = null;

  function closeModal() {
    overlay.classList.add('is-hidden');
    dialog.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', handleKeyDown, true);
    overlay.removeEventListener('click', handleOverlayClick, true);
    dialog.style.background = '';
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  function handleOverlayClick(event) {
    if (event.target === overlay) {
      closeModal();
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      closeModal();
      return;
    }

    if (event.key === 'Tab') {
      const focusables = getFocusableElements(dialog);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const focusedIndex = focusables.indexOf(document.activeElement);
      const atStart = focusedIndex === 0;
      const atEnd = focusedIndex === focusables.length - 1;
      const goingBackward = event.shiftKey;

      if (goingBackward && (focusedIndex <= 0 || document.activeElement === dialog)) {
        focusables[focusables.length - 1].focus();
        event.preventDefault();
        return;
      }

      if (!goingBackward && (atEnd || document.activeElement === dialog)) {
        focusables[0].focus();
        event.preventDefault();
      }
    }
  }

  closeButton.addEventListener('click', closeModal);

  return {
    init() {
      // Reserved for future enhancements
    },
    open(card) {
      if (!card) {
        return;
      }

      lastFocusedElement = document.activeElement;

      const detailsTextForFallback = normalizeToText(card.details);
      const titleText = (card.fullTitle && card.fullTitle.trim())
        || (card.title && card.title.trim())
        || (card.summary && card.summary.trim())
        || detailsTextForFallback
        || 'Idea details';
      title.textContent = titleText;

      const summaryTextCandidate = card.summary && card.summary.trim();
      const summaryText = summaryTextCandidate && detailsTextForFallback && summaryTextCandidate !== detailsTextForFallback
        ? summaryTextCandidate
        : '';
      if (summaryText) {
        description.textContent = summaryText;
        description.hidden = false;
        dialog.setAttribute('aria-describedby', `${descriptionId} ${contentId}`);
      } else {
        description.textContent = '';
        description.hidden = true;
        dialog.setAttribute('aria-describedby', contentId);
      }

      if (card.image && card.image.src) {
        const altText = (card.image.alt && card.image.alt.trim()) || titleText || 'Idea illustration';
        image.src = card.image.src;
        image.alt = altText;
        figure.hidden = false;
      } else {
        image.removeAttribute('src');
        image.alt = '';
        figure.hidden = true;
      }

      content.innerHTML = '';
      content.hidden = true;

      const listItems = Array.isArray(card.details)
        ? card.details
          .map((item) => {
            if (item == null) {
              return '';
            }
            const text = typeof item === 'string' ? item : String(item);
            return text.trim();
          })
          .filter(Boolean)
        : [];

      let markdownSource = '';
      if (listItems.length > 0) {
        markdownSource = listItems
          .map((item) => {
            if (/^\s*(?:[-*+]\s+|\d+\.\s+)/.test(item)) {
              return item;
            }
            return `- ${item}`;
          })
          .join('\n');
      } else {
        const rawDetails = typeof card.details === 'string' ? card.details : '';
        markdownSource = rawDetails.trim()
          || detailsTextForFallback
          || summaryTextCandidate
          || '';
      }

      const fallbackText = markdownSource || detailsTextForFallback || summaryTextCandidate || '';

      renderMarkdown(content, markdownSource)
        .then((rendered) => {
          if (rendered) {
            content.hidden = false;
            return;
          }

          if (fallbackText) {
            content.textContent = fallbackText;
            content.hidden = false;
          }
        })
        .catch(() => {
          if (fallbackText) {
            content.textContent = fallbackText;
            content.hidden = false;
          }
        });

      if (card.backgroundColor) {
        dialog.style.background = card.backgroundColor;
      } else {
        dialog.style.background = '';
      }

      overlay.classList.remove('is-hidden');
      dialog.setAttribute('aria-hidden', 'false');

      setTimeout(() => {
        const focusables = getFocusableElements(dialog);
        const target = focusables.find((item) => item !== closeButton) ?? closeButton;
        (target ?? closeButton).focus();
      }, 0);

      document.addEventListener('keydown', handleKeyDown, true);
      overlay.addEventListener('click', handleOverlayClick, true);
    },
    close: closeModal,
  };
}
