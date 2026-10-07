import Link from 'next/link';
import { requireStaff } from '@/lib/staff';
import { listSlots } from '@/lib/staffData';
import { dayLabel, todayIST } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';
import SlotForm from './SlotForm';

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
      <p className="hint">
        New patients choose from the open days below. &quot;Closed&quot; hides a day from the form but keeps its bookings.
      </p>

      <section className="review-card">
        <h2 className="card-h">Add a registration day</h2>
        <SlotForm minDate={today} />
      </section>

      <h2 className="list-h">Upcoming</h2>
      {upcoming.length === 0 ? (
        <p className="empty">No upcoming registration days. New patients can&apos;t register until one is added.</p>
      ) : (
        <div className="groups">
          {upcoming.map((s) => (
            <section className={`group ${s.status !== 'open' ? 'muted' : ''}`} key={s.id}>
              <div className="group-hd">
                <p className="g-name">{dayLabel(s.slot_date, true)}</p>
                <Link href={`/staff/bookings?date=${s.slot_date}`} className="tag">
                  {s.booked}/{s.capacity} booked →
                </Link>
              </div>
              <SlotForm slot={s} minDate={today} />
            </section>
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
