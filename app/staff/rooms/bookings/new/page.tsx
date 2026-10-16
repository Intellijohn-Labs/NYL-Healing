import Link from 'next/link';
import { requireStaff, ROOM_SETTINGS_ROLES } from '@/lib/staff';
import { bookableTypes, pickHotelCard, typePhotos } from '@/lib/roomBookings';
import { db } from '@/lib/supabase';
import { todayIST } from '@/lib/format';
import RoomsShell from '@/components/staff/RoomsShell';
import HotelCard from '@/components/staff/HotelCard';
import NewBookingForm from './NewBookingForm';

export const dynamic = 'force-dynamic';

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ hotel?: string; type?: string; room?: string; in?: string }>;
}) {
  const staff = await requireStaff(ROOM_SETTINGS_ROLES);
  const sp = await searchParams;
  const { cards, hotel } = await pickHotelCard(sp.hotel);
  if (!hotel) {
    return (
      <RoomsShell staff={staff} active="new">
        <h1 className="step-title">New booking</h1>
        <p className="empty">
          No hotels yet. Add one in <Link href="/staff/rooms/settings">Settings</Link>.
        </p>
      </RoomsShell>
    );
  }
  const [photos, types, { data: h }, { data: rooms }] = await Promise.all([
    typePhotos(hotel.id),
    bookableTypes(hotel.id),
    db().from('hotels').select('advance_type, advance_value, hold_hours, checkin_time, checkout_time').eq('id', hotel.id).single(),
    db().from('hotel_rooms').select('id, label, room_type_id').eq('hotel_id', hotel.id).eq('active', true).order('sort_order').order('label'),
  ]);
  return (
    <RoomsShell staff={staff} active="new" hotelId={hotel.id} multiHotel={cards.length > 1}>
      <HotelCard hotel={hotel} cards={cards} subtitle="New booking" path="/staff/rooms/bookings/new" compact />
      {types.length === 0 ? (
        <p className="empty">
          No bookable room types. Add them in <Link href={`/staff/rooms/${hotel.id}`}>Settings</Link>.
        </p>
      ) : (
        <NewBookingForm
          hotelName={hotel.name}
          types={types}
          photos={photos}
          rooms={rooms ?? []}
          rules={h!}
          today={todayIST()}
          initial={{ type: sp.type ?? '', room: sp.room ?? '', checkIn: sp.in ?? '' }}
        />
      )}
    </RoomsShell>
  );
}
