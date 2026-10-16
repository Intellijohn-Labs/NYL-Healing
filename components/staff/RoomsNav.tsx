import Link from 'next/link';
import type { HotelOption } from '@/lib/roomBookings';

const ITEMS = [
  { key: 'today', href: '/staff/rooms', label: 'Today' },
  { key: 'calendar', href: '/staff/rooms/calendar', label: 'Calendar' },
  { key: 'bookings', href: '/staff/rooms/bookings', label: 'Bookings' },
  { key: 'settings', href: '/staff/rooms/settings', label: 'Settings' },
] as const;

// Sub-menu for the Rooms section, with the hotel switcher when there's more than one hotel
export default function RoomsNav({ active, hotels, hotelId }: { active: (typeof ITEMS)[number]['key']; hotels?: HotelOption[]; hotelId?: string }) {
  const q = hotelId && hotels && hotels.length > 1 ? `?hotel=${hotelId}` : '';
  return (
    <div className="rooms-nav">
      <nav className="ph-switch rooms-tabs" aria-label="Rooms">
        {ITEMS.map((i) => (
          <Link key={i.key} href={i.href + (i.key === 'settings' ? '' : q)} className={i.key === active ? 'on' : ''} aria-current={i.key === active ? 'page' : undefined}>
            {i.label}
          </Link>
        ))}
      </nav>
      <div className="rooms-nav-right">
        {hotels && hotels.length > 1 && (
          <form method="get" className="hotel-pick">
            <select name="hotel" defaultValue={hotelId} aria-label="Hotel">
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                  {h.active ? '' : ' (off)'}
                </option>
              ))}
            </select>
            <button type="submit" className="btn small">
              Show
            </button>
          </form>
        )}
        {active !== 'settings' && hotelId && (
          <Link href={`/staff/rooms/bookings/new?hotel=${hotelId}`} className="btn primary small new-booking">
            + New booking
          </Link>
        )}
      </div>
    </div>
  );
}
