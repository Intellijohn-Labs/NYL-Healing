import { redirect } from 'next/navigation';
import { getStaff, homeFor } from '@/lib/staff';

export const dynamic = 'force-dynamic';

export default async function StaffHome() {
  const staff = await getStaff();
  redirect(staff ? homeFor(staff.role) : '/staff/login');
}
