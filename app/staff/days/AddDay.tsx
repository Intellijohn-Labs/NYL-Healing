'use client';

import { useState } from 'react';
import SlotForm from './SlotForm';

// "+ Add registration day" opens the form only when needed
export default function AddDay({ minDate }: { minDate: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="btn primary add-day-btn" onClick={() => setOpen(true)}>
        + Add registration day
      </button>
    );
  }
  return (
    <section className="review-card add-day-card">
      <div className="add-day-hd">
        <h2 className="card-h">Add a registration day</h2>
        <button type="button" className="btn small" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <SlotForm minDate={minDate} />
    </section>
  );
}
