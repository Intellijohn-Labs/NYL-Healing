import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff, ROOM_SETTINGS_ROLES } from '@/lib/staff';
import { getHotel } from '@/lib/rooms';
import StaffShell from '@/components/staff/StaffShell';
import { AddRoomType, AddRoomsForm, HotelForm, RoomRow, RoomTypeCard } from '../forms';

export const dynamic = 'force-dynamic';

export default async function HotelPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(ROOM_SETTINGS_ROLES);
  const { id } = await params;
  const data = await getHotel(id);
  if (!data) notFound();
  const { hotel, types, rooms, blocks } = data;
  const activeRooms = rooms.filter((r) => r.active).length;

  return (
    <StaffShell staff={staff} active="rooms">
      <p className="hint">
        <Link href="/staff/rooms/settings">← All hotels</Link>
      </p>
      <div className="review-hd">
        <h1 className="step-title">{hotel.name}</h1>
        <span className={`status-pill ${hotel.active ? 's-open' : 's-closed'}`}>{hotel.active ? 'Open for booking' : 'Off'}</span>
      </div>
      <nav className="jump" aria-label="On this page">
        <a href="#types">Room types ({types.length})</a>
        <a href="#rooms">Rooms ({activeRooms})</a>
        <a href="#details">Hotel details</a>
      </nav>

      <section id="types" className="rsection">
        <h2 className="list-h">Room types and prices</h2>
        {types.length === 0 ? (
          <p className="empty">No room types yet. Add one, for example &quot;AC Double&quot;, with its price.</p>
        ) : (
          <div className="day-list">
            {types.map((t) => (
              <RoomTypeCard key={t.id} type={t} roomCount={rooms.filter((r) => r.room_type_id === t.id && r.active).length} />
            ))}
          </div>
        )}
        <div className="rsection-foot">
          <AddRoomType hotelId={hotel.id} />
        </div>
      </section>

      <section id="rooms" className="rsection">
        <h2 className="list-h">Rooms</h2>
        {rooms.length > 0 && (
          <ul className="room-list">
            {rooms.map((r) => (
              <RoomRow key={r.id} room={r} types={types} blocks={blocks.filter((b) => b.room_id === r.id)} />
            ))}
          </ul>
        )}
        <AddRoomsForm hotelId={hotel.id} types={types} />
      </section>

      <section id="details" className="rsection">
        <h2 className="list-h">Hotel details and rules</h2>
        <div className="review-card">
          <HotelForm hotel={hotel} />
        </div>
      </section>
    </StaffShell>
  );
}
