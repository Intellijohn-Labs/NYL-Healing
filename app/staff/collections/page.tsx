import Link from 'next/link';
import { requireStaff } from '@/lib/staff';
import { collections, isDay, summarise } from '@/lib/collections';
import { dayLabel, phone, rupees, timeOf, todayIST } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';

export const dynamic = 'force-dynamic';

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

// Registration fees collected at reception (offline class): by day and by staff member, with a download
export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const today = todayIST();
  let from = isDay(sp.from) ? sp.from : today;
  let to = isDay(sp.to) ? sp.to : from;
  if (to < from) [from, to] = [to, from];
  const rows = await collections(from, to);
  const s = summarise(rows);
  const oneDay = from === to;
  const monthStart = today.slice(0, 8) + '01';
  const quick: [string, string, string][] = [
    ['Today', today, today],
    ['Yesterday', addDays(today, -1), addDays(today, -1)],
    ['This month', monthStart, today],
  ];

  return (
    <StaffShell staff={staff} active="today">
      <p className="hint">
        <Link href="/staff/today">← Today</Link>
      </p>
      <h1 className="step-title">Collections</h1>
      <p className="hint">Registration fees for the class, paid at reception and marked paid in the staff app.</p>

      <div className="col-quick">
        {quick.map(([label, f, t]) => (
          <Link key={label} href={`/staff/collections?from=${f}&to=${t}`} className={`btn small ${from === f && to === t ? 'on' : ''}`}>
            {label}
          </Link>
        ))}
      </div>
      <form method="get" className="col-range" key={`${from}-${to}`}>
        <label className="rf">
          <span className="rf-l">From</span>
          <input type="date" name="from" defaultValue={from} max={today} />
        </label>
        <label className="rf">
          <span className="rf-l">To</span>
          <input type="date" name="to" defaultValue={to} max={today} />
        </label>
        <button type="submit" className="btn primary">
          Show
        </button>
      </form>

      <div className="stats">
        <div className="stat">
          <p className="stat-n">{rupees(s.total)}</p>
          <p className="stat-l">Collected {oneDay ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(to)}`}</p>
        </div>
        <div className="stat">
          <p className="stat-n">{s.count}</p>
          <p className="stat-l">Payments</p>
        </div>
      </div>

      {rows.length > 0 && (
        <p className="col-dl">
          <a className="btn small" href={`/staff/collections/download?from=${from}&to=${to}`}>
            ⬇ Download (Excel / CSV)
          </a>
        </p>
      )}

      {s.byStaff.length > 0 && (
        <section className="review-card">
          <h2 className="card-h">By staff member</h2>
          <dl>
            {s.byStaff.map((x) => (
              <div key={x.name} className="dl-row">
                <dt>{x.name}</dt>
                <dd>
                  <b>{rupees(x.amount)}</b> · {x.count} payment{x.count === 1 ? '' : 's'}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {!oneDay && s.byDay.length > 0 && (
        <section className="review-card">
          <h2 className="card-h">By day</h2>
          <dl>
            {s.byDay.map((x) => (
              <div key={x.day} className="dl-row">
                <dt>
                  <Link href={`/staff/collections?from=${x.day}&to=${x.day}`}>{dayLabel(x.day)}</Link>
                </dt>
                <dd>
                  <b>{rupees(x.amount)}</b> · {x.count} payment{x.count === 1 ? '' : 's'}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="today">
        <h2>
          Payments <span>{rows.length}</span>
        </h2>
        {rows.length === 0 ? (
          <p className="hint">No payments marked {oneDay ? 'on this day' : 'in these days'}.</p>
        ) : (
          <ol>
            {rows.map((r) => (
              <li key={r.group_id} className="col-row">
                <span className="t-time">
                  {oneDay ? '' : dayLabel(r.paid_day) + ' '}
                  {timeOf(r.paid_at)}
                </span>
                <span className="t-name">
                  {r.patients || '–'}
                  <span className="g-meta">
                    {r.patient_count > 1 ? `Family of ${r.patient_count} · ` : ''}
                    {r.slot_date ? `Registration day ${dayLabel(r.slot_date)} · ` : ''}
                    {r.wa_phone ? phone(r.wa_phone) + ' · ' : ''}by {r.paid_by}
                  </span>
                </span>
                <span className="col-amt">{rupees(r.amount)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </StaffShell>
  );
}
