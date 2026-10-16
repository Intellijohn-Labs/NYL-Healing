import Link from 'next/link';
import type { Staff } from '@/lib/staff';
import UserMenu from './UserMenu';

const I = {
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  bookings: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M8.5 10h7M8.5 13.5h7M8.5 17h4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
};

export type RoomsTab = 'today' | 'calendar' | 'new' | 'bookings' | 'settings';

// Layout for every Rooms screen: "NYL Rooms" header, signed-in box, and the Rooms menu at the bottom.
// The owner also gets "← Main menu" back to the reception screens.
export default function RoomsShell({
  staff,
  active,
  hotelId,
  multiHotel,
  children,
}: {
  staff: Staff;
  active: RoomsTab;
  hotelId?: string;
  multiHotel?: boolean;
  children: React.ReactNode;
}) {
  const q = hotelId && multiHotel ? `?hotel=${hotelId}` : '';
  const tab = (key: Exclude<RoomsTab, 'new'>, href: string, label: string) => (
    <Link href={href + q} className={active === key ? 'on' : ''} aria-current={active === key ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {I[key]}
      </svg>
      <span>{label}</span>
    </Link>
  );
  return (
    <main className="shell staff-shell">
      <header className="staff-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nyl-emblem.png" alt="NYL Healing" width={40} height={40} />
        <div className="staff-title">
          <p>NYL Rooms</p>
          {staff.role === 'owner' && (
            <Link href="/staff/scan" className="back-main">
              ← Main menu
            </Link>
          )}
        </div>
        <UserMenu name={staff.name} role={staff.role} />
      </header>

      {children}

      <nav className="tabbar rooms-bar" aria-label="Rooms menu">
        {tab('today', '/staff/rooms', 'Today')}
        {tab('calendar', '/staff/rooms/calendar', 'Calendar')}
        <Link
          href={`/staff/rooms/bookings/new${hotelId ? `?hotel=${hotelId}` : ''}`}
          className={`rb-plus ${active === 'new' ? 'on' : ''}`}
          aria-current={active === 'new' ? 'page' : undefined}
          aria-label="New booking"
        >
          <span className="rb-plus-c" aria-hidden="true">
            +
          </span>
          <span>New</span>
        </Link>
        {tab('bookings', '/staff/rooms/bookings', 'Bookings')}
        {tab('settings', '/staff/rooms/settings', 'Settings')}
      </nav>
    </main>
  );
}
