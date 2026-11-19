import { useEffect } from 'react';
import { SNACKBAR_MS } from '../constants';

// toast: { type: 'success' | 'error', message, review? } or null.
// Hides itself after `duration` ms. A new toast object restarts the timer.
// `onClose` should be a stable function (useCallback) so the timer is not reset on re-render.
export default function Snackbar({ toast, onUndo, onClose, duration = SNACKBAR_MS }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [toast, duration, onClose]);

  if (!toast) return null;

  return (
    <div className={`snackbar snackbar-${toast.type}`} role="status" aria-live="polite">
      <span className="snackbar-message">{toast.message}</span>
      {toast.type === 'success' && toast.review && (
        <button type="button" className="snackbar-action" onClick={onUndo}>
          Undo
        </button>
      )}
      <button type="button" className="snackbar-close" aria-label="Dismiss" onClick={onClose}>
        ×
      </button>
    </div>
  );
}