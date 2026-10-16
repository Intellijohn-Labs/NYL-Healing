'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { keepFields } from '@/lib/keepForm';
import { createBooking, stayAvailability, type BState } from '../actions';

type T = {
  id: string;
  name: string;
  max_guests: number;
  base_guests: number;
  price_per_night: number;
  extra_guest_price: number;
  long_stay_nights: number | null;
  long_stay_price: number | null;
};
type Rules = { advance_type: string; advance_value: number; hold_hours: number; checkin_time: string; checkout_time: string };

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const nightsBetween = (a: string, b: string) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 86400000) : 0);

export default function NewBookingForm({
  hotelName,
  types,
  photos,
  rooms,
  rules,
  today,
  initial,
}: {
  hotelName: string;
  types: T[];
  photos: Record<string, string[]>;
  rooms: { id: string; label: string; room_type_id: string }[];
  rules: Rules;
  today: string;
  initial: { type: string; room: string; checkIn: string };
}) {
  const [state, action, pending] = useActionState<BState, FormData>(createBooking, null);
  const [typeId, setTypeId] = useState(types.some((t) => t.id === initial.type) ? initial.type : types[0].id);
  const [checkIn, setCheckIn] = useState(initial.checkIn && initial.checkIn >= today ? initial.checkIn : today);
  const [checkOut, setCheckOut] = useState(addDays(initial.checkIn && initial.checkIn >= today ? initial.checkIn : today, 1));
  const [guests, setGuests] = useState(1);
  const t = types.find((x) => x.id === typeId)!;
  const [free, setFree] = useState<Record<string, number> | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  // Free rooms of each type for the chosen dates (checked again when the dates change)
  useEffect(() => {
    let live = true;
    setFree(null);
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    const timer = setTimeout(() => {
      stayAvailability(types.map((x) => x.id), checkIn, checkOut).then((r) => live && setFree(r));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [checkIn, checkOut, types]);
  const pics = photos[typeId] ?? [];
  const typeRooms = rooms.filter((r) => r.room_type_id === typeId);

  // Same price rules as the database (hotel_quote), so staff see the total before saving
  const q = useMemo(() => {
    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) return null;
    const perNight = t.long_stay_nights && t.long_stay_price != null && nights >= t.long_stay_nights ? t.long_stay_price : t.price_per_night;
    const extra = Math.max(0, guests - t.base_guests) * t.extra_guest_price;
    const total = (perNight + extra) * nights;
    const advance =
      rules.advance_type === 'fixed'
        ? Math.min(rules.advance_value, total)
        : rules.advance_type === 'percent'
          ? Math.round((total * rules.advance_value) / 100)
          : Math.min(rules.advance_value, nights) * (perNight + extra);
    return { nights, perNight, extra, total, advance, longStay: perNight !== t.price_per_night };
  }, [checkIn, checkOut, guests, t, rules]);

  return (
    <form onSubmit={keepFields(action)} className="rform nb-form">
      <section className="review-card rform">
        <h2 className="card-h">Room type</h2>
        <input type="hidden" name="room_type_id" value={typeId} />
        <div className="rtc-list" role="radiogroup" aria-label="Room type">
          {types.map((x) => {
            const n = free?.[x.id];
            const cover = photos[x.id]?.[0];
            return (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={x.id === typeId}
                className={`rtc ${x.id === typeId ? 'on' : ''} ${n === 0 ? 'full' : ''}`}
                onClick={() => setTypeId(x.id)}
              >
                <span className="rtc-img" style={cover ? { backgroundImage: `url("${cover}")` } : undefined}>
                  {!cover && 'No photo'}
                </span>
                <span className="rtc-txt">
                  <b>{x.name}</b>
                  <small>Up to {x.max_guests} guests</small>
                  <span className="rtc-price">
                    {rupees(x.price_per_night)} <small>/ night</small>
                  </span>
                  <small className={`rtc-free ${n === 0 ? 'none' : ''}`}>
                    {n == null ? 'Checking…' : n === 0 ? 'Not free for these dates' : `${n} free for these dates`}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
        {pics.length > 0 && (
          <div className="rtc-gal">
            {pics.slice(0, 5).map((u, i) => (
              <button key={u} type="button" style={{ backgroundImage: `url("${u}")` }} onClick={() => setViewer(i)} aria-label={`Photo ${i + 1} of ${t.name}`} />
            ))}
          </div>
        )}
      </section>

      <section className="review-card rform">
        <h2 className="card-h">Stay at {hotelName}</h2>
        <div className="rgrid">
          <label className="rf">
            <span className="rf-l">Room number</span>
            <select name="room_id" defaultValue={typeRooms.some((r) => r.id === initial.room) ? initial.room : ''} key={typeId}>
              <option value="">Choose later (at check-in)</option>
              {typeRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="rf">
            <span className="rf-l">Check-in</span>
            <input
              type="date"
              name="check_in"
              min={today}
              required
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (e.target.value && checkOut <= e.target.value) setCheckOut(addDays(e.target.value, 1));
              }}
            />
          </label>
          <label className="rf">
            <span className="rf-l">Check-out (day they leave)</span>
            <input type="date" name="check_out" min={checkIn ? addDays(checkIn, 1) : today} required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </label>
          <label className="rf">
            <span className="rf-l">Guests</span>
            <input type="number" name="guests" min={1} max={t.max_guests} required value={guests} onChange={(e) => setGuests(Number(e.target.value) || 1)} />
          </label>
        </div>
        <div className="nb-quick">
          {[1, 3, 12].map((n) => (
            <button key={n} type="button" className="btn small" onClick={() => setCheckOut(addDays(checkIn, n))}>
              {n} night{n === 1 ? '' : 's'}
            </button>
          ))}
        </div>
      </section>

      <section className="review-card rform">
        <h2 className="card-h">Guest</h2>
        <div className="rgrid">
          <label className="rf wide">
            <span className="rf-l">Guest name</span>
            <input name="guest_name" required maxLength={120} />
          </label>
          <label className="rf">
            <span className="rf-l">Phone</span>
            <input name="guest_phone" type="tel" maxLength={30} placeholder="98765 43210" />
          </label>
          <label className="rf">
            <span className="rf-l">NYL patient ID (optional)</span>
            <input name="patient_code" maxLength={20} placeholder="NYL1042" />
          </label>
          <label className="rf wide">
            <span className="rf-l">Notes (optional)</span>
            <input name="notes" maxLength={500} placeholder="Ground floor please, arriving by train…" />
          </label>
        </div>
      </section>

      {q && (
        <section className="review-card nb-quote">
          <div className="kv">
            <span>
              {q.nights} night{q.nights === 1 ? '' : 's'} × {rupees(q.perNight + q.extra)}
              {q.longStay || q.extra
                ? ` (${rupees(q.perNight)}${q.longStay ? ' long-stay price' : ''}${q.extra ? ` + ${rupees(q.extra)} extra guest` : ''})`
                : ''}
            </span>
            <b>{rupees(q.total)}</b>
          </div>
          <div className="kv">
            <span>Advance to confirm</span>
            <b>{rupees(q.advance)}</b>
          </div>
          <label className="rf">
            <span className="rf-l">Advance received now (₹)</span>
            <input type="number" name="advance_paid" min={0} defaultValue={0} />
            <span className="rf-h">
              If the full advance is received now, the booking is confirmed. Otherwise the room is held for {rules.hold_hours} hours.
            </span>
          </label>
        </section>
      )}

      {viewer !== null && pics[viewer] && (
        <div className="hb-viewer" role="dialog" aria-modal="true" aria-label={`Photos of ${t.name}`}>
          <button type="button" className="btn small hb-close" onClick={() => setViewer(null)}>
            Close
          </button>
          <div className="hb-viewer-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pics[viewer]} alt="" />
          </div>
          <div className="hb-viewer-info">
            <div className="hb-viewer-text">
              <div className="hb-name">{t.name}</div>
              <div className="hb-meta">
                Photo {viewer + 1} of {pics.length}
              </div>
            </div>
            <div className="hb-viewer-nav">
              <button type="button" className="btn small" onClick={() => setViewer(viewer - 1)} disabled={viewer === 0}>
                Previous
              </button>
              <button type="button" className="btn small" onClick={() => setViewer(viewer + 1)} disabled={viewer >= pics.length - 1}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="slot-actions">
        <button type="submit" className="btn primary" disabled={pending || !q}>
          {pending ? 'Saving…' : 'Save booking'}
        </button>
        {state && !state.ok && <p className="field-error">{state.message}</p>}
      </div>
    </form>
  );
}
