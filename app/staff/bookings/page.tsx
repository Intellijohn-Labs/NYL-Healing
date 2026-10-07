import Link from 'next/link';
import { requireStaff } from '@/lib/staff';
import { dayBookings, listSlots } from '@/lib/staffData';
import { ageOf, dayLabel, FOR, GENDER, phone, rupees, slotTime, todayIST } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';
import MarkPaidButton from '@/components/staff/MarkPaidButton';

export const dynamic = 'force-dynamic';

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const staff = await requireStaff();
  const centre = staff.centre_id ?? 1;
  const slots = await listSlots(centre);
  const { date: asked } = await searchParams;
  const today = todayIST();
  // Default: today if it's a registration day, otherwise the next one
  const date =
    asked && /^\d{4}-\d{2}-\d{2}$/.test(asked)
      ? asked
      : (slots.find((s) => s.slot_date >= today)?.slot_date ?? today);
  const b = await dayBookings(date, centre);
  const people = b.groups.reduce((n, g) => n + g.patients.length, 0);
  const due = b.groups.filter((g) => g.payment_status === 'pending' && g.payment_method === 'offline');

  return (
    <StaffShell staff={staff} active="bookings">
      <h1 className="step-title">Bookings</h1>

      <form className="day-pick" method="get">
        <label htmlFor="date">Registration day</label>
        <div className="manual-row">
          <input id="date" name="date" type="date" defaultValue={date} />
          <button type="submit" className="btn primary">
            Show
          </button>
        </div>
      </form>
      {slots.length > 0 && (
        <div className="day-chips">
          {slots
            .filter((s) => s.slot_date >= today)
            .slice(0, 6)
            .map((s) => (
              <Link key={s.id} href={`/staff/bookings?date=${s.slot_date}`} className={`seat-chip ${s.slot_date === date ? 'on' : ''}`}>
                {dayLabel(s.slot_date)} ({s.booked}/{s.capacity})
              </Link>
            ))}
        </div>
      )}

      {!b.slot ? (
        <p className="empty">{dayLabel(date, true)} isn&apos;t a registration day.</p>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <p className="stat-n">
                {people}/{b.slot.capacity}
              </p>
              <p className="stat-l">Booked{b.slot.status !== 'open' ? ` (day ${b.slot.status})` : ''}</p>
            </div>
            <div className="stat">
              <p className="stat-n">{b.groups.reduce((n, g) => n + g.patients.filter((p) => p.checked_in).length, 0)}</p>
              <p className="stat-l">Arrived</p>
            </div>
            <div className={`stat ${due.length ? 'warn' : ''}`}>
              <p className="stat-n">{rupees(due.reduce((n, g) => n + g.amount_due, 0))}</p>
              <p className="stat-l">Fees to collect</p>
            </div>
          </div>
          <p className="hint">
            {dayLabel(b.slot.slot_date, true)}
            {b.slot.starts_at ? `, ${slotTime(b.slot.starts_at)}` : ''}
          </p>

          {b.groups.length === 0 ? (
            <p className="empty">No one has booked this day yet.</p>
          ) : (
            <div className="groups">
              {b.groups.map((g) => (
                <section className="group" key={g.group_id}>
                  <div className="group-hd">
                    <p>
                      {g.patients.length > 1 ? `${g.patients.length} people, ` : ''}
                      {g.payment_status === 'paid' ? (
                        <span className="tag ok">Paid {rupees(g.amount_due)}</span>
                      ) : g.payment_method === 'offline' ? (
                        <span className="tag warn">To collect {rupees(g.amount_due)}</span>
                      ) : (
                        <span className="tag">Online, {g.payment_status}</span>
                      )}
                    </p>
                    {g.payment_status === 'pending' && g.payment_method === 'offline' && (
                      <MarkPaidButton groupId={g.group_id} amount={g.amount_due} />
                    )}
                  </div>
                  <ul>
                    {g.patients.map((p) => (
                      <li key={p.patient_code}>
                        <div>
                          <Link href={`/staff/patients/${p.patient_code}`} className="g-name">
                            {p.full_name}
                          </Link>{' '}
                          <small>{p.patient_code}</small>
                          <p className="g-meta">
                            {[ageOf(p.dob) !== null ? `${ageOf(p.dob)} yrs` : '', GENDER[p.gender ?? ''] ?? '', p.city ?? '']
                              .filter(Boolean)
                              .join(', ')}
                            {p.registering_for && p.registering_for !== 'self' ? ` (registered as: ${FOR[p.registering_for]})` : ''}
                          </p>
                          <p className="g-meta">
                            WhatsApp {phone(p.wa_phone)}
                            {p.guardian_name ? `, guardian ${p.guardian_name} ${phone(p.guardian_phone)}` : ''}
                          </p>
                        </div>
                        <span className={`arrival ${p.checked_in ? 'in' : ''}`}>
                          {p.checked_in ? (p.seat ? `Arrived · ${p.seat}` : 'Arrived') : 'Not arrived'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </StaffShell>
  );
}
