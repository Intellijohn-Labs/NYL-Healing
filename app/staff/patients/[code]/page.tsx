import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/staff';
import { patientDetail } from '@/lib/staffData';
import { ageOf, dayLabel, FOR, GENDER, phone, relation, rupees, slotTime, timeOf } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';
import MarkPaidButton from '@/components/staff/MarkPaidButton';

export const dynamic = 'force-dynamic';

export default async function PatientPage({ params }: { params: Promise<{ code: string }> }) {
  const staff = await requireStaff();
  const { code } = await params;
  const p = await patientDetail(decodeURIComponent(code));
  if (!p) notFound();
  const age = ageOf(p.dob);
  // Health details are for reception and the owner, not gate staff
  const showHealth = staff.role !== 'gate';

  const rows: [string, string][] = [
    ['Age / gender', [age !== null ? `${age} yrs` : '', GENDER[p.gender ?? ''] ?? ''].filter(Boolean).join(', ')],
    ['Date of birth', p.dob ? dayLabel(p.dob, true) : ''],
    ['Town', p.city ?? ''],
    ['WhatsApp', phone(p.wa_phone)],
    ...(p.guardian_name
      ? ([
          ['Parent / guardian', `${p.guardian_name}${relation(p.guardian_relation) ? ` (${relation(p.guardian_relation)})` : ''}`],
          ['Guardian phone', phone(p.guardian_phone)],
        ] as [string, string][])
      : []),
    ['Registered', `${dayLabel(p.created_at.slice(0, 10), true)} (${p.source_channel === 'web' ? 'web form' : (p.source_channel ?? '')})`],
  ];

  return (
    <StaffShell staff={staff} active="patients">
      <p className="hint">
        <Link href="/staff/patients">← Back to search</Link>
      </p>
      <div className="review-hd">
        <h1 className="step-title">{p.full_name}</h1>
        <p className="result-id">{p.patient_code}</p>
      </div>

      <section className="review-card">
        <dl>
          {rows.map(([k, v]) => (
            <div key={k} className="dl-row">
              <dt>{k}</dt>
              <dd>{v || '–'}</dd>
            </div>
          ))}
        </dl>
        <p className="hint">
          <a href={`/p/${p.pass_token}`} target="_blank" rel="noopener">
            Open patient pass ↗
          </a>
        </p>
      </section>

      {showHealth && p.health && (
        <section className="review-card">
          <h2 className="card-h">Health details</h2>
          <dl>
            <div className="dl-row">
              <dt>Health problems</dt>
              <dd>{p.health.health_concerns}</dd>
            </div>
            {p.health.current_medicines && (
              <div className="dl-row">
                <dt>Medicines</dt>
                <dd>{p.health.current_medicines}</dd>
              </div>
            )}
            {p.health.other_notes && (
              <div className="dl-row">
                <dt>Notes</dt>
                <dd>{p.health.other_notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="review-card">
        <h2 className="card-h">Registration</h2>
        {p.registrations.length === 0 ? (
          <p className="hint">No registration day booked.</p>
        ) : (
          p.registrations.map((r, i) => (
            <div className="reg-row" key={i}>
              <div>
                <p className="g-name">
                  {dayLabel(r.slot_date, true)}
                  {r.starts_at ? `, ${slotTime(r.starts_at)}` : ''}
                </p>
                <p className="g-meta">
                  {r.registering_for ? `Registered as: ${FOR[r.registering_for]}` : ''}
                  {(r.group_size ?? 1) > 1 ? `, with ${(r.group_size ?? 1) - 1} other${(r.group_size ?? 1) > 2 ? 's' : ''}` : ''}
                </p>
                <p className="g-meta">
                  {r.payment_status === 'paid' ? (
                    <span className="tag ok">Paid {rupees(r.amount_due)}</span>
                  ) : r.payment_method === 'offline' ? (
                    <span className="tag warn">To collect {rupees(r.amount_due)}</span>
                  ) : r.payment_method ? (
                    <span className="tag">Online, {r.payment_status}</span>
                  ) : null}
                </p>
              </div>
              {r.group_id && r.payment_status === 'pending' && r.payment_method === 'offline' && (
                <MarkPaidButton groupId={r.group_id} amount={r.amount_due ?? 0} />
              )}
            </div>
          ))
        )}
      </section>

      <section className="today">
        <h2>
          Visits <span>{p.visits.length}</span>
        </h2>
        {p.visits.length === 0 ? (
          <p className="hint">No visits yet.</p>
        ) : (
          <ol>
            {p.visits.map((v) => (
              <li key={v.visit_date}>
                <span className="t-time">{timeOf(v.checked_in_at)}</span>
                <span className="t-name">{dayLabel(v.visit_date, true)}</span>
                <span className={`t-seat ${v.seat ? '' : 'none'}`}>{v.seat ?? 'No seat'}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </StaffShell>
  );
}
