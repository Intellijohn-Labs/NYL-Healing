import Link from 'next/link';
import { requireStaff } from '@/lib/staff';
import { searchPatients } from '@/lib/staffData';
import { ageOf, dayLabel, GENDER, phone } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';
import { DISEASES, diseaseLabel, isDisease } from '@/lib/diseases';

export const dynamic = 'force-dynamic';

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string; disease?: string }> }) {
  const staff = await requireStaff();
  const { q = '', disease = '' } = await searchParams;
  const query = q.trim().slice(0, 60);
  const dis = isDisease(disease) ? disease : '';
  const searching = query.length >= 2 || !!dis;
  const rows = searching ? await searchPatients(query, dis) : [];
  const what = [query && `“${query}”`, dis && diseaseLabel(dis)].filter(Boolean).join(' + ');

  return (
    <StaffShell staff={staff} active="patients">
      <h1 className="step-title">Patients</h1>
      <form className="day-pick" method="get" role="search">
        <label htmlFor="q">Search by name, patient ID or phone</label>
        <input id="q" name="q" defaultValue={query} placeholder="Meera, NYL1042 or 98765" autoComplete="off" />
        <label htmlFor="disease">Disease</label>
        <div className="manual-row">
          <select id="disease" name="disease" defaultValue={dis} className="dis-select">
            <option value="">Any disease</option>
            {DISEASES.map((d) => (
              <option key={d} value={d}>
                {diseaseLabel(d)}
              </option>
            ))}
          </select>
          <button type="submit" className="btn primary">
            Search
          </button>
        </div>
        <p className="hint">Choose only a disease to list every patient with it, or combine it with a name.</p>
      </form>

      {searching && rows.length > 0 && (
        <p className="hint">
          {rows.length === 100 ? 'First 100' : rows.length} patient{rows.length === 1 ? '' : 's'} for {what}
        </p>
      )}
      {searching &&
        (rows.length === 0 ? (
          <p className="empty">No patients found for {what}.</p>
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
                  {r.diseases.length > 0 && (
                    <span className="g-meta">{r.diseases.map((d) => diseaseLabel(d)).join(', ')}</span>
                  )}
                  <span className="g-meta">{r.last_visit ? `Last visit ${dayLabel(r.last_visit, true)}` : 'No visits yet'}</span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
      {searching && rows.length === 100 && <p className="hint">Showing the first 100. Add a name to narrow it down.</p>}
    </StaffShell>
  );
}
