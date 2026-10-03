# NYL patient registration

A mobile-first web form where new NYL Healing patients register and choose a registration day. It works in Malayalam, Tamil, Hindi, Kannada, Arabic and English.

The WhatsApp bot sends each person a personal link such as `https://your-domain/r/<token>`. The link already knows their WhatsApp number, so they never type it. After registering, the patient sees their NYL Patient ID (for example `NYL1042`) and the day to come.

## How it fits together

- **Next.js (App Router) on Vercel**: the form. All database access happens on the server.
- **Supabase**: the existing NYL database. The form uses the service role key on the server only. The new tables have row level security turned on with no public policies, so nothing is readable from a browser.
- **n8n**: creates the personal link when someone opens Registration in the WhatsApp bot.

New database objects (in `supabase/migrations/001_web_registration.sql`):

| Object | Purpose |
|---|---|
| `registration_slots` | Registration days the hospital team opens, with capacity |
| `registration_links` | Personal links created by the bot (valid 72 hours, reusable for family members) |
| `registrations` | Which patient registered for which day |
| `patient_health` | Health concerns, medicines and notes, kept apart from `patients` |
| `available_registration_slots()` | Open days with places left |
| `register_patient()` | Saves patient, health details and booking in one transaction, and stops overbooking |

## 1. Run the database migration

In Supabase, open **SQL Editor**, paste the contents of `supabase/migrations/001_web_registration.sql`, and run it. It only adds new objects and is safe to run again.

## 2. Add registration days

Until the admin page is built, add days in the SQL Editor:

```sql
-- Open a day (Perumbavoor is centre 1)
insert into registration_slots (slot_date, starts_at, capacity)
values ('2026-10-05', '09:00', 40);

-- Close a day early
update registration_slots set status = 'closed' where slot_date = '2026-10-05';

-- See who registered for a day
select p.patient_code, p.full_name, p.wa_phone, p.dob, h.health_concerns, r.created_at
  from registrations r
  join patients p on p.id = r.patient_id
  join patient_health h on h.patient_id = p.id
  join registration_slots s on s.id = r.slot_id
 where s.slot_date = '2026-10-05' and r.status = 'booked'
 order by r.created_at;
```

## 3. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository. Vercel detects Next.js automatically.
3. Under **Environment Variables**, add:
   - `SUPABASE_URL`: `https://eujrkroskvxvqrxrpaai.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: from Supabase, **Project Settings → API → service_role**. Keep this secret.
4. Deploy. Optionally add a custom domain such as `register.nylhealing.com`.

## 4. Connect the WhatsApp bot

When someone opens the Registration topic, the bot creates a link and adds it to its reply:

```sql
insert into registration_links (wa_phone, language)
values ($1, $2::lang_code)
returning token;
```

Then the reply includes `https://your-domain/r/<token>`. Anyone can open the page in a different language with `?lang=ml` (or `ta`, `hi`, `kn`, `ar`, `en`).

## Local development

```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev                  # http://localhost:3000
```

To test, create a link in the SQL Editor and open `http://localhost:3000/r/<token>`:

```sql
insert into registration_links (wa_phone, language) values ('919876543210', 'ml') returning token;
```

## Notes

- Patients under 18 must add a parent or guardian. The database enforces this as well as the form.
- Health details need the patient's consent (a checkbox). The time of consent is stored in `patient_health.consent_at`.
- Dates use India time, so a registration day disappears from the list once it has passed.
