import { useNavigate } from 'react-router-dom';

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

function SortableHeader({ label, sortKey, activeKey, order, onSort }) {
  const active = activeKey === sortKey;
  const arrow = active ? (order === 'asc' ? '▲' : '▼') : '↕';
  return (
    <th aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-button" onClick={() => onSort(sortKey)}>
        {label} <span aria-hidden="true">{arrow}</span>
      </button>
    </th>
  );
}

// highlights: { [id]: 'created' | 'updated' | 'deleted' } -> green / blue / red row.
// Sorting is enabled when onSort is provided (Title and Date-time columns).
export default function ReviewTable({
  reviews,
  highlights = {},
  sortKey,
  sortOrder,
  onSort,
  onDelete,
  emptyMessage = 'No reviews yet. Create the first one!',
}) {
  const navigate = useNavigate();

  return (
    <table className="review-table">
      <thead>
        <tr>
          <th>#</th>
          {onSort ? (
            <SortableHeader label="Title" sortKey="title" activeKey={sortKey} order={sortOrder} onSort={onSort} />
          ) : (
            <th>Title</th>
          )}
          <th>Content</th>
          {onSort ? (
            <SortableHeader label="Date-time" sortKey="dateTime" activeKey={sortKey} order={sortOrder} onSort={onSort} />
          ) : (
            <th>Date-time</th>
          )}
          <th>Edit</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        {reviews.length === 0 ? (
          <tr>
            <td colSpan={6} className="empty">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          reviews.map((review, index) => {
            const highlight = highlights[review.id];
            const isDeleted = highlight === 'deleted';
            return (
              <tr key={review.id} className={highlight ? `row-${highlight}` : undefined}>
                <td>{index + 1}</td>
                <td>{review.title}</td>
                <td className="content-cell">{review.content}</td>
                <td>{formatDateTime(review.dateTime)}</td>
                <td>
                  <button
                    type="button"
                    disabled={isDeleted}
                    onClick={() => navigate(`/${review.id}`)}
                  >
                    Edit
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="danger"
                    disabled={isDeleted}
                    onClick={() => onDelete(review)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}