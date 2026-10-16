import Link from 'next/link';
import { HEALER_ROLES, requireStaff } from '@/lib/staff';
import UserMenu from '@/components/staff/UserMenu';
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
          </div>
        </div>
        <div className="hb-top-actions">
          {staff.role !== 'healer' && (
            <Link href="/staff/photo-healing" className="btn small">
              ← Staff app
            </Link>
          )}
          <UserMenu name={staff.name} role={staff.role} />
        </div>
      </header>
      <HealingBoard />
    </main>
  );
}
