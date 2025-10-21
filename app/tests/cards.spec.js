import { vi } from 'vitest';
import { renderCardGrid } from '../src/cards.js';

describe('renderCardGrid', () => {
  it('shows the empty state when no cards are provided', () => {
    const container = document.createElement('div');

    renderCardGrid({ container, cards: [], onSelect: () => {} });

    const empty = container.querySelector('.empty-state');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain('No matching ideas yet');
  });

  it('renders cards and wires up the select handler', () => {
    const container = document.createElement('div');
    const handler = vi.fn();

    renderCardGrid({
      container,
      cards: [
        {
          id: 'card-test',
          title: 'Test Card',
          summary: 'Summary',
          details: 'Details',
          tags: ['tag-a'],
          image: null,
        },
      ],
      onSelect: handler,
    });

    const button = container.querySelector('button.card__action');
    expect(button).not.toBeNull();

    button?.dispatchEvent(new window.Event('click'));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'card-test' }),
    );
  });
});
