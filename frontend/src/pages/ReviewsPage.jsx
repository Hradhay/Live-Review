import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReviewTable from '../components/ReviewTable';
import { useReviews } from '../hooks/useReviews';
import { DEFAULT_SORT, applyView, nextSort } from '../utils/reviewList';

export default function ReviewsPage() {
  const { reviews, highlights, loading, error, deleteWithUndo } = useReviews();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(DEFAULT_SORT);

  const visible = useMemo(() => applyView(reviews, { query, sort }), [reviews, query, sort]);
  const searching = query.trim() !== '';

  const emptyMessage =
    reviews.length === 0
      ? 'No reviews yet. Create the first one!'
      : `No reviews match "${query.trim()}".`;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Live Reviews</h1>
        <Link to="/new" className="button primary">
          Create New Review
        </Link>
      </header>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Search title or content..."
          aria-label="Search reviews"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {searching && (
          <>
            <button type="button" onClick={() => setQuery('')}>
              Clear
            </button>
            <span className="result-count">
              {visible.length} of {reviews.length}
            </span>
          </>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ReviewTable
          reviews={visible}
          highlights={highlights}
          sortKey={sort.key}
          sortOrder={sort.order}
          onSort={(key) => setSort((current) => nextSort(current, key))}
          onDelete={deleteWithUndo}
          emptyMessage={emptyMessage}
        />
      )}
    </div>
  );
}