-- NYL rooms, step 1: settings that staff manage themselves (no code changes needed later)
--   * hotels, with their own times, advance rule, hold time, cancellation rule and UPI details
--   * room types, with one price per night (plus optional extra-guest and long-stay prices)
--   * individual rooms, and dates when a room is blocked
--   * a new staff role, rooms_manager, who can change these settings (as can the owner)
-- Run after 001 to 007. Safe to run again.

-- New role. (Must be run on its own line; it can't be used in the same transaction, and this file doesn't use it.)
alter type staff_role add value if not exists 'rooms_manager';

create table if not exists hotels (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  address            text,
  phone              text,
  maps_url           text,
  active             boolean not null default true,
  checkin_time       time not null default '12:00',
  checkout_time      time not null default '11:00',
  -- Advance: a fixed amount (rupees), a percent of the total, or the first N nights
  advance_type       text not null default 'fixed' check (advance_type in ('fixed', 'percent', 'nights')),
  advance_value      integer not null default 1000 check (advance_value >= 0),
  hold_hours         integer not null default 24 check (hold_hours between 1 and 168),
  free_cancel_days   integer not null default 2 check (free_cancel_days between 0 and 60),
  who_can_book       text not null default 'patients' check (who_can_book in ('patients', 'anyone')),
  upi_id             text,
  payment_note       text,          -- e.g. "Send the payment screenshot to 79077 82083"
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by         uuid references staff_users(id)
);

create table if not exists room_types (
  id                  uuid primary key default gen_random_uuid(),
  hotel_id            uuid not null references hotels(id) on delete cascade,
  name                text not null,
  description         text,
  facilities          text[] not null default '{}',
  max_guests          integer not null default 2 check (max_guests between 1 and 20),
  base_guests         integer not null default 2 check (base_guests between 1 and 20),  -- guests included in the price
  price_per_night     integer not null check (price_per_night >= 0),
  extra_guest_price   integer not null default 0 check (extra_guest_price >= 0),     -- per extra guest per night
  long_stay_nights    integer check (long_stay_nights between 2 and 365),             -- from this many nights...
  long_stay_price     integer check (long_stay_price >= 0),                           -- ...this price per night
  active              boolean not null default true,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references staff_users(id),
  check (base_guests <= max_guests),
  check ((long_stay_nights is null) = (long_stay_price is null))
);
create index if not exists room_types_hotel_idx on room_types (hotel_id);

create table if not exists rooms (
  id            uuid primary key default gen_random_uuid(),
  hotel_id      uuid not null references hotels(id) on delete cascade,
  room_type_id  uuid not null references room_types(id) on delete restrict,
  label         text not null,       -- e.g. 101
  active        boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create unique index if not exists rooms_label_key on rooms (hotel_id, upper(label));
create index if not exists rooms_type_idx on rooms (room_type_id);

-- Dates when a room can't be booked (maintenance, staff use...). end_date is the last blocked night.
create table if not exists room_blocks (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  reason      text,
  created_at  timestamptz not null default now(),
  created_by  uuid references staff_users(id),
  check (end_date >= start_date)
);
create index if not exists room_blocks_room_idx on room_blocks (room_id, end_date);

alter table hotels      enable row level security;
alter table room_types  enable row level security;
alter table rooms       enable row level security;
alter table room_blocks enable row level security;
