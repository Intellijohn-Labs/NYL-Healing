import { requireStaff } from '@/lib/staff';
import StaffShell from '@/components/staff/StaffShell';
import { todayCheckins } from '../actions';
import Scanner from './Scanner';

export const dynamic = 'force-dynamic';

export default async function ScanPage() {
  const staff = await requireStaff();
  const today = await todayCheckins();
  return (
    <StaffShell staff={staff} active="scan">
      <Scanner initialToday={today} />
    </StaffShell>
  );
}
