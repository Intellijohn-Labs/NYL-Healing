# NYL patient registration
A mobile-first web form where new NYL Healing patients register and choose a registration day. The form works in Malayalam, Tamil, Hindi, Kannada, Arabic and English.
The WhatsApp bot sends each person a personal link such as `https://your-domain/r/<token>`. The link already knows their WhatsApp number, so they never type it.
**Flow:** number of patients (1 to 5) → details and health details for each patient → registration day → review with Edit buttons → payment choice → one **patient pass** per patient.

The patient pass (always in English) is shown every visit. Its QR code holds a permanent link, `https://your-domain/p/<pass_token>`, which reopens the pass and which reception's scanner will use to mark attendance. The pass token is random, so passes can't be guessed from patient IDs.

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