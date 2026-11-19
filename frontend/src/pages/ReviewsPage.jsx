import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReviewTable from '../components/ReviewTable';
import { getReviews, deleteReview } from '../services/api';
import socket from '../services/socket';

const byLatest = (a, b) => new Date(b.dateTime) - new Date(a.dateTime);

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = () =>
      getReviews()
        .then((data) => {
          if (active) {
            setReviews(data);
            setError('');
          }
        })
        .catch((err) => active && setError(err.message))
        .finally(() => active && setLoading(false));

    load();

    // Live updates: functional setState keeps these handlers free of stale data.
    const onCreated = (review) =>
      setReviews((prev) =>
        prev.some((r) => r.id === review.id) ? prev : [review, ...prev].sort(byLatest)
      );
    const onUpdated = (review) =>
      setReviews((prev) =>
        prev.some((r) => r.id === review.id)
          ? prev.map((r) => (r.id === review.id ? review : r)).sort(byLatest)
          : [review, ...prev].sort(byLatest)
      );
    const onDeleted = ({ id }) => setReviews((prev) => prev.filter((r) => r.id !== id));

    socket.on('review:created', onCreated);
    socket.on('review:updated', onUpdated);
    socket.on('review:deleted', onDeleted);
    // Re-sync after a dropped connection so nothing is missed.
    socket.io.on('reconnect', load);

    return () => {
      active = false;
      socket.off('review:created', onCreated);
      socket.off('review:updated', onUpdated);
      socket.off('review:deleted', onDeleted);
      socket.io.off('reconnect', load);
    };
  }, []);

  // The table updates from the review:deleted socket event, not from this call.
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await deleteReview(id);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Live Reviews</h1>
        <Link to="/new" className="button primary">
          Create New Review
        </Link>
      </header>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ReviewTable reviews={reviews} onDelete={handleDelete} />
      )}
    </div>
  );
}