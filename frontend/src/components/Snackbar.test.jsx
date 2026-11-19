import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Snackbar from './Snackbar';

const review = { id: 'r1', title: 'A', content: 'B', dateTime: '2026-01-01T00:00:00Z' };
const success = { type: 'success', message: 'Review deleted successfully', review };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Snackbar', () => {
  it('renders nothing without a toast', () => {
    const { container } = render(<Snackbar toast={null} onUndo={() => {}} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the message and an Undo button for a successful delete', () => {
    render(<Snackbar toast={success} onUndo={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('status').textContent).toContain('Review deleted successfully');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
  });

  it('calls onUndo when Undo is clicked', () => {
    const onUndo = vi.fn();
    render(<Snackbar toast={success} onUndo={onUndo} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('has no Undo button on an error toast', () => {
    render(<Snackbar toast={{ type: 'error', message: 'Nope' }} onUndo={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('closes itself after 5 seconds, not before', () => {
    const onClose = vi.fn();
    render(<Snackbar toast={success} onUndo={() => {}} onClose={onClose} />);
    act(() => vi.advanceTimersByTime(4999));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restarts the timer when a new toast replaces the old one', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Snackbar toast={success} onUndo={() => {}} onClose={onClose} />);
    act(() => vi.advanceTimersByTime(3000));
    rerender(<Snackbar toast={{ ...success }} onUndo={() => {}} onClose={onClose} />);
    act(() => vi.advanceTimersByTime(3000));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2000));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('can be dismissed manually', () => {
    const onClose = vi.fn();
    render(<Snackbar toast={success} onUndo={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});