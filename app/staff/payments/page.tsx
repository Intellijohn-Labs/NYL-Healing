import { requireStaff } from '@/lib/staff';
import { paymentList } from '@/lib/payments';
import { db } from '@/lib/supabase';
import { PHOTO_BUCKET } from '@/lib/healing';
import StaffShell from '@/components/staff/StaffShell';
import PaymentsBoard from './PaymentsBoard';

export const dynamic = 'force-dynamic';

// Photo healing payments sent in WhatsApp (screenshot + UTR), to be checked against NYL's bank / UPI app
export default async function PaymentsPage() {
  const staff = await requireStaff();
  const { receipts, waiting_receipt } = await paymentList();
  const paths = receipts.map((r) => r.screenshot_path).filter((p): p is string => !!p);
  const links: Record<string, string> = {};
  if (paths.length) {
    const { data } = await db().storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
    for (const s of data ?? []) if (s.signedUrl && s.path) links[s.path] = s.signedUrl;
  }
  return (
    <StaffShell staff={staff} active="photo">
      <h1 className="step-title">Payments to verify</h1>
      <p className="hint">
        Photo healing payments sent in WhatsApp. <b>Before tapping Verify, check that the money really arrived in NYL&apos;s bank or UPI app</b> with the
        same amount and transaction ID (UTR). Screenshots can be faked.
      </p>
      <PaymentsBoard receipts={receipts.map((r) => ({ ...r, shot: r.screenshot_path ? (links[r.screenshot_path] ?? null) : null }))} waiting={waiting_receipt} />
    </StaffShell>
  );
}
