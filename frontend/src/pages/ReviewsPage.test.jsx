import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewsPage from './ReviewsPage';
import ReviewsProvider from '../context/ReviewsProvider';
import * as api from '../services/api';

vi.mock('../services/socket', () => ({
  default: { on: () => {}, off: () => {}, io: { on: () => {}, off: () => {} } },
}));
vi.mock('../services/api', () => ({
  getReviews: vi.fn(),
  deleteReview: vi.fn(),
  restoreReview: vi.fn(),
}));

const data = [
  { id: '1', title: 'Banana bread', content: 'Sweet and soft', dateTime: '2026-01-03T10:00:00Z' },
  { id: '2', title: 'apple pie', content: 'Warm with cinnamon', dateTime: '2026-01-01T10:00:00Z' },
  { id: '3', title: 'Cherry tart', content: 'Tastes like banana?', dateTime: '2026-01-02T10:00:00Z' },
];

async function renderPage() {
  api.getReviews.mockResolvedValue(data);
  render(
    <MemoryRouter>
      <ReviewsProvider>
        <ReviewsPage />
      </ReviewsProvider>
    </MemoryRouter>
  );
  await act(async () => {});
}

const titles = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.cells[1].textContent);

const search = (value) =>
  fireEvent.change(screen.getByLabelText('Search reviews'), { target: { value } });

beforeEach(() => vi.resetAllMocks());

describe('ReviewsPage', () => {
  it('shows the latest review first by default', async () => {
    await renderPage();
    expect(titles()).toEqual(['Banana bread', 'Cherry tart', 'apple pie']);
  });

  it('has a Create New Review link', async () => {
    await renderPage();
    expect(screen.getByRole('link', { name: 'Create New Review' }).getAttribute('href')).toBe('/new');
  });

  describe('search', () => {
    it('filters by title and content', async () => {
      await renderPage();
      search('banana');
      expect(titles()).toEqual(['Banana bread', 'Cherry tart']);
      search('cinnamon');
      expect(titles()).toEqual(['apple pie']);
    });

    it('keeps the # column sequential for the filtered rows', async () => {
      await renderPage();
      search('banana');
      const numbers = screen.getAllByRole('row').slice(1).map((row) => row.cells[0].textContent);
      expect(numbers).toEqual(['1', '2']);
    });

    it('shows a no-match message and the result count', async () => {
      await renderPage();
      search('zzz');
      expect(screen.getByText('No reviews match "zzz".')).toBeTruthy();
      expect(screen.getByText('0 of 3')).toBeTruthy();
    });

    it('Clear restores the full list', async () => {
      await renderPage();
      search('banana');
      fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
      expect(titles().length).toBe(3);
    });
  });

  describe('sorting', () => {
    it('sorts by title ascending, then descending', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: /title/i }));
      expect(titles()).toEqual(['apple pie', 'Banana bread', 'Cherry tart']);
      fireEvent.click(screen.getByRole('button', { name: /title/i }));
      expect(titles()).toEqual(['Cherry tart', 'Banana bread', 'apple pie']);
    });

    it('sorts by date-time: newest first by default, oldest first on click', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: /date-time/i }));
      expect(titles()).toEqual(['apple pie', 'Cherry tart', 'Banana bread']);
      fireEvent.click(screen.getByRole('button', { name: /date-time/i }));
      expect(titles()).toEqual(['Banana bread', 'Cherry tart', 'apple pie']);
    });

    it('combines search and sorting', async () => {
      await renderPage();
      search('banana');
      fireEvent.click(screen.getByRole('button', { name: /title/i }));
      expect(titles()).toEqual(['Banana bread', 'Cherry tart']);
      fireEvent.click(screen.getByRole('button', { name: /title/i }));
      expect(titles()).toEqual(['Cherry tart', 'Banana bread']);
    });
  });

  it('Delete calls the API and shows the snackbar', async () => {
    await renderPage();
    api.deleteReview.mockResolvedValue({ id: '1' });
    await act(async () => fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]));
    expect(api.deleteReview).toHaveBeenCalledWith('1');
    expect(screen.getByRole('status').textContent).toContain('Review deleted successfully');
  });
});