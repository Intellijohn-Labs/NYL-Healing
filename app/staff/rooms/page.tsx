import Link from 'next/link';
import { requireStaff, ROOM_SETTINGS_ROLES } from '@/lib/staff';
import { dashboard, pickHotelCard, type BookingRow } from '@/lib/roomBookings';
import { dayLabel, rupees, timeOf } from '@/lib/format';
import RoomsShell from '@/components/staff/RoomsShell';
import HotelCard from '@/components/staff/HotelCard';

export const dynamic = 'force-dynamic';

function left(until: string | null) {
  if (!until) return '';
  const mins = Math.round((new Date(until).getTime() - Date.now()) / 60000);
  if (mins <= 0) return 'expiring now';
  return mins < 60 ? `${mins} min left` : `${Math.floor(mins / 60)} h ${mins % 60} min left`;
}

function List({ title, rows, empty, show }: { title: string; rows: BookingRow[]; empty: string; show: (r: BookingRow) => React.ReactNode }) {
  return (
    <section className="today rd-list">
      <h2>
        {title} <span>{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="hint">{empty}</p>
      ) : (
        <ol>
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/staff/rooms/bookings/${r.id}`} className="rd-row">
                <span className="rd-room">{r.room_label ?? '–'}</span>
                <span className="t-name">
                  {r.guest_name} <small>{r.booking_code}</small>
                  <span className="g-meta">
                    {r.type_name} · {r.guests} guest{r.guests === 1 ? '' : 's'} · {dayLabel(r.check_in)} → {dayLabel(r.check_out)} ({r.nights} night
                    {r.nights === 1 ? '' : 's'})
                  </span>
                </span>
                <span className="rd-extra">{show(r)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function RoomsTodayPage({ searchParams }: { searchParams: Promise<{ hotel?: string }> }) {
  const staff = await requireStaff(ROOM_SETTINGS_ROLES);
  const { hotel: asked } = await searchParams;
  const { cards, hotel } = await pickHotelCard(asked);

  if (!hotel) {
    return (
      <RoomsShell staff={staff} active="today">
        <h1 className="step-title">Rooms</h1>
        <p className="empty">
          No hotels yet. Add one in <Link href="/staff/rooms/settings">Settings</Link>, with its room types and rooms.
        </p>
      </RoomsShell>
    );
  }
  const d = await dashboard(hotel.id);
  const freeTonight = Math.max(0, d.rooms_total - d.booked_tonight - d.blocked_tonight);

  return (
    <RoomsShell staff={staff} active="today" hotelId={hotel.id} multiHotel={cards.length > 1}>
      <HotelCard hotel={hotel} cards={cards} subtitle={dayLabel(d.today, true)} path="/staff/rooms" />

      <div className="stats">
        <div className="stat">
          <p className="stat-n">
            {d.occupied}/{d.rooms_total}
          </p>
          <p className="stat-l">Rooms occupied now</p>
        </div>
        <div className="stat">
          <p className="stat-n">{freeTonight}</p>
          <p className="stat-l">Free tonight{d.blocked_tonight ? ` (${d.blocked_tonight} blocked)` : ''}</p>
        </div>
        <div className={`stat ${d.holds.length ? 'warn' : ''}`}>
          <p className="stat-n">{d.holds.length}</p>
          <p className="stat-l">Waiting for advance</p>
        </div>
        <div className="stat">
          <p className="stat-n">{rupees(d.money_today)}</p>
          <p className="stat-l">Received today</p>
        </div>
      </div>
      {d.free_by_type.length > 0 && (
        <p className="hint rd-free">Free tonight by type: {d.free_by_type.map((t) => `${t.type} ${Math.max(0, t.free)}`).join(' · ')}</p>
      )}

      <List title="Arriving today" rows={d.arrivals} empty="No arrivals today." show={(r) => (r.status === 'held' ? <em className="tag warn">Advance due</em> : <em className="tag ok">Confirmed</em>)} />
      <List
        title="Leaving today"
        rows={d.departures}
        empty="No one is due to leave today."
        show={(r) => (r.balance_due > 0 ? <em className="tag warn">Collect {rupees(r.balance_due)}</em> : <em className="tag ok">Paid</em>)}
      />
      <List
        title="Waiting for advance"
        rows={d.holds}
        empty="No unpaid holds."
        show={(r) => (
          <>
            <em className="tag warn">{rupees(r.advance_due - r.advance_paid)} due</em>
            <small className="rd-left">{left(r.hold_until)}</small>
          </>
        )}
      />
      <List
        title="Staying now"
        rows={d.in_house}
        empty="No guests checked in."
        show={(r) => (r.balance_due > 0 ? <em className="tag warn">{rupees(r.balance_due)} due</em> : <em className="tag ok">Paid</em>)}
      />
      <p className="hint">Updated {timeOf(new Date().toISOString())}. Unpaid holds are released automatically when their time runs out.</p>
    </RoomsShell>
  );
}
