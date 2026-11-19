import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createReview,
  deleteReview,
  getReview,
  getReviews,
  restoreReview,
  updateReview,
} from './api';

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api service', () => {
  it('getReviews GETs the list and unwraps data', async () => {
    fetch.mockResolvedValue(jsonResponse({ success: true, data: [{ id: '1' }] }));
    expect(await getReviews()).toEqual([{ id: '1' }]);
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/reviews$/);
  });

  it('getReview requests a single review by id', async () => {
    fetch.mockResolvedValue(jsonResponse({ success: true, data: { id: 'abc' } }));
    await getReview('abc');
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/reviews\/abc$/);
  });

  it('createReview POSTs the JSON body', async () => {
    fetch.mockResolvedValue(jsonResponse({ success: true, data: { id: '1' } }, 201));
    await createReview({ title: 'a', content: 'b' });
    const [, options] = fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ title: 'a', content: 'b' });
  });

  it('updateReview PUTs to the review url', async () => {
    fetch.mockResolvedValue(jsonResponse({ success: true, data: {} }));
    await updateReview('abc', { title: 'a', content: 'b' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/reviews\/abc$/);
    expect(options.method).toBe('PUT');
  });

  it('deleteReview sends DELETE', async () => {
    fetch.mockResolvedValue(jsonResponse({ success: true, data: { id: 'abc' } }));
    await deleteReview('abc');
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('restoreReview POSTs the full review (id and date-time) to /restore', async () => {
    const review = { id: 'abc', title: 'a', content: 'b', dateTime: '2026-01-01T00:00:00.000Z' };
    fetch.mockResolvedValue(jsonResponse({ success: true, data: review }, 201));
    expect(await restoreReview(review)).toEqual(review);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/reviews\/restore$/);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(review);
  });

  it('throws the server message on an error response', async () => {
    fetch.mockResolvedValue(jsonResponse({ success: false, message: 'Review not found' }, 404));
    await expect(getReview('abc')).rejects.toThrow('Review not found');
  });

  it('throws a generic message when the response is not JSON', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });
    await expect(getReviews()).rejects.toThrow('Request failed (500)');
  });

  it('propagates network failures', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getReviews()).rejects.toThrow('Failed to fetch');
  });
});