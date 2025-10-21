import { describe, expect, it } from 'vitest';
import { createModalController } from '../src/modal.js';

describe('modal controller', () => {
  it('renders list items when details is an array', () => {
    const root = document.createElement('div');
    const controller = createModalController(root);

    controller.init();
    controller.open({
      title: 'Example title',
      summary: '',
      details: ['First detail', 'Second detail'],
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
