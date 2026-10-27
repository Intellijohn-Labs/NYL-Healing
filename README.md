# NYL patient registration

A mobile-first web form where new NYL Healing patients register and choose a registration day. The form works in Malayalam, Tamil, Hindi, Kannada, Arabic and English.

The WhatsApp bot sends each person a personal link such as `https://your-domain/r/<token>`. The link already knows their WhatsApp number, so they never type it.

**Flow:** number of patients (1 to 5) → details and health details for each patient → registration day → review with Edit buttons → payment choice → one **patient pass** per patient.

The patient pass (always in English) is shown every visit. Its QR code holds the patient's random pass code, which reception scans at `/staff/scan` to check them in and give a seat. Each pass also has a permanent link, `https://your-domain/p/<pass_token>`, to reopen it. Pass codes are random, so passes can't be made up from patient IDs.

## The registration form in detail

This section lists every question the form asks, the rules it checks, and what happens at each step. Labels are shown in English; the form shows them in the patient's chosen language.

### How a patient reaches the form

- The WhatsApp bot sends a personal link: `https://your-domain/r/<token>`.
- The link carries the sender's WhatsApp number, so the form never asks for it. Every patient registered through that link is saved with that number (`patients.wa_phone`).
- A link works for 72 hours and can be used more than once, for example to register another family member later. After it expires, the page says so and asks the person to open Registration again in the WhatsApp chat.
- The form opens in the language saved on the link. A language dropdown at the top lets the person switch between Malayalam, Tamil, Hindi, Kannada, Arabic and English at any time. Arabic is shown right to left.

### Steps at a glance

| Step | Screen | Purpose |
|---|---|---|
| 1 | Number of patients | Choose how many people to register (1 to 5) |
| 2 to N+1 | Patient 1 of N, Patient 2 of N… | Personal and health details for each person |
| N+2 | Registration day | Choose one day for the whole group |
| N+3 | Check the details | Review everything, with Edit buttons |
| N+4 | Payment | See the fee and choose how to pay |
| Done | Patient passes | One pass per patient, with Save and Open buttons |

A progress bar and "Step X of Y" are shown at the top. **Continue** checks the current step before moving on; **Back** returns to the previous step without losing anything typed.

### Step 1: Number of patients

| Question | Answer type | Rules |
|---|---|---|
| How many people are you registering? | Buttons 1, 2, 3, 4, 5 | Required, starts at 1 |

- Hint shown: up to 5 people (for example a family) can be registered together, and everyone gets the same registration day.
- Changing the number later keeps the details already entered for the remaining patients.
- If the chosen day no longer has enough places for the new number, the day choice is cleared.

### Step 2: Details for each patient

Each patient gets one page, titled "Patient 1 of 2", "Patient 2 of 2" and so on (or "Your details" when there is only one patient). The page has two sections.

**Personal details**

| Question | Answer type | Required | Rules | Saved in |
|---|---|---|---|---|
| Who are you registering? | Myself / My child / My father or mother / My husband or wife / Someone else | Yes | One option | `registrations.registering_for` (`self`, `child`, `parent`, `spouse`, `other`) |
| Full name (shown as "Patient's full name" unless "Myself" is chosen) | Text | Yes | Up to 120 characters | `patients.full_name` |
| Date of birth | Date picker | Yes | Not in the future, not before 1900 | `patients.dob` |
| Gender | Male / Female / Other | Yes | One option | `patients.gender` |
| Town or city | Text | Yes | Up to 120 characters | `patients.city` |

**Parent or guardian (appears only when the date of birth makes the patient under 18)**

A note explains that a parent or guardian must be added. These fields then become required:

| Question | Answer type | Required | Rules | Saved in |
|---|---|---|---|---|
| Parent or guardian's name | Text | Yes | Up to 120 characters | `patients.guardian_name` |
| Relation to the patient | Father / Mother / Other guardian | Yes | One option | `patients.guardian_relation` |
| How are they related to the patient? (only if "Other guardian") | Text | Yes | Up to 60 characters | Saved as `other: <text>` in `patients.guardian_relation` |
| Parent or guardian's phone | Phone number | Yes | At least 10 digits; only digits, `+` and spaces can be typed | `patients.guardian_phone` |
| "I am this patient's parent or guardian, and I agree to their registration and treatment at NYL Healing Centre." | Checkbox | Yes | Must be ticked | Time of consent in `patients.guardian_consent_at` |

If the date of birth is changed so the patient is 18 or over, the guardian section disappears and nothing from it is saved.

**Health details**

| Question | Answer type | Required | Rules | Saved in |
|---|---|---|---|---|
| What health problems do you want treatment for? (hint: you can write in any language) | Text box | Yes | Up to 4,000 characters | `patient_health.health_concerns` |
| Medicines you take now | Text box | No | Up to 2,000 characters | `patient_health.current_medicines` |
| Anything else the healer should know | Text box | No | Up to 2,000 characters | `patient_health.other_notes` |
| "I agree that NYL Healing Centre may keep these health details to plan my treatment." | Checkbox | Yes | Must be ticked | Time of consent in `patient_health.consent_at` |

When **Continue** is pressed with something missing or wrong, each problem is shown in red under its field ("Please fill this in.", "Please enter a real date of birth.", "Please enter a full phone number with at least 10 digits.", "Please tick this box to continue.") and the cursor moves to the first one.

### Step 3: Registration day

- A note explains that registration and the healer's health awareness class happen on this day at the Perumbavoor centre.
- The form lists up to 8 upcoming open days for the Perumbavoor centre (from `registration_slots`), each showing the date, start time and places left, for example "Monday 5 October, 9:00 am, 40 places left".
- A day is greyed out and can't be chosen when it is full, or when it has fewer places than the number of patients ("Only 1 place left" for a family of 2).
- Days in the past disappear automatically (India time).
- If no days are open, the page says so and asks the person to check the NYL Healing channel and try the link again later.
- One day must be chosen to continue. The whole group is booked for that day (`registrations.slot_id`).

### Step 4: Check the details

- A card for each patient shows everything entered: who they're registering, date of birth with age, gender, town, guardian details (only for under-18s), health problems, and medicines and notes (only if filled in).
- A final card shows the chosen registration day and time.
- Each card has an **Edit** button that opens that patient's page (or the day page). After editing, the main button reads **"Save and go back to review"** and returns straight to this screen, so nothing needs to be clicked through again.

### Step 5: Payment

- A summary shows the registration day fee times the number of patients, and the total, for example "2 × ₹600, Total ₹1,200". The fee is `REGISTRATION_FEE` in `lib/config.ts`.
- Two choices:
  - **Pay at reception:** pay at the centre on the registration day.
  - **Pay online:** shown as "Coming soon" and can't be chosen until online payment is built and `NEXT_PUBLIC_ONLINE_PAYMENT=true` is set.
- One choice is required. The button reads **Confirm and register**.
- Saved in `registration_groups`: `payment_method` (`offline` or `online`), `amount_due` (rupees), and `payment_status` (starts as `pending`).

### What happens on Confirm and register

1. The form checks every patient again. If anything is missing, it opens that patient's page with the problems marked.
2. The server checks the input again, then calls the database function `register_group()`, which in one transaction:
   - checks the link is still valid,
   - checks every patient (including the under-18 rules),
   - locks the chosen day and checks there are enough places for the whole group,
   - creates one `registration_groups` row, and for each patient a `patients` row (with `source_channel = 'web'`, an automatic patient code such as `NYL1042`, and a random `pass_token`), a `patient_health` row and a `registrations` row.
3. It is all or nothing: if any check fails, nothing is saved.

| Problem | What the person sees | What the form does |
|---|---|---|
| The day filled up while they were filling the form | "That day doesn't have enough places for everyone now. Please choose another day." | Returns to the day step with fresh place counts; all details are kept |
| The day was closed or has passed | "That day is no longer open. Please choose another day." | Returns to the day step |
| The link expired | "This registration link has expired. Open Registration again in the NYL WhatsApp chat to get a new link." | Stays on the payment step |
| Under-18 rules not met | "For patients under 18, a parent or guardian's details and consent are needed." | Stays on the payment step |
| Anything else (for example no internet) | "Registration didn't go through. Please check your connection and try again." | Stays on the payment step; pressing the button again retries |

### After registering: the patient passes

- The screen says "You're registered" and, if paying at reception, "Please pay ₹… at reception on your registration day."
- One **patient pass** is shown for each patient, always in English, with: patient name and ID, centre, registration day, reporting time, age and gender, who they were registered by, town, parent or guardian (for under-18s), a QR code, and the reminders to bring the pass every visit and arrive 20 minutes early.
- Under each pass:
  - **Save pass** downloads it as a PNG image (`NYL-pass-NYL1042.png`).
  - **Open this pass anytime** opens the pass's permanent link, `https://your-domain/p/<pass_token>`, which always shows the latest pass and has its own Save button.
- The QR code holds that permanent link. Reception will scan it on every visit to mark attendance. Because the token is random, a pass can't be made up from a patient ID.
- **Register more people** starts a new, empty form with the same link.

## How it fits together

- **Next.js (App Router) on Vercel**: the form. All database access happens on the server.
- **Supabase**: the existing NYL database. The form uses the service role key on the server only. The new tables have row level security turned on with no public policies, so nothing is readable from a browser.
- **n8n**: creates the personal link when someone opens Registration in the WhatsApp bot.

New database objects (in `supabase/migrations/`, run `001` to `019` in order):

| Object | Purpose |
|---|---|
| `registration_slots` | Registration days the hospital team opens, with capacity |
| `registration_links` | Personal links created by the bot (valid 72 hours, reusable for family members) |
| `registrations` | Which patient registered for which day, and who they were registered by (`registering_for`) |
| `patient_health` | Health concerns, medicines and notes, kept apart from `patients` |
| `available_registration_slots()` | Open days with places left |
| `registration_groups` | One row per form submission: number of patients, payment method, amount due, payment status |
| `patients.pass_token` | Random token behind each patient's pass and QR code |
| `register_group()` | Saves 1 to 5 patients, their health details and bookings in one transaction. All or nothing, and stops overbooking |
| `get_patient_pass()` | Everything the pass page shows, looked up by pass token |
| `daily_attendance` | One check-in per patient per day, with seat |
| `staff_check_in()`, `staff_set_seat()`, `staff_today_checkins()` | Used by the reception scanner |
| `hall_seats`, `set_hall_layout()`, `staff_free_seats()` | The hall's seats, and which are free today |
| `staff_mark_paid()`, `registration_groups.paid_at / paid_by` | Recording the registration fee as received |
| `staff_today_summary()`, `staff_day_bookings()`, `staff_search_patients()`, `staff_patient_detail()`, `staff_list_slots()`, `staff_save_slot()` | The Today, Bookings, Patients and Days screens |
| `hotels`, `room_types`, `hotel_rooms`, `room_blocks`, staff role `rooms_manager` | Rooms settings (the older, empty `rooms` and `room_bookings` tables are left untouched) |

## 1. Run the database migrations

In Supabase, open **SQL Editor**, then paste and run each file in order:

1. `supabase/migrations/001_web_registration.sql`
2. `supabase/migrations/002_form_changes.sql`
3. `supabase/migrations/003_groups_payment_pass.sql`
4. `supabase/migrations/004_daily_checkin.sql`
5. `supabase/migrations/005_reception_app.sql`
6. `supabase/migrations/006_wrong_day_warning.sql`
7. `supabase/migrations/007_bookings_other_day_visits.sql`
8. `supabase/migrations/008_rooms_settings.sql`
9. `supabase/migrations/009_designation_diseases.sql`
10. `supabase/migrations/010_room_bookings.sql`
11. `supabase/migrations/011_room_photos.sql`
12. `supabase/migrations/012_patient_id_card.sql`
13. `supabase/migrations/013_missed_days.sql`
14. `supabase/migrations/014_emergency_photo_healing.sql`
15. `supabase/migrations/015_emergency_now.sql`
16. `supabase/migrations/016_emergency_patient_updates.sql`
17. `supabase/migrations/017_collections_report.sql`
18. `supabase/migrations/018_pass_designation.sql`
19. `supabase/migrations/019_photo_payments.sql`

They only add or update the new registration objects and are safe to run again.

## 2. Add registration days

Until the admin page is built, add days in the SQL Editor:

```sql
-- Open a day (Perumbavoor is centre 1)
insert into registration_slots (slot_date, starts_at, capacity)
values ('2026-10-05', '09:00', 40);

-- Close a day early
update registration_slots set status = 'closed' where slot_date = '2026-10-05';

-- See who registered for a day
select p.patient_code, p.full_name, p.wa_phone, p.dob, h.health_concerns, g.payment_method, g.amount_due, r.created_at
  from registrations r
  join patients p on p.id = r.patient_id
  join patient_health h on h.patient_id = p.id
  join registration_slots s on s.id = r.slot_id
  left join registration_groups g on g.id = r.group_id
 where s.slot_date = '2026-10-05' and r.status = 'booked'
 order by r.created_at;
```

## 3. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository. Vercel detects Next.js automatically.
3. Under **Environment Variables**, add:
   - `SUPABASE_URL`: `https://eujrkroskvxvqrxrpaai.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: from Supabase, **Project Settings → API → service_role**. Keep this secret.
   - `STAFF_SESSION_SECRET`: a long random string (at least 32 characters) used to sign staff logins. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - Optional: `NEXT_PUBLIC_SITE_URL`, e.g. `https://register.nylhealing.com`, so pass links and QR codes always use your main domain.
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

## Reception scanner (attendance and seats)

Each patient pass has a QR code holding only `NYLPASS:<pass_token>`. A normal phone camera just shows that text; the pass isn't opened.

Reception uses **`/staff/scan`** on a phone or tablet:

1. Sign in once (stays signed in for 12 hours).
2. Point the camera at the pass. The first scan of the day **checks the patient in** (green). Scanning again the same day shows **Already checked in** (amber). Unknown codes show **Pass not found** (red). A short sound and vibration tell reception the result without looking.
3. Type the **seat** (for example `B-14`) and press **Save seat**. A seat can't be given to two people on the same day. The scanner then returns to scanning.
4. If a pass is damaged or forgotten, type the patient ID (for example `NYL1042`) instead.
5. **Wrong day:** on a patient's **first** visit, if today isn't their registration day (they came early, or missed their day), the scanner shows **"Not their registration day"** and asks first. Nothing is recorded until reception presses **Check in anyway** (logged in `scan_events` as `checked_in_override`) or **Cancel**. Later daily visits are never stopped.

The screen also shows the patient's age, gender, town, visit number, parent or guardian, whether today is their registration day (or if they came on the wrong day), and the registration fee to collect if they chose "Pay at reception". The list at the bottom shows everyone checked in today with their seats.

Check-ins are stored in `daily_attendance` (one row per patient per day, with seat). Every scan is also logged in the existing `scan_events` table.

### Other receptionist screens

All screens share one menu: **Scan · Today · Bookings · Patients · Days**.

- **Scan:** after a scan, the **next free seat is filled in** and every free seat is shown as a button, grouped by row. Tap one, or keep the suggestion, then **Save seat**. If the patient's registration fee is due, a **Mark paid** button appears (for a family, it marks the whole family's fee).
- **Today:** patients checked in today, seats free, new registrations, and fees still to collect.
- **Bookings:** pick a registration day to see every family booked, their WhatsApp and guardian numbers, payment status (with **Mark paid**), and arrival: **Arrived · seat** (came that day), **Came 7 Oct · seat** (came on a different day, for example early), or **Not arrived**.
- **Patients:** search by name, patient ID or phone number. A patient's page shows their details, health details (hidden from `gate` staff), registration and payment, every visit with its seat, and a link to their pass.
- **Days:** add registration days, change time or capacity, or close a day. Capacity can't go below what's already booked.

### Hall seats

Seats are set once with the hall layout: the row names and seats per row. For example, rows A to J with 10 seats each:

```sql
select set_hall_layout(1, array['A','B','C','D','E','F','G','H','I','J'], 10);   -- A-1 ... J-10
```

Run it again to change the layout. Seats that are no longer in the layout are switched off rather than deleted, so past records still show them. Until a layout is set, reception can type any seat.

### Creating staff accounts

Staff with the role `owner`, `reception` or `gate` can use the scanner and front-desk screens. `owner` and `rooms_manager` can use the Rooms settings.

1. In Supabase, open **Authentication → Users → Add user → Create new user**. Enter the staff member's email and a password, and tick **Auto Confirm User**.
2. Copy the new user's **UID**.
3. In the SQL Editor:

```sql
insert into staff_users (auth_user_id, name, email, role, centre_id)
values ('PASTE-UID-HERE', 'Reception 1', 'reception1@example.com', 'reception', 1);
```

To remove access, set `active = false` for that staff member. They are signed out on their next scan.

## Photo Healing session times

Staff set the daily Photo Healing (distance healing) times at **`/staff/photo-healing`** (the **Photo** tab, for `owner`, `reception` and `gate`). The WhatsApp bot ("NYL - Photo Healing (WhatsApp)") reads the same data. No new tables: the screen only writes the places the bot uses.

- **Upcoming days** (today + 6): each session's start, "photos close at", Open / Closed / Finished, and photos received (bookings for that slot that aren't cancelled). Per session: **Change time**, **Close for this day** / **Reopen**. Per day: **Add a session**.
  - Saving writes the `distance_slots` row for that date + session number: an existing row is **updated in place** (its id is kept, because `distance_bookings.slot_id` points to it); otherwise a row is created with `capacity` and `fee` from the settings. `healing_end` = start + duration, `booking_close_at` = start − cutoff.
  - Closing sets `status = 'closed'` (rows are never deleted); reopening sets `'open'`.
  - If photos have already come in for the session, the screen shows the count and asks before changing or closing it. Patients aren't told automatically.
- **Default times** edits `settings` key `photo_healing`: `slots` (Monday to Saturday), `sunday_slots` and `cutoff_minutes`. Other keys in the row are kept. Days that already have their own row keep its time.
- Every save adds one row to `action_log` (module `distance`, action `slot_updated` or `photo_healing_defaults_updated`, actor = the staff user, old and new values in `details`).
- `distance_slots.slot_no` is limited to 1–3 by the database, so a day can have at most 3 sessions.

## Healers' screen (Photo Healing)

The healers' screen is part of this app at **`/staff/healing`** (it replaces the separate `nyl-healer-app`).

- **Who:** staff with the role **`healer`** (for example Nisar and Sahala) land here after signing in and see nothing else. The **owner** can open it too (link on the Photo screen). Healers sign in with normal staff accounts; there is no separate password list.
- **What:** pick a day (today by default) and a healing time; each booked patient appears as a card with the photo, booking number, name and illness. Phone 10 per page (swipe), laptop 20, big screen or TV 40. Tap a photo for full screen with Previous / Next (arrow keys and Esc work too). The screen refreshes every minute.
- **Photo check:** if Gemini accepted a photo only after 2 rejections, or couldn't check it, the card shows **⚠ Check photo**, and the full-screen view says why (for example "eyes open").
- Photos come from the private bucket `nyl-photos` (setting `PHOTO_BUCKET`, default `nyl-photos`) through links that expire after 1 hour. Rejected, replaced and cleaned-up photos are never shown.
- **Disease filter:** chips above the photos (only diseases present in that session, with counts; several can be chosen). A patient matches if they ticked the disease on the web form, chose it in WhatsApp (numbered list), or their typed illness mentions it (common English, Malayalam, Tamil, Hindi, Kannada and Arabic words, in `lib/diseaseWords.ts`). "Not given" shows patients with no disease recorded.
- **Emergency patients** (chosen as 🚨 Emergency in WhatsApp) appear **first** in each session with a red border, a 🚨 icon and their condition; the **🚨 Emergency** chip shows only them.
- To add a healer: create the login in Supabase **Authentication → Users**, then `insert into staff_users (auth_user_id, name, email, role, centre_id) values ('UID', 'Nisar', 'nisar@example.com', 'healer', 1);`

## Designation and diseases (registration form)

- **Designation / occupation** (optional) is asked under Town, saved in `patients.designation`.
- **Diseases** are tick boxes with the same options as NYL's Google Form (heart, kidney, liver, stomach, lungs, cholesterol, BP, diabetes, neck pain, back pain, shoulder pain, stroke, Parkinson's, mental disorders, eye diseases, thyroid, tumours/cancers, others). At least one is required; **Others** asks which disease. They're saved as codes in `patient_health.diseases` (with `diseases_other` for the text). Labels in all 6 languages are in `lib/diseases.ts`.
- The written health problems box is now **optional** ("Anything more about the health problems?").
- **Reception → Patients** can search by **disease** (alone, or with a name). The patient's page shows the designation and disease tags.
- To add a disease option later: add its code to `disease_codes()` in the database (migration 009) and to `lib/diseases.ts`.

## Identity card (patients aged 15+)

- The form asks every patient aged **15 or over** (from their date of birth, including 15–17 year olds) for the **ID type** (Aadhaar, Voter ID, Passport, Driving licence, PAN, Emirates ID, Other) and a **photo of the front**. It's required. A normal Aadhaar card is accepted (masked Aadhaar is not required, as it's hard for older patients); the photo stays private and is deleted after verification or 2 days after the registration day.
- The photo is shrunk in the phone (at most 1600 px, JPEG) and uploaded at once to the **private** bucket `patient-ids` (`pending/<link token>/…`). Registration only accepts photos uploaded through the same link.
- The patient record keeps `id_type`, `id_doc_path` and **`id_card_url`** (e.g. `https://…/staff/id/NYL1042`). That link opens only for signed-in owner, reception and gate staff; the photo is shown through a 5-minute private link.
- Reception taps **✓ ID verified** after comparing; the photo is **deleted at once**, and "verified by … on …" is kept. Otherwise the nightly n8n workflow **NYL - ID Photo Cleanup (2 days)** deletes it **2 days after the registration day**, and unfinished-form uploads after 1 day.
- The address used in `id_card_url` is the `settings` key `site_url`; change it when moving to NYL's own domain.

## WhatsApp registration link and acknowledgement (DEV, test phones only)

- In WhatsApp, a **test phone** sends *register* (or രജിസ്റ്റർ): the router's **Register? (test phones)** step calls n8n **NYL - Registration Link (Dev)**, which creates a personal link (72 hours, in the patient's language) and replies with it.
- After the form is submitted, the app calls `/webhook/nyl-registration-done` (override with `REGISTRATION_DONE_HOOK_URL`); n8n **NYL - Registration Confirmation (Dev)** sends the day, time, fee and each person's **patient pass** link. Once per registration.
- Test phones are listed in two places: the router's **Register? (test phones)** step and the confirmation workflow's **Claim Registration** query. To go live for everyone, remove the phone checks and add Register to the bot menu.

## Patient pass: designation and "Back to WhatsApp"

- The pass shows the **Designation** (if the patient gave one) in Patient details, also in the saved image.
- The pass page and the form's "Registration done" screen have a green **Back to WhatsApp chat** button (in the patient's language) that opens the NYL chat: `https://wa.me/917356627729` (change with `NEXT_PUBLIC_WHATSAPP_NUMBER`).
- Migration 018 (`get_patient_pass` returns designation and language).

## Photo healing payments (UPI QR + receipt in WhatsApp, verified by staff)

- Set on **Photo → Default times → 💳 Payment (UPI QR)**: photo healing fee, NYL UPI ID, payee name (emergency fee is in the Emergency box). With no UPI ID or a fee of 0, no payment is asked (works as before).
- After the photo, the bot sends a **UPI QR image** (`/pay-qr?a=<amount>`) with the amount, then asks for the **payment screenshot** and the **12-digit UTR**. The booking waits: normal bookings are hidden from the healers, emergencies are not released.
- Staff verify on **/staff/payments** (also linked from the Photo screen, and a banner on every front-desk screen while payments wait; siren for emergency payments). **Check the bank / UPI app before Verify**; a UTR can only be used once.
- **Verify:** normal booking confirmed (moved to the same time next day if the session already ended) and shown to the healers; emergency released to the healers (alarm + WhatsApp alert). **Reject** (with reason): the patient is asked to send the screenshot again. n8n **NYL - Payment Result** tells the patient.
- Migration 019 (`payment_receipts`, payment status on bookings, `staff_verify_payment`, `staff_reject_payment`, `staff_payment_list`).

## Collections (registration fees paid at reception)

- **Today** screen: **Collected today** box with the total, number of payments and the split by staff member, and a link to the full report.
- **/staff/collections** (owner, reception, gate): Today / Yesterday / This month or any date range; total, by staff member, by day, and every payment (time, patients, registration day, WhatsApp, who marked it paid). **Download** gives a CSV that opens in Excel.
- Uses what **Mark paid** already saves (`registration_groups.paid_at`, `paid_by`, `amount_due`); a family's group fee is one payment. Migration 017 (`staff_collections`).

## Missed registered day

- A patient who **missed their registered day** (the day passed and they never checked in that day or later) **can't register again online** until the NYL team allows it.
- "Same patient" = same WhatsApp number + same name (ignoring capitals and spaces) + same date of birth. The form checks as soon as the patient's details are entered, and again when submitting. The message (6 languages) asks them to contact the NYL team on +91 99471 23327 or visit the centre.
- Staff: the patient's page shows **Missed registered day** with **Allow to register again** (optional note); each registration shows *Missed (not cleared)* or *Missed, cleared by …*. Patients search shows a **Missed day** tag. Everything is logged (`missed_day_cleared`).
- Database: `register_group_checked` (used by the form), `check_missed_day`, `staff_clear_missed`, `patient_missed_days` (migration 013).

## Emergency photo healing

- In WhatsApp, after the diseases, the patient picks **1. Normal** or **2. 🚨 Emergency** (critical condition; self-declared, 24 hours). For emergency the bot asks for the condition, then the **photo**: there is no time to choose.
- The booking creates an `emergency_requests` row (status **waiting**) with the photo, and the patient is told the healing **starts within 5 minutes**. Payment is skipped for now (the fee from Photo → Default times is recorded as due).
- **Healer screen:** a red **🚨 Emergency photo healing** box on top (checked every 10 seconds) with the photo, name, condition and minutes waiting ("start now!" after 5). A **siren** plays while any emergency is waiting (tap **🔔 Turn on alarm sound** once per visit; browsers need one tap before playing sound), and the browser tab shows *🚨 (1) Emergency*. **▶ Started** and **✓ Done** record who and when.
- **WhatsApp alert to healers:** n8n workflow **NYL - Emergency Alert** (called for each emergency) uses the numbers in **Photo → Default times → WhatsApp numbers to alert**. Its sending step is switched off until Waau's send-template API and an approved `emergency_alert` template are ready.
- **Patient updates:** when a healer taps **▶ Started** or **✓ Done**, the patient gets a WhatsApp message in their language ("healing has started" / "healing is complete") through the n8n workflow **NYL - Emergency Patient Update** (webhook `nyl-emergency-update`; override with the env var `EMERGENCY_UPDATE_HOOK_URL` after moving servers). Each message is sent once.
- Migrations 014 (fee setting, emergency columns), 015 (`emergency_requests`, `staff_emergency_action`) and 016 (sent-once flags for patient updates).

## Rooms (step 1: settings)

Room booking is being built in steps. Step 1 lets staff set everything up themselves at **`/staff/rooms`**, so prices, rooms and rules never need a code change:

- **Hotels:** name, address, phone, Google Maps link, open or off for booking.
- **Rules per hotel:** check-in and check-out times; the **advance** (a fixed amount, a percent of the total, or the first few nights); how long an unpaid booking **holds** a room; **free cancellation** up to N days before; **who can book** (registered NYL patients only, or anyone); **UPI ID** and a payment note for the advance.
- **Room types:** name, facilities, description, max guests, guests included in the price, **price per night**, extra charge per extra guest, and an optional **long-stay price** (for example a lower nightly rate from 12 nights). Each can be switched off.
- **Rooms:** add several at once (`101-110`, or `101, 102, A1`), switch a room off, move it to another type, delete it, or **block dates** (painting, repairs, staff use).

When a form shows an error, what was typed stays in the boxes; after a successful save, "add" forms are emptied.

**Who can use it:** the **owner** (who also sees all front-desk screens, with an extra **Rooms** tab) and the **rooms manager**, a role for one Sama Residency staff member, who only sees the Rooms screens and never sees patient health details. To create the rooms manager login, follow "Creating staff accounts" with `role = 'rooms_manager'`.

### Room photos

On a hotel's settings page, each **room type** has photos (tap its thumbnail, or Edit), and the hotel has its own **Hotel photos** section (building, entrance, reception).

- Up to **10 photos** each. The first is the **cover** (shown on the room type card, and to patients when booking). **★ Cover** makes another photo the cover; **Remove** deletes the photo and its file.
- Photos are shrunk in the browser (at most 1600 px, JPEG) and uploaded one at a time, so they upload quickly on mobile data and stay under Vercel's request limit. Only JPEG, PNG and WebP up to 5 MB are accepted.
- Files are in the **public** storage bucket `room-photos` (created by migration 011), separate from the private patient-photo bucket `nyl-photos`. Records are in `room_photos`.

### Room bookings (staff)

Rooms screens have their own menu at the bottom: **Today · Calendar · + New · Bookings · Settings** (for the rooms manager, and for the owner after tapping Rooms, with **← Main menu** at the top to go back). Every staff screen shows a **signed-in box** at the top right (name and role); tapping it opens a menu with **Sign out**. Today shows a **hotel card** with the hotel's cover photo and a photo strip (**View all** opens them full screen); other Rooms screens show a slim hotel bar. With more than one hotel, **⇄ Change hotel** opens a list of hotels with their photos. New booking shows each room type as a card with its cover photo, price and how many are free for the chosen dates, and the chosen type's photos.


- **Today:** rooms occupied, free tonight (by type, minus blocked rooms), unpaid holds and money received today; lists of arriving today, leaving today, waiting for advance (with time left) and staying now.
- **Calendar:** 14 days, rooms down the side, the number of free rooms per type each night, bookings coloured by status (held, confirmed, staying), blocked days, and bookings with no room yet. Tap a booking to open it, or a free square to book that room from that day.
- **Bookings:** filter by status, dates, and search by name, booking ID (RM-1001), NYL patient ID or phone.
- **New booking** (phone or walk-in): room type, optional room number, dates (1 / 3 / 12-night shortcuts), guests, guest name, phone, optional NYL patient ID. The price is shown before saving, using the hotel's rules (long-stay price, extra guest, advance). Full advance received means **confirmed**; otherwise the room is **held** for the hotel's hold time and then released automatically.
- **Booking details:** Advance received, Assign / change room (only free rooms are offered), Check in (room required, balance collected), Check out, Record payment, Note, Cancel; plus the history of every action.

Bookings are in `hotel_bookings` (codes RM-1001…). The price, extra-guest charge and advance are saved with each booking. The database refuses two active bookings on the same room for overlapping nights, and only allows a booking if a room of that type is free (not booked or blocked) every night. Every action is logged in `action_log` (module `room`). The older empty `room_bookings` / `rooms` tables from the first design are not used.

Next: the patient booking page (online booking from WhatsApp / after registration).

## Payment

The payment step shows the registration day fee (`REGISTRATION_FEE` in `lib/config.ts`, ₹600) times the number of patients. "Pay at reception" works now. "Pay online" shows as *Coming soon* until online payment is built; then set `NEXT_PUBLIC_ONLINE_PAYMENT=true`. The choice and amount are stored in `registration_groups` with `payment_status = 'pending'`.

## Notes

- Town or city is required.
- Patients under 18 need a parent or guardian's name, relation (saved as `father`, `mother` or `other: <what they typed>`), phone number (at least 10 digits) and an explicit consent tick. The database enforces this as well as the form, and stores the consent time in `patients.guardian_consent_at`.
- Health details need the patient's consent (a checkbox). The time of consent is stored in `patient_health.consent_at`.
- Dates use India time, so a registration day disappears from the list once it has passed.
