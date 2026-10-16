import Link from 'next/link';
import { requireStaff, ROOM_SETTINGS_ROLES } from '@/lib/staff';
import { listHotels } from '@/lib/rooms';
import StaffShell from '@/components/staff/StaffShell';
import { AddHotelForm } from '../forms';
import RoomsNav from '@/components/staff/RoomsNav';

export const dynamic = 'force-dynamic';

const t = (hms: string) =>
  new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(`1970-01-01T${hms}Z`)).toUpperCase();

export default async function RoomsSettingsPage() {
  const staff = await requireStaff(ROOM_SETTINGS_ROLES);
  const hotels = await listHotels();
  return (
    <StaffShell staff={staff} active="rooms">
      <h1 className="step-title">Rooms</h1>
      <RoomsNav active="settings" />
      <p className="hint page-intro">
        Hotels, room types, prices and rooms. Patients only see hotels and room types that are switched on.
      </p>

      <AddHotelForm />

      <h2 className="list-h">Hotels</h2>
      {hotels.length === 0 ? (
        <p className="empty">No hotels yet. Add one to start.</p>
      ) : (
        <div className="day-list">
          {hotels.map((h) => (
            <Link key={h.id} href={`/staff/rooms/${h.id}`} className={`day-card hotel-card ${h.active ? '' : 'muted'}`}>
              <div>
                <p className="day-card-date">{h.name}</p>
                <p className="day-card-time">
                  {h.active_room_count} room{h.active_room_count === 1 ? '' : 's'} in use
                  {h.room_count > h.active_room_count ? ` (${h.room_count - h.active_room_count} off)` : ''} · {h.type_count} room type
                  {h.type_count === 1 ? '' : 's'} · Check-in {t(h.checkin_time)}, check-out {t(h.checkout_time)}
                </p>
              </div>
              <span className={`status-pill ${h.active ? 's-open' : 's-closed'}`}>{h.active ? 'Open' : 'Off'}</span>
              <span className="hotel-go" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </StaffShell>
  );
}
