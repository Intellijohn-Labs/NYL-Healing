import Link from 'next/link';
import { requireStaff } from '@/lib/staff';
import { todaySummary } from '@/lib/staffData';
import { dayLabel, rupees, timeOf } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const staff = await requireStaff();
  const t = await todaySummary(staff.centre_id ?? 1);
  const seatsFree = t.seats_total > 0 ? t.seats_total - t.with_seat : null;

  return (
    <StaffShell staff={staff} active="today">
      <h1 className="step-title">Today, {dayLabel(t.date)}</h1>

      <div className="stats">
        <div className="stat">
          <p className="stat-n">{t.checked_in}</p>
          <p className="stat-l">Checked in</p>
        </div>
        <div className="stat">
          <p className="stat-n">{seatsFree ?? t.with_seat}</p>
          <p className="stat-l">{seatsFree !== null ? `Seats free of ${t.seats_total}` : 'Seats given'}</p>
        </div>
        <div className="stat">
          <p className="stat-n">{t.registrations}</p>
          <p className="stat-l">New registrations today</p>
        </div>
        <div className={`stat ${t.fees_pending > 0 ? 'warn' : ''}`}>
          <p className="stat-n">{rupees(t.fees_pending)}</p>
          <p className="stat-l">Fees still to collect</p>
        </div>
      </div>

      {t.registrations > 0 && (
        <p className="hint">
          <Link href={`/staff/bookings?date=${t.date}`}>See today&apos;s new registrations and payments →</Link>
        </p>
      )}

      <section className="today">
        <h2>
          Checked in <span>{t.checkins.length}</span>
        </h2>
        {t.checkins.length === 0 ? (
          <p className="hint">No one yet.</p>
        ) : (
          <ol>
            {t.checkins.map((r) => (
              <li key={r.attendance_id}>
                <span className="t-time">{timeOf(r.checked_in_at)}</span>
                <span className="t-name">
                  <Link href={`/staff/patients/${r.patient_code}`}>{r.full_name}</Link> <small>{r.patient_code}</small>
                  {r.registration_today && <em className="tag">New</em>}
                  {r.payment_status === 'pending' && r.payment_method === 'offline' && <em className="tag warn">Fee due</em>}
                </span>
                <span className={`t-seat ${r.seat ? '' : 'none'}`}>{r.seat ?? 'No seat'}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </StaffShell>
  );
}
