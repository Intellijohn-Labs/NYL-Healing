import Link from 'next/link';
import type { Staff } from '@/lib/staff';
import { logout } from '@/app/staff/actions';

const ICONS: Record<string, React.ReactNode> = {
  scan: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <rect x="8" y="8" width="3" height="3" rx=".5" />
      <rect x="13" y="8" width="3" height="3" rx=".5" />
      <rect x="8" y="13" width="3" height="3" rx=".5" />
      <path d="M13 13h3v3" />
    </>
  ),
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  bookings: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M8.5 10h7M8.5 13.5h7M8.5 17h4" />
    </>
  ),
  patients: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
      <circle cx="16.5" cy="9.5" r="2.3" />
      <path d="M15.5 14.6c2.3.1 4.1 1.4 4.8 3.9" />
    </>
  ),
  days: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4" />
    </>
  ),
};

const TABS = [
  { key: 'scan', href: '/staff/scan', label: 'Scan' },
  { key: 'today', href: '/staff/today', label: 'Today' },
  { key: 'bookings', href: '/staff/bookings', label: 'Bookings' },
  { key: 'patients', href: '/staff/patients', label: 'Patients' },
  { key: 'days', href: '/staff/days', label: 'Days' },
] as const;

export type Tab = (typeof TABS)[number]['key'];

export function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export default function StaffShell({ staff, active, children }: { staff: Staff; active: Tab; children: React.ReactNode }) {
  return (
    <main className="shell staff-shell">
      <header className="staff-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nyl-emblem.png" alt="NYL Healing" width={40} height={40} />
        <div className="staff-title">
          <p>NYL Reception</p>
          <span>{staff.name}</span>
        </div>
        <form action={logout}>
          <button type="submit" className="icon-btn" aria-label="Sign out" title="Sign out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4" />
            </svg>
          </button>
        </form>
      </header>

      {children}

      <nav className="tabbar" aria-label="Reception">
        {TABS.map((t) => (
          <Link key={t.key} href={t.href} className={t.key === active ? 'on' : ''} aria-current={t.key === active ? 'page' : undefined}>
            <Icon name={t.key} />
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
