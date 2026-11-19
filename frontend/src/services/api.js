export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}/api/reviews${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response; fall through to the generic error below
  }

  if (!res.ok || !body?.success) {
    throw new Error(body?.message || `Request failed (${res.status})`);
  }
  return body.data;
}

export const getReviews = () => request('');
export const getReview = (id) => request(`/${id}`);
export const createReview = (review) =>
  request('', { method: 'POST', body: JSON.stringify(review) });
export const updateReview = (id, review) =>
  request(`/${id}`, { method: 'PUT', body: JSON.stringify(review) });
export const deleteReview = (id) => request(`/${id}`, { method: 'DELETE' });