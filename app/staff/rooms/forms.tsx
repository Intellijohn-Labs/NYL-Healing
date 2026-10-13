'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { Hotel, Room, RoomBlock, RoomType } from '@/lib/rooms';
import { keepFields } from '@/lib/keepForm';
import { addBlock, addHotel, addRooms, removeBlock, roomAction, saveHotel, saveRoomType, type FormState } from './actions';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

// Empty the form after a successful save (after an error, what was typed stays)
function useClearOnSuccess(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

function Msg({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p className={state.ok ? 'seat-ok' : 'field-error'} role={state.ok ? 'status' : 'alert'}>
      {state.message}
    </p>
  );
}

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`rf ${wide ? 'wide' : ''}`}>
      <span className="rf-l">{label}</span>
      {children}
      {hint && <span className="rf-h">{hint}</span>}
    </label>
  );
}

// ---------- Hotels ----------

export function AddHotelForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(addHotel, null);
  if (!open)
    return (
      <button type="button" className="btn primary add-day-btn" onClick={() => setOpen(true)}>
        + Add hotel
      </button>
    );
  return (
    <form onSubmit={keepFields(action)} className="review-card rform">
      <div className="add-day-hd">
        <h2 className="card-h">Add a hotel</h2>
        <button type="button" className="btn small" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <div className="rgrid">
        <Field label="Hotel name" wide>
          <input name="name" required maxLength={120} placeholder="Sama Residency" autoFocus />
        </Field>
      </div>
      <p className="hint">You can add the address, times, advance and room types on the next screen.</p>
      <div className="slot-actions">
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? 'Adding…' : 'Add hotel'}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function HotelForm({ hotel }: { hotel: Hotel }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveHotel, null);
  const [advType, setAdvType] = useState(hotel.advance_type);
  return (
    <form onSubmit={keepFields(action)} className="rform">
      <input type="hidden" name="id" value={hotel.id} />

      <h3 className="rsub">Hotel</h3>
      <div className="rgrid">
        <Field label="Name" wide>
          <input name="name" required maxLength={120} defaultValue={hotel.name} />
        </Field>
        <Field label="Address" wide>
          <input name="address" maxLength={300} defaultValue={hotel.address ?? ''} placeholder="Above NYL Healing Centre, Thandekkad" />
        </Field>
        <Field label="Phone">
          <input name="phone" type="tel" maxLength={30} defaultValue={hotel.phone ?? ''} placeholder="79077 82083" />
        </Field>
        <Field label="Google Maps link">
          <input name="maps_url" type="url" maxLength={500} defaultValue={hotel.maps_url ?? ''} placeholder="https://maps.app.goo.gl/…" />
        </Field>
      </div>
      <label className="rcheck">
        <input type="checkbox" name="active" defaultChecked={hotel.active} />
        <span>
          <b>Open for booking</b> (when off, patients don&apos;t see this hotel)
        </span>
      </label>

      <h3 className="rsub">Times</h3>
      <div className="rgrid">
        <Field label="Check-in from">
          <input name="checkin_time" type="time" required defaultValue={hotel.checkin_time.slice(0, 5)} />
        </Field>
        <Field label="Check-out by">
          <input name="checkout_time" type="time" required defaultValue={hotel.checkout_time.slice(0, 5)} />
        </Field>
      </div>

      <h3 className="rsub">Advance and holding</h3>
      <div className="rgrid">
        <Field label="Advance is">
          <select name="advance_type" value={advType} onChange={(e) => setAdvType(e.target.value as Hotel['advance_type'])}>
            <option value="fixed">A fixed amount (₹)</option>
            <option value="percent">A percent of the total</option>
            <option value="nights">The first few nights</option>
          </select>
        </Field>
        <Field
          label={advType === 'fixed' ? 'Amount (₹)' : advType === 'percent' ? 'Percent (%)' : 'Number of nights'}
          hint={advType === 'fixed' ? 'For example 1000' : advType === 'percent' ? 'For example 30' : 'For example 1'}
        >
          <input name="advance_value" type="number" min={0} max={advType === 'percent' ? 100 : advType === 'nights' ? 30 : 1000000} required defaultValue={hotel.advance_value} />
        </Field>
        <Field label="Hold an unpaid booking for (hours)" hint="After this, the room is freed again">
          <input name="hold_hours" type="number" min={1} max={168} required defaultValue={hotel.hold_hours} />
        </Field>
        <Field label="Free cancellation up to (days before check-in)" hint="0 means no free cancellation">
          <input name="free_cancel_days" type="number" min={0} max={60} required defaultValue={hotel.free_cancel_days} />
        </Field>
      </div>

      <h3 className="rsub">Paying the advance</h3>
      <div className="rgrid">
        <Field label="UPI ID">
          <input name="upi_id" maxLength={80} defaultValue={hotel.upi_id ?? ''} placeholder="samaresidency@okaxis" />
        </Field>
        <Field label="Note for guests" hint="Shown with the payment details">
          <input name="payment_note" maxLength={300} defaultValue={hotel.payment_note ?? ''} placeholder="Send the payment screenshot to 79077 82083" />
        </Field>
      </div>

      <h3 className="rsub">Who can book</h3>
      <div className="rradio">
        <label>
          <input type="radio" name="who_can_book" value="patients" defaultChecked={hotel.who_can_book === 'patients'} />
          <span>Registered NYL patients only</span>
        </label>
        <label>
          <input type="radio" name="who_can_book" value="anyone" defaultChecked={hotel.who_can_book === 'anyone'} />
          <span>Anyone</span>
        </label>
      </div>

      <div className="slot-actions sticky-save">
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? 'Saving…' : 'Save hotel details'}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

// ---------- Room types ----------

function RoomTypeForm({ hotelId, type, onDone }: { hotelId: string; type?: RoomType; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, f) => {
    const r = await saveRoomType(prev, f);
    if (r?.ok && !type) onDone?.();
    return r;
  }, null);
  return (
    <form onSubmit={keepFields(action)} className="rform">
      <input type="hidden" name="hotel_id" value={hotelId} />
      {type && <input type="hidden" name="id" value={type.id} />}
      <div className="rgrid">
        <Field label="Name" wide>
          <input name="name" required maxLength={80} defaultValue={type?.name ?? ''} placeholder="AC Double" />
        </Field>
        <Field label="Price per night (₹)">
          <input name="price_per_night" type="number" min={0} required defaultValue={type?.price_per_night ?? ''} placeholder="1200" />
        </Field>
        <Field label="Max guests">
          <input name="max_guests" type="number" min={1} max={20} required defaultValue={type?.max_guests ?? 2} />
        </Field>
        <Field label="Guests included in the price">
          <input name="base_guests" type="number" min={1} max={20} required defaultValue={type?.base_guests ?? 2} />
        </Field>
        <Field label="Extra guest, per night (₹)" hint="0 if no extra charge">
          <input name="extra_guest_price" type="number" min={0} defaultValue={type?.extra_guest_price ?? 0} />
        </Field>
        <Field label="Long stay from (nights)" hint="Optional, e.g. 12">
          <input name="long_stay_nights" type="number" min={2} max={365} defaultValue={type?.long_stay_nights ?? ''} />
        </Field>
        <Field label="Long-stay price per night (₹)" hint="Optional, e.g. 1000">
          <input name="long_stay_price" type="number" min={0} defaultValue={type?.long_stay_price ?? ''} />
        </Field>
        <Field label="Facilities" hint="Separate with commas" wide>
          <input name="facilities" maxLength={300} defaultValue={type?.facilities.join(', ') ?? ''} placeholder="AC, Attached bathroom, Hot water" />
        </Field>
        <Field label="Description" wide>
          <input name="description" maxLength={400} defaultValue={type?.description ?? ''} placeholder="Room with two single beds" />
        </Field>
      </div>
      <label className="rcheck">
        <input type="checkbox" name="active" defaultChecked={type?.active ?? true} />
        <span>
          <b>Bookable</b> (when off, patients don&apos;t see this room type)
        </span>
      </label>
      <div className="slot-actions">
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? 'Saving…' : type ? 'Save room type' : 'Add room type'}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function RoomTypeCard({ type, roomCount }: { type: RoomType; roomCount: number }) {
  const [editing, setEditing] = useState(false);
  return (
    <section className={`day-card ${type.active ? '' : 'muted'}`}>
      <div className="rt-main">
        <div>
          <p className="day-card-date">{type.name}</p>
          <p className="day-card-time">
            {type.base_guests === type.max_guests ? `${type.max_guests} guests` : `${type.base_guests} included, up to ${type.max_guests}`}
            {type.facilities.length > 0 && ` · ${type.facilities.join(', ')}`}
          </p>
        </div>
        <div className="rt-price">
          <p>
            <b>{rupees(type.price_per_night)}</b> / night
          </p>
          {type.long_stay_nights && type.long_stay_price !== null && (
            <p className="rt-sub">
              {rupees(type.long_stay_price)} from {type.long_stay_nights} nights
            </p>
          )}
          {type.extra_guest_price > 0 && <p className="rt-sub">+{rupees(type.extra_guest_price)} per extra guest</p>}
        </div>
        <span className={`status-pill ${type.active ? 's-open' : 's-closed'}`}>
          {roomCount} room{roomCount === 1 ? '' : 's'}
          {type.active ? '' : ' · Off'}
        </span>
        <button type="button" className="btn small" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
          {editing ? 'Close' : 'Edit'}
        </button>
      </div>
      {editing && (
        <div className="day-card-edit">
          <RoomTypeForm hotelId={type.hotel_id} type={type} />
        </div>
      )}
    </section>
  );
}

export function AddRoomType({ hotelId }: { hotelId: string }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="btn secondary" onClick={() => setOpen(true)}>
        + Add room type
      </button>
    );
  return (
    <section className="review-card">
      <div className="add-day-hd">
        <h3 className="card-h">New room type</h3>
        <button type="button" className="btn small" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <RoomTypeForm hotelId={hotelId} onDone={() => setOpen(false)} />
    </section>
  );
}

// ---------- Rooms ----------

export function AddRoomsForm({ hotelId, types }: { hotelId: string; types: RoomType[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addRooms, null);
  const ref = useClearOnSuccess(state);
  if (types.length === 0) return <p className="hint">Add a room type first, then add its rooms.</p>;
  return (
    <form ref={ref} onSubmit={keepFields(action)} className="review-card rform">
      <h3 className="card-h">Add rooms</h3>
      <input type="hidden" name="hotel_id" value={hotelId} />
      <div className="rgrid">
        <Field label="Room type">
          <select name="room_type_id" required defaultValue={types[0].id}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Room numbers" hint='"101-110" adds ten rooms; or "101, 102, A1"'>
          <input name="labels" required maxLength={400} placeholder="101-110" />
        </Field>
      </div>
      <div className="slot-actions">
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? 'Adding…' : 'Add rooms'}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function RoomRow({ room, types, blocks }: { room: Room; types: RoomType[]; blocks: RoomBlock[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(addBlock, null);
  const blockRef = useClearOnSuccess(state);
  const type = types.find((t) => t.id === room.room_type_id);
  return (
    <li className={`room-row ${room.active ? '' : 'off'}`}>
      <div className="room-main">
        <span className="room-label">{room.label}</span>
        <span className="room-type">{type?.name ?? ''}</span>
        <span className="room-tags">
          {!room.active && <em className="tag">Off</em>}
          {blocks.length > 0 && <em className="tag warn">{blocks.length} block{blocks.length > 1 ? 's' : ''}</em>}
        </span>
        <button type="button" className="btn small" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Close' : 'Manage'}
        </button>
      </div>

      {open && (
        <div className="room-manage">
          <div className="room-actions">
            <form action={roomAction}>
              <input type="hidden" name="room_id" value={room.id} />
              <input type="hidden" name="hotel_id" value={room.hotel_id} />
              <input type="hidden" name="action" value={room.active ? 'off' : 'on'} />
              <button type="submit" className="btn small">
                {room.active ? 'Switch off' : 'Switch on'}
              </button>
            </form>
            {types.length > 1 && (
              <form action={roomAction} className="room-move">
                <input type="hidden" name="room_id" value={room.id} />
                <input type="hidden" name="hotel_id" value={room.hotel_id} />
                <input type="hidden" name="action" value="move" />
                <select name="room_type_id" defaultValue={room.room_type_id} aria-label="Room type">
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn small">
                  Change type
                </button>
              </form>
            )}
            <form
              action={roomAction}
              onSubmit={(e) => {
                if (!confirm(`Delete room ${room.label}? To keep its history, use "Switch off" instead.`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="room_id" value={room.id} />
              <input type="hidden" name="hotel_id" value={room.hotel_id} />
              <input type="hidden" name="action" value="delete" />
              <button type="submit" className="btn small danger">
                Delete
              </button>
            </form>
          </div>

          <h4 className="rsub">Blocked dates</h4>
          {blocks.length === 0 ? (
            <p className="hint">Not blocked on any upcoming dates.</p>
          ) : (
            <ul className="blocks">
              {blocks.map((b) => (
                <li key={b.id}>
                  <span>
                    {b.start_date === b.end_date ? dateLabel(b.start_date) : `${dateLabel(b.start_date)} to ${dateLabel(b.end_date)}`}
                    {b.reason ? ` · ${b.reason}` : ''}
                  </span>
                  <form action={removeBlock}>
                    <input type="hidden" name="block_id" value={b.id} />
                    <input type="hidden" name="hotel_id" value={room.hotel_id} />
                    <button type="submit" className="btn small">
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form ref={blockRef} onSubmit={keepFields(action)} className="rform">
            <input type="hidden" name="room_id" value={room.id} />
            <input type="hidden" name="hotel_id" value={room.hotel_id} />
            <div className="rgrid">
              <Field label="From">
                <input type="date" name="start_date" required />
              </Field>
              <Field label="To (last night)">
                <input type="date" name="end_date" />
              </Field>
              <Field label="Reason" wide>
                <input name="reason" maxLength={120} placeholder="Painting, repair, staff use…" />
              </Field>
            </div>
            <div className="slot-actions">
              <button type="submit" className="btn small" disabled={pending}>
                {pending ? 'Blocking…' : 'Block these dates'}
              </button>
              <Msg state={state} />
            </div>
          </form>
        </div>
      )}
    </li>
  );
}
