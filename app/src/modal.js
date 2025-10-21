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

function createFormattedFragment(text) {
  const fragment = document.createDocumentFragment();
  if (!text) {
    return fragment;
  }

  const pattern = /(\*\*[^*]+?\*\*|__[^_]+?__|\*[^*]+?\*|_[^_]+?_|`[^`]+?`)/g;

  let lastIndex = 0;
  let match = pattern.exec(text);
  while (match) {
    const { index } = match;
    if (index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
    }

    const token = match[0];
    let element = null;
    let content = '';

    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      content = token.slice(2, -2);
      element = document.createElement('strong');
    } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      content = token.slice(1, -1);
      element = document.createElement('em');
    } else if (token.startsWith('`') && token.endsWith('`')) {
      content = token.slice(1, -1);
      element = document.createElement('code');
    }

    if (element) {
      element.textContent = content;
      fragment.appendChild(element);
    } else {
      fragment.appendChild(document.createTextNode(token));
    }

    lastIndex = pattern.lastIndex;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  return fragment;
}

function appendFormattedText(target, text) {
  if (!target) {
    return;
  }

  const safeText = typeof text === 'string' ? text : '';
  if (!safeText) {
    return;
  }

  target.appendChild(createFormattedFragment(safeText));
}

function appendMarkdownDetails(target, text) {
  if (!target || typeof text !== 'string' || text.trim() === '') {
    return false;
  }

  const fragment = document.createDocumentFragment();
  const lines = text.split(/\r?\n/);

  let currentList = null;
  let paragraphBuffer = [];

  const flushList = () => {
    if (currentList && currentList.children.length > 0) {
      fragment.appendChild(currentList);
    }
    currentList = null;
  };

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return;
    }
    const paragraph = document.createElement('p');
    appendFormattedText(paragraph, paragraphBuffer.join(' '));
    fragment.appendChild(paragraph);
    paragraphBuffer = [];
  };

  lines.forEach((rawLine) => {
    const line = typeof rawLine === 'string' ? rawLine.trim() : '';
    if (!line) {
      flushList();
      flushParagraph();
      return;
    }

    if (/^%%.*%%$/.test(line)) {
      return;
    }

    if (/^---+$/.test(line)) {
      flushList();
      flushParagraph();
      return;
    }

    const listMatch = line.match(/^[-*+]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      if (!currentList) {
        currentList = document.createElement('ul');
        currentList.className = 'modal__list';
      }
      const listItemText = listMatch[1].trim();
      if (listItemText) {
        const listItem = document.createElement('li');
        appendFormattedText(listItem, listItemText);
        currentList.appendChild(listItem);
      }
      return;
    }

    flushList();
    paragraphBuffer.push(line);
  });

  flushList();
  flushParagraph();

  if (fragment.childNodes.length === 0) {
    return false;
  }

  target.appendChild(fragment);
  return true;
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

      content.textContent = '';
      if (Array.isArray(card.details)) {
        const items = card.details
          .map((item) => {
            if (item == null) {
              return '';
            }
            const text = typeof item === 'string' ? item : String(item);
            return text.trim();
          })
          .filter(Boolean);
        if (items.length > 0) {
          const list = document.createElement('ul');
          list.className = 'modal__list';
          items.forEach((item) => {
            const listItem = document.createElement('li');
            appendFormattedText(listItem, item);
            list.appendChild(listItem);
          });
          content.appendChild(list);
        } else {
          const fallbackText = detailsTextForFallback
            || (summaryTextCandidate ?? '');
          appendFormattedText(content, fallbackText);
        }
      } else {
        const detailsText = detailsTextForFallback || summaryTextCandidate || '';
        const renderedMarkdown = appendMarkdownDetails(content, detailsText);
        if (!renderedMarkdown) {
          appendFormattedText(content, detailsText);
        }
      }
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
