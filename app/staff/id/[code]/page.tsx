import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FRONT_DESK_ROLES, requireStaff } from '@/lib/staff';
import { idCard } from '@/lib/idCard';
import { db } from '@/lib/supabase';
import { ID_BUCKET, idTypeLabel } from '@/lib/idDocs';
import { dayLabel, timeOf } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';
import { verifyId } from '../actions';

export const dynamic = 'force-dynamic';

// The page that patients.id_card_url points to. Only signed-in owner, reception and gate staff can open it;
// the photo itself is shown through a private link that works for 5 minutes.
export default async function IdCardPage({ params }: { params: Promise<{ code: string }> }) {
  const staff = await requireStaff(FRONT_DESK_ROLES);
  const { code } = await params;
  if (!/^[A-Za-z0-9-]{3,20}$/.test(code)) notFound();
  const c = await idCard(code);
  if (!c) notFound();

  let photo: string | null = null;
  if (c.id_doc_path && !c.id_deleted_at) {
    const { data } = await db().storage.from(ID_BUCKET).createSignedUrl(c.id_doc_path, 300);
    photo = data?.signedUrl ?? null;
  }
  const when = (iso: string | null) => (iso ? `${dayLabel(iso.slice(0, 10))} ${timeOf(iso)}` : '');

  return (
    <StaffShell staff={staff} active="patients">
      <p className="hint">
        <Link href={`/staff/patients/${c.patient_code}`}>← Patient details</Link>
      </p>
      <div className="review-hd">
        <h1 className="step-title">{c.full_name}</h1>
        <p className="result-id">{c.patient_code}</p>
      </div>

      <section className="review-card idc">
        <p className="idc-type">{c.id_type ? idTypeLabel(c.id_type) : 'No ID uploaded'}</p>
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={`ID card of ${c.full_name}`} className="idc-photo" />
            <p className="hint">Uploaded {when(c.id_uploaded_at)}. This photo is deleted after verification, or 2 days after the registration day.</p>
          </>
        ) : c.id_deleted_at ? (
          <p className="idc-gone">
            ID photo deleted on {when(c.id_deleted_at)}
            {c.verified_by ? ` (verified by ${c.verified_by})` : ''}.
          </p>
        ) : (
          <p className="idc-gone">{c.needs_id ? 'No ID photo for this patient.' : 'No ID needed (under 15).'}</p>
        )}

        {c.id_verified_at ? (
          <p className="seat-ok">
            ✓ ID verified by {c.verified_by ?? 'staff'} on {when(c.id_verified_at)}
          </p>
        ) : (
          photo && (
            <form action={verifyId} className="idc-verify">
              <input type="hidden" name="code" value={c.patient_code} />
              <button type="submit" className="btn primary">
                ✓ ID verified
              </button>
              <span className="hint">Tap after comparing the ID with the patient. The photo is then deleted.</span>
            </form>
          )
        )}
      </section>
    </StaffShell>
  );
}
