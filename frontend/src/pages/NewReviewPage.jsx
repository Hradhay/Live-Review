import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReviewForm from '../components/ReviewForm';
import { createReview } from '../services/api';

export default function NewReviewPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setError('');
    try {
      await createReview(values);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <h1>New Review</h1>
      <ReviewForm onSubmit={handleSubmit} submitting={submitting} error={error} />
    </div>
  );
}