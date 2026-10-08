'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SlotRow } from '@/lib/staffData';
import SlotForm from './SlotForm';

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
const timeLabel = (hms: string | null) =>
  hms
    ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
        .format(new Date(`1970-01-01T${hms}Z`))
        .toUpperCase()
    : '';

// One upcoming registration day: a compact summary, with the edit form only when asked for
export default function DayRow({ slot, minDate }: { slot: SlotRow; minDate: string }) {
  const [editing, setEditing] = useState(false);
  const pct = Math.min(100, Math.round((slot.booked / Math.max(1, slot.capacity)) * 100));
  return (
    <section className={`day-card ${slot.status !== 'open' ? 'muted' : ''}`}>
      <div className="day-card-main">
        <div className="day-card-when">
          <p className="day-card-date">{dayLabel(slot.slot_date)}</p>
          <p className="day-card-time">{timeLabel(slot.starts_at)}</p>
        </div>
        <div className="day-card-fill">
          <div className="fill-bar" aria-hidden="true">
            <span style={{ width: `${pct}%` }} className={pct >= 100 ? 'full' : pct >= 80 ? 'near' : ''} />
          </div>
          <Link href={`/staff/bookings?date=${slot.slot_date}`} className="fill-text">
            {slot.booked} of {slot.capacity} booked →
          </Link>
        </div>
        <span className={`status-pill s-${slot.status}`}>{slot.status[0].toUpperCase() + slot.status.slice(1)}</span>
        <button type="button" className="btn small" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
          {editing ? 'Close' : 'Edit'}
        </button>
      </div>
      {editing && (
        <div className="day-card-edit">
          <SlotForm slot={slot} minDate={minDate} />
        </div>
      )}
    </section>
  );
}
