import { NextResponse } from 'next/server';
import { FRONT_DESK_ROLES, staffWithRole } from '@/lib/staff';
import { paymentList } from '@/lib/payments';

export const dynamic = 'force-dynamic';

// For the banner on staff screens: how many receipts are waiting, and how many of them are emergencies
export async function GET() {
  if (!(await staffWithRole(FRONT_DESK_ROLES))) return NextResponse.json({ total: 0, emergency: 0 }, { status: 401 });
  try {
    const { receipts } = await paymentList();
    return NextResponse.json({ total: receipts.length, emergency: receipts.filter((r) => r.is_emergency).length });
  } catch {
    return NextResponse.json({ total: 0, emergency: 0 });
  }
}
