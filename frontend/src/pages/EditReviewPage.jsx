import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReviewForm from '../components/ReviewForm';
import { useReviews } from '../hooks/useReviews';
import { getReview, updateReview } from '../services/api';
import socket from '../services/socket';

export default function EditReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deleteWithUndo } = useReviews();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    getReview(id)
      .then((data) => active && setReview(data))
      .catch((err) => {
        if (!active) return;
        setNotFound(true);
        setError(err.message);
      })
      .finally(() => active && setLoading(false));

    // If someone else deletes this review while it is open, leave the page.
    const onDeleted = ({ id: deletedId }) => {
      if (deletedId === id) navigate('/');
    };
    socket.on('review:deleted', onDeleted);

    return () => {
      active = false;
      socket.off('review:deleted', onDeleted);
    };
  }, [id, navigate]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setError('');
    try {
      await updateReview(id, values);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  // Deleting shows the snackbar with Undo (on the list page), so no confirm dialog.
  const handleDelete = async () => {
    const deleted = await deleteWithUndo(review);
    if (deleted) navigate('/');
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;

  if (notFound) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <Link to="/">Back to reviews</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Edit Review</h1>
      <ReviewForm
        initialValues={{ title: review.title, content: review.content }}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}