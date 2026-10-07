import Link from 'next/link';
import type { Staff } from '@/lib/staff';
import { logout } from '@/app/staff/actions';

const TABS = [
  { key: 'scan', href: '/staff/scan', label: 'Scan' },
  { key: 'today', href: '/staff/today', label: 'Today' },
  { key: 'bookings', href: '/staff/bookings', label: 'Bookings' },
  { key: 'patients', href: '/staff/patients', label: 'Patients' },
  { key: 'days', href: '/staff/days', label: 'Days' },
] as const;

export type Tab = (typeof TABS)[number]['key'];

export default function StaffShell({ staff, active, children }: { staff: Staff; active: Tab; children: React.ReactNode }) {
  return (
    <main className="shell staff-shell">
      <header className="brand">
        <div className="brand-l">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nyl-emblem.png" alt="" width={44} height={44} />
          <div>
            <p className="wordmark">NYL Reception</p>
            <p className="centre">Signed in as {staff.name}</p>
          </div>
        </div>
        <form action={logout}>
          <button type="submit" className="btn small">
            Sign out
          </button>
        </form>
      </header>
      <nav className="staff-nav" aria-label="Reception">
        {TABS.map((t) => (
          <Link key={t.key} href={t.href} className={t.key === active ? 'on' : ''} aria-current={t.key === active ? 'page' : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}
