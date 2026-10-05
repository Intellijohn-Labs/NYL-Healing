import { requireStaff } from '@/lib/staff';
import { todayCheckins, logout } from '../actions';
import Scanner from './Scanner';

export const dynamic = 'force-dynamic';

export default async function ScanPage() {
  const staff = await requireStaff();
  const today = await todayCheckins();
  return (
    <main className="shell scan-shell">
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
      <Scanner initialToday={today} />
    </main>
  );
}
