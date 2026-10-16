'use client';

import { useActionState, useState } from 'react';
import { keepFields } from '@/lib/keepForm';
import { bookingAction, type BState } from '../actions';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function Act({
  action,
  id,
  label,
  primary,
  danger,
  confirmText,
  children,
}: {
  action: string;
  id: string;
  label: string;
  primary?: boolean;
  danger?: boolean;
  confirmText?: string;
  children?: React.ReactNode;
}) {
  const [state, run, pending] = useActionState<BState, FormData>(bookingAction, null);
  return (
    <form
      className="rb-act"
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) {
          e.preventDefault();
          return;
        }
        keepFields(run)(e);
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      {children}
      <button type="submit" className={`btn ${primary ? 'primary' : 'small'} ${danger ? 'danger' : ''}`} disabled={pending}>
        {pending ? 'Saving…' : label}
      </button>
      {state && <p className={state.ok ? 'seat-ok' : 'field-error'}>{state.message}</p>}
    </form>
  );
}

export default function BookingActions({
  id,
  status,
  roomId,
  freeRooms,
  advanceLeft,
  balanceDue,
  notes,
}: {
  id: string;
  status: string;
  roomId: string | null;
  freeRooms: { id: string; label: string }[];
  advanceLeft: number;
  balanceDue: number;
  notes: string;
}) {
  const [showCancel, setShowCancel] = useState(false);
  const roomSelect = (
    <label className="rf">
      <span className="rf-l">Room</span>
      <select name="room_id" defaultValue={roomId ?? ''} required={status !== 'checked_in'}>
        <option value="">Choose a room</option>
        {freeRooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  );
  const open = ['held', 'confirmed', 'expired'].includes(status);

  return (
    <section className="review-card rb-actions">
      <h2 className="card-h">Actions</h2>

      {(status === 'held' || status === 'expired') && (
        <Act action="advance" id={id} label="Advance received" primary>
          <label className="rf">
            <span className="rf-l">Amount (₹)</span>
            <input type="number" name="amount" min={1} required defaultValue={advanceLeft || ''} />
          </label>
        </Act>
      )}

      {(status === 'held' || status === 'confirmed') && (
        <Act action="check_in" id={id} label="Check in" primary={status === 'confirmed'}>
          {roomSelect}
          <label className="rf">
            <span className="rf-l">Balance collected now (₹)</span>
            <input type="number" name="amount" min={0} defaultValue={balanceDue || 0} />
          </label>
        </Act>
      )}

      {(status === 'held' || status === 'confirmed' || status === 'checked_in') && freeRooms.length > 0 && (
        <Act action="assign" id={id} label={roomId ? 'Change room' : 'Assign room'}>
          {roomSelect}
        </Act>
      )}

      {status === 'checked_in' && (
        <Act action="check_out" id={id} label="Check out" primary confirmText={balanceDue > 0 ? undefined : 'Check this guest out?'}>
          <label className="rf">
            <span className="rf-l">Balance collected now (₹)</span>
            <input type="number" name="amount" min={0} defaultValue={balanceDue || 0} />
          </label>
        </Act>
      )}

      {(status === 'confirmed' || status === 'checked_in' || status === 'checked_out') && balanceDue > 0 && (
        <Act action="payment" id={id} label="Record payment">
          <label className="rf">
            <span className="rf-l">Amount (₹)</span>
            <input type="number" name="amount" min={1} required placeholder={rupees(balanceDue)} />
          </label>
        </Act>
      )}

      <Act action="note" id={id} label="Save note">
        <label className="rf wide">
          <span className="rf-l">Note</span>
          <input name="notes" defaultValue={notes} maxLength={500} />
        </label>
      </Act>

      {open &&
        (showCancel ? (
          <Act action="cancel" id={id} label="Cancel booking" danger confirmText="Cancel this booking? The room becomes free again.">
            <label className="rf wide">
              <span className="rf-l">Reason</span>
              <input name="reason" maxLength={300} placeholder="Guest called to cancel…" />
            </label>
          </Act>
        ) : (
          <button type="button" className="btn small danger" onClick={() => setShowCancel(true)}>
            Cancel booking…
          </button>
        ))}
    </section>
  );
}
