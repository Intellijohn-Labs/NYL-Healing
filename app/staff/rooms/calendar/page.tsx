import Link from 'next/link';
import { requireStaff, ROOM_SETTINGS_ROLES } from '@/lib/staff';
import { calendar, pickHotel, STATUS_LABEL } from '@/lib/roomBookings';
import { todayIST } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';
import RoomsNav from '@/components/staff/RoomsNav';

export const dynamic = 'force-dynamic';
const DAYS = 14;

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const head = (iso: string) => {
  const dt = new Date(`${iso}T00:00:00Z`);
  return {
    dow: new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(dt),
    day: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(dt),
  };
};
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export default async function RoomsCalendarPage({ searchParams }: { searchParams: Promise<{ hotel?: string; from?: string }> }) {
  const staff = await requireStaff(ROOM_SETTINGS_ROLES);
  const { hotel: asked, from: f } = await searchParams;
  const { hotels, hotel } = await pickHotel(asked);
  const today = todayIST();
  const from = f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : today;
  if (!hotel) {
    return (
      <StaffShell staff={staff} active="rooms">
        <h1 className="step-title">Calendar</h1>
        <RoomsNav active="calendar" />
        <p className="empty">No hotels yet.</p>
      </StaffShell>
    );
  }
  const c = await calendar(hotel.id, from, DAYS);
  const nights = Array.from({ length: DAYS }, (_, i) => addDays(from, i));
  const hq = hotels.length > 1 ? `&hotel=${hotel.id}` : '';

  const cellFor = (roomId: string, night: string) => {
    const b = c.bookings.find((x) => x.room_id === roomId && x.check_in <= night && night < x.check_out);
    if (b) return { kind: 'b' as const, b };
    const bl = c.blocks.find((x) => x.room_id === roomId && x.start <= night && night <= x.end);
    if (bl) return { kind: 'blocked' as const, reason: bl.reason };
    return { kind: 'free' as const };
  };

  return (
    <StaffShell staff={staff} active="rooms">
      <h1 className="step-title">Calendar</h1>
      <RoomsNav active="calendar" hotels={hotels} hotelId={hotel.id} />

      <div className="cal-nav">
        <Link className="btn small" href={`/staff/rooms/calendar?from=${addDays(from, -DAYS)}${hq}`}>
          ← Earlier
        </Link>
        {from !== today && (
          <Link className="btn small" href={`/staff/rooms/calendar?from=${today}${hq}`}>
            Today
          </Link>
        )}
        <Link className="btn small" href={`/staff/rooms/calendar?from=${addDays(from, DAYS)}${hq}`}>
          Later →
        </Link>
        <span className="cal-legend">
          <i className="lg held" /> Held <i className="lg confirmed" /> Confirmed <i className="lg checked_in" /> Staying <i className="lg blocked" /> Blocked
        </span>
      </div>

      {c.rooms.length === 0 ? (
        <p className="empty">
          No rooms yet. Add them in <Link href="/staff/rooms/settings">Settings</Link>.
        </p>
      ) : (
        <div className="cal-wrap">
          <table className="cal">
            <thead>
              <tr>
                <th className="cal-room">Room</th>
                {nights.map((n) => {
                  const h = head(n);
                  return (
                    <th key={n} className={n === today ? 'is-today' : ''}>
                      <span>{h.dow}</span>
                      {h.day}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {c.types.map((t) => {
                const rooms = c.rooms.filter((r) => r.type_id === t.id);
                const unassigned = c.bookings.filter((b) => b.type_id === t.id && !b.room_id && b.status !== 'checked_out');
                return [
                  <tr key={`${t.id}-free`} className="cal-type">
                    <th className="cal-room">
                      {t.name}
                      <small>free rooms</small>
                    </th>
                    {nights.map((n, i) => (
                      <td key={n} className={`cal-free ${(t.free[i] ?? 0) <= 0 ? 'none' : ''}`}>
                        {Math.max(0, t.free[i] ?? 0)}
                      </td>
                    ))}
                  </tr>,
                  ...rooms.map((r) => (
                    <tr key={r.id}>
                      <th className="cal-room">{r.label}</th>
                      {nights.map((n) => {
                        const cell = cellFor(r.id, n);
                        if (cell.kind === 'b') {
                          const startHere = cell.b.check_in === n || n === from;
                          return (
                            <td key={n} className={`cal-cell ${cell.b.status}`}>
                              <Link href={`/staff/rooms/bookings/${cell.b.id}`} title={`${cell.b.guest} · ${cell.b.code} · ${STATUS_LABEL[cell.b.status]}`}>
                                {startHere ? initials(cell.b.guest) : ''}
                              </Link>
                            </td>
                          );
                        }
                        if (cell.kind === 'blocked')
                          return (
                            <td key={n} className="cal-cell blocked" title={cell.reason ?? 'Blocked'}>
                              ×
                            </td>
                          );
                        return (
                          <td key={n} className="cal-cell free">
                            <Link
                              href={`/staff/rooms/bookings/new?hotel=${hotel.id}&type=${t.id}&room=${r.id}&in=${n}`}
                              aria-label={`New booking, room ${r.label}, ${n}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  )),
                  ...unassigned.map((b) => (
                    <tr key={b.id} className="cal-unassigned">
                      <th className="cal-room">
                        <small>No room yet</small>
                      </th>
                      {nights.map((n) => {
                        const on = b.check_in <= n && n < b.check_out;
                        return (
                          <td key={n} className={`cal-cell ${on ? b.status : ''}`}>
                            {on && (
                              <Link href={`/staff/rooms/bookings/${b.id}`} title={`${b.guest} · ${b.code}`}>
                                {b.check_in === n || n === from ? initials(b.guest) : ''}
                              </Link>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="hint">Tap a booking to open it, or a free square to start a booking for that room and day.</p>
    </StaffShell>
  );
}
