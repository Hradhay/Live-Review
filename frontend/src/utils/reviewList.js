export const DEFAULT_SORT = { key: 'dateTime', order: 'desc' };

// Every whitespace-separated term must appear in the title or the content
// (case-insensitive). An empty query returns the list unchanged.
export function filterReviews(reviews, query) {
  const terms = (query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return reviews;
  return reviews.filter((review) => {
    const haystack = `${review.title} ${review.content}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

// Returns a sorted copy. key: 'title' | 'dateTime', order: 'asc' | 'desc'.
// Ties fall back to newest first, then id, so the order is always stable.
export function sortReviews(reviews, key, order) {
  const direction = order === 'asc' ? 1 : -1;
  return [...reviews].sort((a, b) => {
    const primary =
      key === 'title'
        ? a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })
        : new Date(a.dateTime) - new Date(b.dateTime);
    if (primary !== 0) return primary * direction;
    return new Date(b.dateTime) - new Date(a.dateTime) || a.id.localeCompare(b.id);
  });
}

// What the table shows: search first, then sort.
export function applyView(reviews, { query, sort }) {
  return sortReviews(filterReviews(reviews, query), sort.key, sort.order);
}

// Clicking the active column flips its direction; a new column starts with
// its natural direction (title A-Z, date newest first).
export function nextSort(current, key) {
  if (current.key === key) {
    return { key, order: current.order === 'asc' ? 'desc' : 'asc' };
  }
  return { key, order: key === 'title' ? 'asc' : 'desc' };
}