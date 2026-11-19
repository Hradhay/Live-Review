import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReviewsContext } from './reviewsContext';
import Snackbar from '../components/Snackbar';
import { HIGHLIGHT_MS } from '../constants';
import { getReviews, deleteReview, restoreReview } from '../services/api';
import socket from '../services/socket';

const upsert = (list, review) =>
  list.some((r) => r.id === review.id)
    ? list.map((r) => (r.id === review.id ? review : r))
    : [review, ...list];

// Owns the reviews list, the row highlights and the delete snackbar for the whole app.
// It lives above the router so socket events are handled (and highlights keep running)
// even while the user is on the New / Edit pages and gets redirected back to the list.
export default function ReviewsProvider({ children }) {
  const [reviews, setReviews] = useState([]);
  const [highlights, setHighlights] = useState({}); // { [id]: 'created' | 'updated' | 'deleted' }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const timers = useRef(new Map());

  // Highlights a row for HIGHLIGHT_MS. A deleted row stays visible (red) for that
  // time and is only removed from the list when the highlight ends. A newer event
  // for the same row (for example Undo) cancels the pending removal.
  const flash = useCallback((id, type) => {
    clearTimeout(timers.current.get(id));
    setHighlights((prev) => ({ ...prev, [id]: type }));
    const timer = setTimeout(() => {
      timers.current.delete(id);
      setHighlights((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (type === 'deleted') setReviews((prev) => prev.filter((r) => r.id !== id));
    }, HIGHLIGHT_MS);
    timers.current.set(id, timer);
  }, []);

  const load = useCallback(async () => {
    try {
      setReviews(await getReviews());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch: load() only sets state after the request resolves (asynchronously).
    // oxlint-disable-next-line react/set-state-in-effect
    load();

    const onCreated = (review) => {
      setReviews((prev) => upsert(prev, review));
      flash(review.id, 'created');
    };
    const onUpdated = (review) => {
      setReviews((prev) => upsert(prev, review));
      flash(review.id, 'updated');
    };
    const onDeleted = ({ id }) => flash(id, 'deleted');

    socket.on('review:created', onCreated);
    socket.on('review:updated', onUpdated);
    socket.on('review:deleted', onDeleted);
    // Re-sync after a dropped connection so no event is missed.
    socket.io.on('reconnect', load);

    const pending = timers.current;
    return () => {
      socket.off('review:created', onCreated);
      socket.off('review:updated', onUpdated);
      socket.off('review:deleted', onDeleted);
      socket.io.off('reconnect', load);
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, [load, flash]);

  const closeToast = useCallback(() => setToast(null), []);

  // Deletes through the API and offers Undo. Returns true when the delete succeeded.
  // The socket event normally drives the UI; flashing here too keeps this tab correct
  // if the socket is briefly disconnected (flash is idempotent).
  const deleteWithUndo = useCallback(
    async (review) => {
      try {
        await deleteReview(review.id);
      } catch (err) {
        setToast({ type: 'error', message: `Could not delete review: ${err.message}` });
        return false;
      }
      flash(review.id, 'deleted');
      setToast({ type: 'success', message: 'Review deleted successfully', review });
      return true;
    },
    [flash]
  );

  // Undo: the backend re-creates the review with its original id and date-time.
  const undoDelete = useCallback(async () => {
    const review = toast?.review;
    if (!review) return;
    setToast(null);
    try {
      const restored = await restoreReview(review);
      setReviews((prev) => upsert(prev, restored));
      flash(restored.id, 'created');
    } catch (err) {
      setToast({ type: 'error', message: `Could not restore review: ${err.message}` });
    }
  }, [toast, flash]);

  const value = useMemo(
    () => ({ reviews, highlights, loading, error, refresh: load, deleteWithUndo }),
    [reviews, highlights, loading, error, load, deleteWithUndo]
  );

  return (
    <ReviewsContext.Provider value={value}>
      {children}
      <Snackbar toast={toast} onUndo={undoDelete} onClose={closeToast} />
    </ReviewsContext.Provider>
  );
}