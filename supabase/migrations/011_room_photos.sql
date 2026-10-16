-- NYL rooms: photos of each room type and of the hotel itself.
--   * files go in the PUBLIC storage bucket `room-photos` (not private: patients see them when booking).
--     This is separate from the private `nyl-photos` bucket with patient photos.
--   * room_type_id = null means a photo of the hotel (building, entrance, reception...)
--   * the photo with the lowest sort_order is the cover
-- Run after 001 to 010. Safe to run again.

insert into storage.buckets (id, name, public)
values ('room-photos', 'room-photos', true)
on conflict (id) do update set public = true;

create table if not exists room_photos (
  id            uuid primary key default gen_random_uuid(),
  hotel_id      uuid not null references hotels(id) on delete cascade,
  room_type_id  uuid references room_types(id) on delete cascade,
  storage_path  text not null unique,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  created_by    uuid references staff_users(id)
);
create index if not exists room_photos_hotel_idx on room_photos (hotel_id, room_type_id, sort_order);
alter table room_photos enable row level security;
