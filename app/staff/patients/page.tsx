import Link from 'next/link';
import { requireStaff } from '@/lib/staff';
import { searchPatients } from '@/lib/staffData';
import { ageOf, dayLabel, GENDER, phone } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';

export const dynamic = 'force-dynamic';

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const staff = await requireStaff();
  const { q = '' } = await searchParams;
  const query = q.trim().slice(0, 60);
  const rows = query.length >= 2 ? await searchPatients(query) : [];

  return (
    <StaffShell staff={staff} active="patients">
      <h1 className="step-title">Patients</h1>
      <form className="day-pick" method="get" role="search">
        <label htmlFor="q">Search by name, patient ID or phone</label>
        <div className="manual-row">
          <input id="q" name="q" defaultValue={query} placeholder="Meera, NYL1042 or 98765" autoComplete="off" autoFocus />
          <button type="submit" className="btn primary">
            Search
          </button>
        </div>
      </form>

      {query.length >= 2 &&
        (rows.length === 0 ? (
          <p className="empty">No patients found for “{query}”.</p>
        ) : (
          <ul className="results">
            {rows.map((r) => (
              <li key={r.patient_code}>
                <Link href={`/staff/patients/${r.patient_code}`}>
                  <span className="g-name">{r.full_name}</span> <small>{r.patient_code}</small>
                  <span className="g-meta">
                    {[ageOf(r.dob) !== null ? `${ageOf(r.dob)} yrs` : '', GENDER[r.gender ?? ''] ?? '', r.city ?? '', phone(r.wa_phone)]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                  <span className="g-meta">{r.last_visit ? `Last visit ${dayLabel(r.last_visit, true)}` : 'No visits yet'}</span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
      {query.length >= 2 && rows.length === 30 && <p className="hint">Showing the first 30. Type more to narrow it down.</p>}
    </StaffShell>
  );
}
