import { useNavigate } from 'react-router-dom';

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

export default function ReviewTable({ reviews, onDelete }) {
  const navigate = useNavigate();

  return (
    <table className="review-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Title</th>
          <th>Content</th>
          <th>Date-time</th>
          <th>Edit</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        {reviews.length === 0 ? (
          <tr>
            <td colSpan={6} className="empty">
              No reviews yet. Create the first one!
            </td>
          </tr>
        ) : (
          reviews.map((review, index) => (
            <tr key={review.id}>
              <td>{index + 1}</td>
              <td>{review.title}</td>
              <td className="content-cell">{review.content}</td>
              <td>{formatDateTime(review.dateTime)}</td>
              <td>
                <button type="button" onClick={() => navigate(`/${review.id}`)}>
                  Edit
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className="danger"
                  onClick={() => onDelete(review.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}