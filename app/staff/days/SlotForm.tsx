'use client';

import { useActionState } from 'react';
import { saveSlot, type SlotState } from '../actions';
import type { SlotRow } from '@/lib/staffData';

export default function SlotForm({ slot, minDate }: { slot?: SlotRow; minDate: string }) {
  const [state, action, pending] = useActionState<SlotState, FormData>(saveSlot, null);
  const isNew = !slot;
  return (
    <form action={action} className={`slot-form ${isNew ? 'new' : ''}`}>
      {slot && <input type="hidden" name="id" value={slot.id} />}
      <div className="slot-fields">
        {isNew && (
          <label className="full">
            Date
            <input type="date" name="date" min={minDate} required />
          </label>
        )}
        <label>
          Time
          <input type="time" name="time" defaultValue={slot?.starts_at?.slice(0, 5) ?? '09:00'} />
        </label>
        <label>
          Capacity
          <input type="number" name="capacity" min={Math.max(1, slot?.booked ?? 1)} max={2000} defaultValue={slot?.capacity ?? 40} required />
        </label>
        <label>
          Status
          <select name="status" defaultValue={slot?.status ?? 'open'}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      <div className="slot-actions">
        <button type="submit" className={`btn ${isNew ? 'primary' : 'small'}`} disabled={pending}>
          {pending ? 'Saving…' : isNew ? 'Add day' : 'Save'}
        </button>
        {state && <p className={state.ok ? 'seat-ok' : 'field-error'}>{state.message}</p>}
      </div>
    </form>
  );
}
