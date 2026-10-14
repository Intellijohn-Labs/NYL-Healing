import Link from 'next/link';
import { HEALER_ROLES, requireStaff } from '@/lib/staff';
import { logout } from '@/app/staff/actions';
import HealingBoard from './HealingBoard';

export const dynamic = 'force-dynamic';

// The healers' screen: each healing time's patients with their photos. Full width, for phones, laptops and the TV.
export default async function HealingPage() {
  const staff = await requireStaff(HEALER_ROLES);
  return (
    <main className="hb-page">
      <header className="hb-top">
        <div className="hb-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nyl-emblem.png" alt="" width={40} height={40} />
          <div>
            <p className="hb-title">NYL Photo Healing</p>
            <p className="hb-who">{staff.name}</p>
          </div>
        </div>
        <div className="hb-top-actions">
          {staff.role !== 'healer' && (
            <Link href="/staff/photo-healing" className="btn small">
              ← Staff app
            </Link>
          )}
          <form action={logout}>
            <button type="submit" className="icon-btn" aria-label="Sign out" title="Sign out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4" />
              </svg>
            </button>
          </form>
        </div>
      </header>
      <HealingBoard />
    </main>
  );
}
