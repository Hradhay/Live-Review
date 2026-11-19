import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewsProvider from './ReviewsProvider';
import { useReviews } from '../hooks/useReviews';
import socket from '../services/socket';
import * as api from '../services/api';

// A fake socket: tests push "server" events through emitFromServer.
vi.mock('../services/socket', () => {
  const handlers = {};
  return {
    default: {
      on: (event, handler) => {
        (handlers[event] ||= new Set()).add(handler);
      },
      off: (event, handler) => handlers[event]?.delete(handler),
      io: { on: () => {}, off: () => {} },
      emitFromServer: (event, payload) => handlers[event]?.forEach((h) => h(payload)),
    },
  };
});
vi.mock('../services/api', () => ({
  getReviews: vi.fn(),
  deleteReview: vi.fn(),
  restoreReview: vi.fn(),
}));

const r1 = { id: 'r1', title: 'One', content: 'first', dateTime: '2026-01-01T10:00:00Z' };
const r2 = { id: 'r2', title: 'Two', content: 'second', dateTime: '2026-01-02T10:00:00Z' };

function Probe() {
  const { reviews, highlights, loading, error, deleteWithUndo } = useReviews();
  return (
    <div>
      {loading && <p>loading</p>}
      {error && <p>error: {error}</p>}
      <ul>
        {reviews.map((r) => (
          <li key={r.id} data-testid={r.id} data-highlight={highlights[r.id] || ''}>
            {r.title}
            <button type="button" onClick={() => deleteWithUndo(r)}>
              delete-{r.id}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function setup(initial = [r1]) {
  api.getReviews.mockResolvedValue(initial);
  render(
    <ReviewsProvider>
      <Probe />
    </ReviewsProvider>
  );
  await act(async () => {});
}

const serverEmit = (event, payload) => act(() => socket.emitFromServer(event, payload));
const advance = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));
const row = (id) => screen.queryByTestId(id);

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
});
afterEach(() => vi.useRealTimers());

describe('ReviewsProvider: loading', () => {
  it('loads the reviews on mount', async () => {
    await setup([r1, r2]);
    expect(row('r1')).toBeTruthy();
    expect(row('r2')).toBeTruthy();
    expect(screen.queryByText('loading')).toBeNull();
  });

  it('surfaces a load error', async () => {
    api.getReviews.mockRejectedValue(new Error('Failed to fetch'));
    render(
      <ReviewsProvider>
        <Probe />
      </ReviewsProvider>
    );
    await act(async () => {});
    expect(screen.getByText('error: Failed to fetch')).toBeTruthy();
  });
});

describe('ReviewsProvider: event highlighting (3 seconds)', () => {
  it('review:created adds the row and highlights it green for 3s', async () => {
    await setup([r1]);
    await serverEmit('review:created', r2);
    expect(row('r2').dataset.highlight).toBe('created');
    await advance(2999);
    expect(row('r2').dataset.highlight).toBe('created');
    await advance(1);
    expect(row('r2').dataset.highlight).toBe('');
    expect(row('r2')).toBeTruthy(); // the row stays, only the colour goes
  });

  it('review:updated replaces the row and highlights it blue for 3s', async () => {
    await setup([r1]);
    await serverEmit('review:updated', { ...r1, title: 'One edited' });
    expect(row('r1').textContent).toContain('One edited');
    expect(row('r1').dataset.highlight).toBe('updated');
    await advance(3000);
    expect(row('r1').dataset.highlight).toBe('');
  });

  it('review:deleted keeps the row red for 3s, then removes it', async () => {
    await setup([r1, r2]);
    await serverEmit('review:deleted', { id: 'r1' });
    expect(row('r1').dataset.highlight).toBe('deleted');
    await advance(2999);
    expect(row('r1')).toBeTruthy();
    await advance(1);
    expect(row('r1')).toBeNull();
    expect(row('r2')).toBeTruthy();
  });

  it('a newer event restarts the 3s window instead of clearing early', async () => {
    await setup([r1]);
    await serverEmit('review:updated', { ...r1, title: 'v2' });
    await advance(2000);
    await serverEmit('review:updated', { ...r1, title: 'v3' });
    await advance(2000);
    expect(row('r1').dataset.highlight).toBe('updated');
    await advance(1000);
    expect(row('r1').dataset.highlight).toBe('');
  });

  it('a duplicate created event does not duplicate the row', async () => {
    await setup([r1]);
    await serverEmit('review:created', r2);
    await serverEmit('review:created', r2);
    expect(screen.getAllByTestId('r2').length).toBe(1);
  });
});

describe('ReviewsProvider: delete snackbar and undo', () => {
  async function deleteR1() {
    await setup([r1, r2]);
    api.deleteReview.mockResolvedValue({ id: 'r1' });
    await act(async () => fireEvent.click(screen.getByText('delete-r1')));
  }

  it('calls the API, shows the success snackbar and marks the row red', async () => {
    await deleteR1();
    expect(api.deleteReview).toHaveBeenCalledWith('r1');
    expect(screen.getByRole('status').textContent).toContain('Review deleted successfully');
    expect(row('r1').dataset.highlight).toBe('deleted');
  });

  it('removes the row after 3s but keeps the snackbar until 5s', async () => {
    await deleteR1();
    await advance(3000);
    expect(row('r1')).toBeNull();
    expect(screen.queryByRole('status')).not.toBeNull();
    await advance(1999);
    expect(screen.queryByRole('status')).not.toBeNull();
    await advance(1);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('Undo after the row is gone restores it through the API (green)', async () => {
    await deleteR1();
    await advance(3000);
    api.restoreReview.mockResolvedValue(r1);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Undo' })));
    expect(api.restoreReview).toHaveBeenCalledWith(r1);
    expect(row('r1')).toBeTruthy();
    expect(row('r1').dataset.highlight).toBe('created');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('Undo while the row is still red cancels the removal', async () => {
    await deleteR1();
    await advance(1000);
    api.restoreReview.mockResolvedValue(r1);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Undo' })));
    await advance(3500);
    expect(row('r1')).toBeTruthy();
    expect(row('r1').dataset.highlight).toBe('');
  });

  it('shows an error toast without Undo when the delete fails, and keeps the row', async () => {
    await setup([r1]);
    api.deleteReview.mockRejectedValue(new Error('Review not found'));
    await act(async () => fireEvent.click(screen.getByText('delete-r1')));
    expect(screen.getByRole('status').textContent).toContain('Could not delete review: Review not found');
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(row('r1').dataset.highlight).toBe('');
  });

  it('shows an error toast when Undo fails', async () => {
    await deleteR1();
    api.restoreReview.mockRejectedValue(new Error('Review already exists'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Undo' })));
    expect(screen.getByRole('status').textContent).toContain('Could not restore review: Review already exists');
  });
});