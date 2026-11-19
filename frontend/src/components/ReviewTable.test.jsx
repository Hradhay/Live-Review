import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ReviewTable from './ReviewTable';

const reviews = [
  { id: 'id-1', title: 'First', content: 'Body one', dateTime: '2026-01-03T10:00:00Z' },
  { id: 'id-2', title: 'Second', content: 'Body two', dateTime: '2026-01-02T10:00:00Z' },
  { id: 'id-3', title: 'Third', content: 'Body three', dateTime: '2026-01-01T10:00:00Z' },
];

function renderTable(props = {}) {
  return render(
    <MemoryRouter>
      <ReviewTable reviews={reviews} onDelete={() => {}} {...props} />
    </MemoryRouter>
  );
}

const bodyRows = () => screen.getAllByRole('row').slice(1);

describe('ReviewTable', () => {
  it('renders the six required columns', () => {
    renderTable();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent.trim());
    expect(headers).toEqual(['#', 'Title', 'Content', 'Date-time', 'Edit', 'Delete']);
  });

  it('shows a static sequential count starting from 1', () => {
    renderTable();
    expect(bodyRows().map((row) => row.cells[0].textContent)).toEqual(['1', '2', '3']);
  });

  it('shows the empty message', () => {
    renderTable({ reviews: [], emptyMessage: 'Nothing here' });
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('highlights created, updated and deleted rows with their colour classes', () => {
    renderTable({ highlights: { 'id-1': 'created', 'id-2': 'updated', 'id-3': 'deleted' } });
    const [first, second, third] = bodyRows();
    expect(first.className).toBe('row-created');
    expect(second.className).toBe('row-updated');
    expect(third.className).toBe('row-deleted');
  });

  it('leaves rows without a highlight unstyled', () => {
    renderTable();
    bodyRows().forEach((row) => expect(row.className).toBe(''));
  });

  it('disables Edit and Delete on a row that is being deleted', () => {
    renderTable({ highlights: { 'id-1': 'deleted' } });
    const [deletedRow, normalRow] = bodyRows();
    expect(deletedRow.querySelectorAll('button:disabled').length).toBe(2);
    expect(normalRow.querySelectorAll('button:disabled').length).toBe(0);
  });

  it('passes the whole review to onDelete', () => {
    const onDelete = vi.fn();
    renderTable({ onDelete });
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
    expect(onDelete).toHaveBeenCalledWith(reviews[1]);
  });

  it('Edit navigates to /:id', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ReviewTable reviews={reviews} onDelete={() => {}} />} />
          <Route path="/:id" element={<p>edit page</p>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[2]);
    expect(screen.getByText('edit page')).toBeTruthy();
  });

  it('makes Title and Date-time sortable and reports the clicked column', () => {
    const onSort = vi.fn();
    renderTable({ onSort, sortKey: 'dateTime', sortOrder: 'desc' });
    fireEvent.click(screen.getByRole('button', { name: /title/i }));
    expect(onSort).toHaveBeenLastCalledWith('title');
    fireEvent.click(screen.getByRole('button', { name: /date-time/i }));
    expect(onSort).toHaveBeenLastCalledWith('dateTime');
  });

  it('exposes the active sort direction via aria-sort', () => {
    renderTable({ onSort: () => {}, sortKey: 'title', sortOrder: 'asc' });
    const [title, dateTime] = screen
      .getAllByRole('columnheader')
      .filter((h) => h.hasAttribute('aria-sort'));
    expect(title.getAttribute('aria-sort')).toBe('ascending');
    expect(dateTime.getAttribute('aria-sort')).toBe('none');
  });

  it('has no sort buttons when onSort is not provided', () => {
    renderTable();
    expect(screen.queryByRole('button', { name: /title/i })).toBeNull();
  });
});