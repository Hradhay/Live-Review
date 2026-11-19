import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Shared by the New and Edit pages.
// Props: initialValues, onSubmit({title, content}), onDelete (edit mode only), submitting, error
export default function ReviewForm({
  initialValues = { title: '', content: '' },
  onSubmit,
  onDelete,
  submitting = false,
  error = '',
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialValues.title);
  const [content, setContent] = useState(initialValues.content);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ title: title.trim(), content: content.trim() });
  };

  const handleReset = () => {
    setTitle('');
    setContent('');
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}

      <label htmlFor="title">Title</label>
      <input
        id="title"
        type="text"
        value={title}
        maxLength={100}
        required
        onChange={(e) => setTitle(e.target.value)}
      />

      <label htmlFor="content">Content</label>
      <textarea
        id="content"
        rows={8}
        value={content}
        maxLength={2000}
        required
        onChange={(e) => setContent(e.target.value)}
      />

      <div className="form-actions">
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
        <button type="button" onClick={() => navigate('/')}>
          Cancel
        </button>
        {onDelete && (
          <button type="button" className="danger" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}