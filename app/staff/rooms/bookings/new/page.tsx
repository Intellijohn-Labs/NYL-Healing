import Link from 'next/link';
import { requireStaff, ROOM_SETTINGS_ROLES } from '@/lib/staff';
import { bookableTypes, pickHotel } from '@/lib/roomBookings';
import { db } from '@/lib/supabase';
import { todayIST } from '@/lib/format';
import StaffShell from '@/components/staff/StaffShell';
import RoomsNav from '@/components/staff/RoomsNav';
import NewBookingForm from './NewBookingForm';

export const dynamic = 'force-dynamic';

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ hotel?: string; type?: string; room?: string; in?: string }>;
}) {
  const staff = await requireStaff(ROOM_SETTINGS_ROLES);
  const sp = await searchParams;
  const { hotels, hotel } = await pickHotel(sp.hotel);
  if (!hotel) {
    return (
      <StaffShell staff={staff} active="rooms">
        <h1 className="step-title">New booking</h1>
        <p className="empty">
          No hotels yet. Add one in <Link href="/staff/rooms/settings">Settings</Link>.
        </p>
      </StaffShell>
    );
  }
  const [types, { data: h }, { data: rooms }] = await Promise.all([
    bookableTypes(hotel.id),
    db().from('hotels').select('advance_type, advance_value, hold_hours, checkin_time, checkout_time').eq('id', hotel.id).single(),
    db().from('hotel_rooms').select('id, label, room_type_id').eq('hotel_id', hotel.id).eq('active', true).order('sort_order').order('label'),
  ]);
  return (
    <StaffShell staff={staff} active="rooms">
      <h1 className="step-title">New booking</h1>
      <RoomsNav active="bookings" hotels={hotels} hotelId={hotel.id} />
      {types.length === 0 ? (
        <p className="empty">
          No bookable room types. Add them in <Link href={`/staff/rooms/${hotel.id}`}>Settings</Link>.
        </p>
      ) : (
        <NewBookingForm
          hotelName={hotel.name}
          types={types}
          rooms={rooms ?? []}
          rules={h!}
          today={todayIST()}
          initial={{ type: sp.type ?? '', room: sp.room ?? '', checkIn: sp.in ?? '' }}
        />
      )}
    </StaffShell>
  );
}
