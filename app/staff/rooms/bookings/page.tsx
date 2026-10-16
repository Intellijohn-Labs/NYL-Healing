import Link from 'next/link';
import { requireStaff, ROOM_SETTINGS_ROLES } from '@/lib/staff';
import { bookingsList, pickHotel, STATUS_LABEL, type BookingStatus } from '@/lib/roomBookings';
import { dayLabel, phone, rupees } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';
import RoomsNav from '@/components/staff/RoomsNav';

export const dynamic = 'force-dynamic';

const STATUSES: [string, string][] = [
  ['active', 'Current & upcoming'],
  ['held', 'Waiting for advance'],
  ['confirmed', 'Confirmed'],
  ['checked_in', 'Checked in'],
  ['checked_out', 'Checked out'],
  ['cancelled', 'Cancelled'],
  ['expired', 'Expired'],
  ['', 'All'],
];

export default async function RoomBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ hotel?: string; status?: string; from?: string; to?: string; q?: string }>;
}) {
  const staff = await requireStaff(ROOM_SETTINGS_ROLES);
  const sp = await searchParams;
  const { hotels, hotel } = await pickHotel(sp.hotel);
  const status = sp.status ?? 'active';
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : '';
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : '';
  const q = (sp.q ?? '').trim().slice(0, 60);
  const rows = hotel ? await bookingsList(hotel.id, status, from || null, to || null, q) : [];

  return (
    <StaffShell staff={staff} active="rooms">
      <h1 className="step-title">Room bookings</h1>
      <RoomsNav active="bookings" hotels={hotels} hotelId={hotel?.id} />
      {!hotel ? (
        <p className="empty">No hotels yet.</p>
      ) : (
        <>
          <form method="get" className="rb-filter">
            {hotels.length > 1 && <input type="hidden" name="hotel" value={hotel.id} />}
            <label className="rf">
              <span className="rf-l">Status</span>
              <select name="status" defaultValue={status}>
                {STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="rf">
              <span className="rf-l">Staying from</span>
              <input type="date" name="from" defaultValue={from} />
            </label>
            <label className="rf">
              <span className="rf-l">to</span>
              <input type="date" name="to" defaultValue={to} />
            </label>
            <label className="rf rb-q">
              <span className="rf-l">Name, booking ID, patient ID or phone</span>
              <input name="q" defaultValue={q} placeholder="Rajan, RM-1001, NYL1042 or 98765" autoComplete="off" />
            </label>
            <button type="submit" className="btn primary">
              Show
            </button>
          </form>

          {rows.length === 0 ? (
            <p className="empty">No bookings match.</p>
          ) : (
            <>
              <p className="hint">
                {rows.length === 300 ? 'First 300' : rows.length} booking{rows.length === 1 ? '' : 's'}
              </p>
              <ul className="results rb-results">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/staff/rooms/bookings/${r.id}`}>
                      <span className="rb-line">
                        <span className="g-name">{r.guest_name}</span> <small>{r.booking_code}</small>
                        <em className={`tag st-${r.status}`}>{STATUS_LABEL[r.status as BookingStatus]}</em>
                      </span>
                      <span className="g-meta">
                        {dayLabel(r.check_in)} → {dayLabel(r.check_out)} · {r.nights} night{r.nights === 1 ? '' : 's'} · {r.type_name}
                        {r.room_label ? `, room ${r.room_label}` : ''} · {r.guests} guest{r.guests === 1 ? '' : 's'}
                      </span>
                      <span className="g-meta">
                        Total {rupees(r.total)} · paid {rupees(r.advance_paid + r.balance_paid)}
                        {r.balance_due > 0 && r.status !== 'cancelled' && r.status !== 'expired' ? ` · ${rupees(r.balance_due)} due` : ''}
                        {r.guest_phone ? ` · ${phone(r.guest_phone)}` : ''}
                        {r.patient_code ? ` · ${r.patient_code}` : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </StaffShell>
  );
}
