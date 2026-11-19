import { describe, expect, it } from 'vitest';
import { DEFAULT_SORT, applyView, filterReviews, nextSort, sortReviews } from './reviewList';

const reviews = [
  { id: 'a', title: 'Banana bread', content: 'Sweet and soft', dateTime: '2026-01-03T10:00:00Z' },
  { id: 'b', title: 'apple pie', content: 'Warm with cinnamon', dateTime: '2026-01-01T10:00:00Z' },
  { id: 'c', title: 'Cherry tart', content: 'Tastes like banana?', dateTime: '2026-01-02T10:00:00Z' },
];
const ids = (list) => list.map((r) => r.id);

describe('filterReviews', () => {
  it('returns the same list for an empty or whitespace query', () => {
    expect(filterReviews(reviews, '')).toBe(reviews);
    expect(filterReviews(reviews, '   ')).toBe(reviews);
    expect(filterReviews(reviews, undefined)).toBe(reviews);
  });

  it('matches title and content, case-insensitively', () => {
    expect(ids(filterReviews(reviews, 'BANANA'))).toEqual(['a', 'c']);
    expect(ids(filterReviews(reviews, 'cinnamon'))).toEqual(['b']);
  });

  it('requires every term to match (title and content combined)', () => {
    expect(ids(filterReviews(reviews, 'banana tastes'))).toEqual(['c']);
    expect(ids(filterReviews(reviews, 'banana  soft'))).toEqual(['a']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterReviews(reviews, 'zzz')).toEqual([]);
  });
});

describe('sortReviews', () => {
  it('sorts by title ascending, ignoring case', () => {
    expect(ids(sortReviews(reviews, 'title', 'asc'))).toEqual(['b', 'a', 'c']);
  });

  it('sorts by title descending', () => {
    expect(ids(sortReviews(reviews, 'title', 'desc'))).toEqual(['c', 'a', 'b']);
  });

  it('sorts numbers inside titles naturally', () => {
    const list = [
      { id: '1', title: 'Review 10', content: '', dateTime: '2026-01-01T00:00:00Z' },
      { id: '2', title: 'Review 2', content: '', dateTime: '2026-01-02T00:00:00Z' },
    ];
    expect(ids(sortReviews(list, 'title', 'asc'))).toEqual(['2', '1']);
  });

  it('sorts by date-time in both directions', () => {
    expect(ids(sortReviews(reviews, 'dateTime', 'asc'))).toEqual(['b', 'c', 'a']);
    expect(ids(sortReviews(reviews, 'dateTime', 'desc'))).toEqual(['a', 'c', 'b']);
  });

  it('breaks ties deterministically (newest first, then id)', () => {
    const list = [
      { id: 'x', title: 'Same', content: '', dateTime: '2026-01-01T00:00:00Z' },
      { id: 'y', title: 'Same', content: '', dateTime: '2026-01-02T00:00:00Z' },
    ];
    expect(ids(sortReviews(list, 'title', 'asc'))).toEqual(['y', 'x']);
    expect(ids(sortReviews(list, 'title', 'desc'))).toEqual(['y', 'x']);
  });

  it('does not mutate the input array', () => {
    const copy = [...reviews];
    sortReviews(reviews, 'title', 'asc');
    expect(reviews).toEqual(copy);
  });
});

describe('applyView', () => {
  it('filters first, then sorts', () => {
    const result = applyView(reviews, { query: 'banana', sort: { key: 'title', order: 'desc' } });
    expect(ids(result)).toEqual(['c', 'a']);
  });

  it('default sort is newest first', () => {
    expect(ids(applyView(reviews, { query: '', sort: DEFAULT_SORT }))).toEqual(['a', 'c', 'b']);
  });
});

describe('nextSort', () => {
  it('flips the direction when the active column is clicked again', () => {
    expect(nextSort({ key: 'title', order: 'asc' }, 'title')).toEqual({ key: 'title', order: 'desc' });
    expect(nextSort({ key: 'title', order: 'desc' }, 'title')).toEqual({ key: 'title', order: 'asc' });
  });

  it('starts a new column with its natural direction', () => {
    expect(nextSort(DEFAULT_SORT, 'title')).toEqual({ key: 'title', order: 'asc' });
    expect(nextSort({ key: 'title', order: 'asc' }, 'dateTime')).toEqual({ key: 'dateTime', order: 'desc' });
  });
});