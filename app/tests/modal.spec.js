import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { createModalController } from '../src/modal.js';

describe('modal controller', () => {
  beforeEach(() => {
    globalThis.marked = {
      parse(markdown) {
        if (typeof markdown !== 'string' || !markdown.trim()) {
          return '';
        }

        const items = markdown
          .split('\n')
          .map((line) => line.replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, '').trim())
          .filter(Boolean);

        if (items.length === 0) {
          return '';
        }

        const renderedItems = items.map((item) => `<li>${item}</li>`).join('');
        return `<ul>${renderedItems}</ul>`;
      },
      setOptions: () => {},
    };
  });

  afterEach(() => {
    delete globalThis.marked;
  });

  it('renders list items when details is an array', async () => {
    const root = document.createElement('div');
    const controller = createModalController(root);

    controller.init();
    controller.open({
      title: 'Example title',
      summary: '',
      details: ['First detail', 'Second detail'],
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    const content = root.querySelector('.modal__content');
    const list = content?.querySelector('ul.modal__list');
    expect(list).not.toBeNull();

    const items = list?.querySelectorAll('li') ?? [];
    expect(items.length).toBe(2);
    expect(items[0]?.textContent).toBe('First detail');
    expect(items[1]?.textContent).toBe('Second detail');
  });
});
