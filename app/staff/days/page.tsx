import Link from 'next/link';
import { requireStaff } from '@/lib/staff';
import { listSlots } from '@/lib/staffData';
import { dayLabel, todayIST } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';
import AddDay from './AddDay';
import DayRow from './DayRow';

export const dynamic = 'force-dynamic';

export default async function DaysPage() {
  const staff = await requireStaff();
  const slots = await listSlots(staff.centre_id ?? 1);
  const today = todayIST();
  const upcoming = slots.filter((s) => s.slot_date >= today);
  const past = slots.filter((s) => s.slot_date < today).reverse();

  return (
    <StaffShell staff={staff} active="days">
      <h1 className="step-title">Registration days</h1>
      <p className="hint page-intro">
        New patients choose from the open days. &quot;Closed&quot; hides a day from the form but keeps its bookings.
      </p>

      <AddDay minDate={today} />

      <h2 className="list-h">Upcoming</h2>
      {upcoming.length === 0 ? (
        <p className="empty">No upcoming registration days. New patients can&apos;t register until one is added.</p>
      ) : (
        <div className="day-list">
          {upcoming.map((s) => (
            <DayRow key={s.id} slot={s} minDate={today} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="list-h">Last 30 days</h2>
          <section className="today">
            <ol>
              {past.map((s) => (
                <li key={s.id}>
                  <span className="t-time">{s.status}</span>
                  <span className="t-name">
                    <Link href={`/staff/bookings?date=${s.slot_date}`}>{dayLabel(s.slot_date, true)}</Link>
                  </span>
                  <span className="t-seat">
                    {s.booked}/{s.capacity}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </StaffShell>
  );
}
