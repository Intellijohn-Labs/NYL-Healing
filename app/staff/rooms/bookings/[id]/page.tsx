import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff, ROOM_SETTINGS_ROLES } from '@/lib/staff';
import { bookingDetail, STATUS_LABEL, typePhotos } from '@/lib/roomBookings';
import { dayLabel, phone, rupees, timeOf } from '@/lib/format';
import RoomsShell from '@/components/staff/RoomsShell';
import BookingActions from './BookingActions';

export const dynamic = 'force-dynamic';

const ACTION: Record<string, string> = {
  booking_created: 'Booking made',
  booking_advance: 'Advance received',
  booking_assign: 'Room assigned',
  booking_check_in: 'Checked in',
  booking_check_out: 'Checked out',
  booking_cancel: 'Cancelled',
  booking_payment: 'Payment received',
  booking_note: 'Note changed',
  booking_expired: 'Hold expired (advance not paid)',
};

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const staff = await requireStaff(ROOM_SETTINGS_ROLES);
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await bookingDetail(id);
  if (!d) notFound();
  const b = d.booking;
  const cover = (await typePhotos(b.hotel_id))[b.room_type_id]?.[0] ?? null;
  const paid = b.advance_paid + b.balance_paid;

  const rows: [string, React.ReactNode][] = [
    ['Guest', `${b.guest_name}${b.guests ? ` · ${b.guests} guest${b.guests === 1 ? '' : 's'}` : ''}`],
    ...(b.guest_phone ? ([['Phone', phone(b.guest_phone)]] as [string, string][]) : []),
    ...(d.patient_code ? ([['NYL patient', <Link key="p" href={`/staff/patients/${d.patient_code}`}>{d.patient_code}</Link>]] as [string, React.ReactNode][]) : []),
    ['Stay', `${dayLabel(b.check_in, true)} → ${dayLabel(b.check_out, true)} (${b.nights} night${b.nights === 1 ? '' : 's'})`],
    ['Room', `${d.type_name}${d.room_label ? `, room ${d.room_label}` : ' (room not chosen yet)'}`],
    ['Price', `${rupees(b.price_per_night + b.extra_per_night)} per night${b.extra_per_night ? ` (incl. ${rupees(b.extra_per_night)} extra guest)` : ''}`],
    ['Total', rupees(b.total)],
    ['Advance', `${rupees(b.advance_paid)} paid of ${rupees(b.advance_due)}`],
    ['Paid so far', rupees(paid)],
    ['Balance due', rupees(d.balance_due)],
    ...(b.notes ? ([['Notes', b.notes]] as [string, string][]) : []),
    ...(b.cancel_reason ? ([['Cancel reason', b.cancel_reason]] as [string, string][]) : []),
  ];

  return (
    <RoomsShell staff={staff} active="bookings" hotelId={b.hotel_id}>
      <p className="hint">
        <Link href="/staff/rooms/bookings">← All bookings</Link>
      </p>
      <div className="review-hd">
        <h1 className="step-title">{b.guest_name}</h1>
        <p className="result-id">{b.booking_code}</p>
      </div>
      {created && <p className="saved-note">Booking saved.</p>}
      <p className={`rb-status st-${b.status}`}>
        {STATUS_LABEL[b.status]}
        {b.status === 'held' && b.hold_until ? ` · held until ${dayLabel(b.hold_until.slice(0, 10))} ${timeOf(b.hold_until)}` : ''}
      </p>

      <section className="review-card">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={d.type_name} className="bk-cover" />
        )}
        <dl>
          {rows.map(([k, v]) => (
            <div key={k} className="dl-row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <BookingActions
        id={b.id}
        status={b.status}
        roomId={b.room_id}
        freeRooms={d.free_rooms}
        advanceLeft={Math.max(0, b.advance_due - b.advance_paid)}
        balanceDue={d.balance_due}
        notes={b.notes ?? ''}
      />

      <section className="today">
        <h2>History</h2>
        <ol>
          {d.history.map((h, i) => (
            <li key={i}>
              <span className="t-time">
                {dayLabel(h.at.slice(0, 10))} {timeOf(h.at)}
              </span>
              <span className="t-name">
                {ACTION[h.action] ?? h.action}
                {typeof h.details?.amount === 'number' ? ` · ${rupees(h.details.amount as number)}` : ''}
                {typeof h.details?.advance_paid === 'number' && (h.details.advance_paid as number) > 0 ? ` · ${rupees(h.details.advance_paid as number)} advance` : ''}
                {h.details?.reason ? ` · ${String(h.details.reason)}` : ''}
              </span>
              <span className="t-seat none">{h.by}</span>
            </li>
          ))}
        </ol>
      </section>
      <p className="hint">Made {dayLabel(b.created_at.slice(0, 10), true)}, {timeOf(b.created_at)} · {b.source === 'staff' ? 'by staff' : `from ${b.source}`}</p>
    </RoomsShell>
  );
}
