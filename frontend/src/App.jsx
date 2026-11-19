import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReviewsProvider from './context/ReviewsProvider';
import ReviewsPage from './pages/ReviewsPage';
import NewReviewPage from './pages/NewReviewPage';
import EditReviewPage from './pages/EditReviewPage';

export default function App() {
  return (
    <BrowserRouter>
      <ReviewsProvider>
        <Routes>
          <Route path="/" element={<ReviewsPage />} />
          {/* /new must be declared before /:id so "new" is not treated as an id */}
          <Route path="/new" element={<NewReviewPage />} />
          <Route path="/:id" element={<EditReviewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ReviewsProvider>
    </BrowserRouter>
  );
}