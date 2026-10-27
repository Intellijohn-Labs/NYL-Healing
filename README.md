# NYL Healing – Moving to Our Own Server

A step-by-step guide to move the NYL system from Vercel to our company server.
Read it once fully before starting. Do the steps in order.

---

## 1. What the system is made of

| Part | What it does | Where it runs now |
|---|---|---|
| **Web app** (Next.js) | Patient registration form, patient pass, staff app (reception, healers, rooms, payments) | Vercel – `https://nyl-healing-esep.vercel.app` |
| **Supabase** | Database, file storage (photos, ID cards, receipts), staff logins | Supabase cloud – `eujrkroskvxvqrxrpaai.supabase.co` |
| **n8n** | WhatsApp bot and automations (photo healing, alerts, payments) | Our Hostinger server – `n8n.srv1691210.hstgr.cloud` |
| **Waau** | WhatsApp provider. Sends patients' messages to n8n | Waau cloud (no change needed) |

**This move is mainly the web app.** n8n is already on our server. Supabase can stay on Supabase cloud (recommended) or be moved too (Part 4).

---

## 2. What you need before starting

- A **Linux server** (Ubuntu 22.04 or 24.04), at least **2 CPU / 4 GB RAM** (8 GB if you also move Supabase).
- A **domain name** for the app, e.g. `register.nylhealing.com`, and access to its **DNS** settings.
- Access to: **GitHub** repo `Intellijohn-Labs/NYL-Healing`, **Supabase** dashboard, **n8n**, **Vercel** (to copy the settings).
- From **Vercel → Project → Settings → Environment Variables**, copy these values:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (secret – never share or commit it)
  - `STAFF_SESSION_SECRET` (secret)

---

## 3. Put the web app on the server

### 3.1 Point the domain to the server
- In the DNS settings, add an **A record**: `register` → *server's public IP*.
- Wait until `ping register.nylhealing.com` shows the server's IP.

### 3.2 Install the tools (once)
```bash
sudo apt update && sudo apt install -y git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 3.3 Get the code
```bash
cd /var/www
sudo git clone https://github.com/Intellijohn-Labs/NYL-Healing.git nyl
sudo chown -R $USER:$USER nyl
cd nyl
```

### 3.4 Add the settings file
Create a file named `.env.production` in the `nyl` folder:
```
SUPABASE_URL=<copied from Vercel>
SUPABASE_SERVICE_ROLE_KEY=<copied from Vercel>
STAFF_SESSION_SECRET=<copied from Vercel>
NEXT_PUBLIC_SITE_URL=https://register.nylhealing.com
NEXT_PUBLIC_ONLINE_PAYMENT=false
```
- Use the **same** `STAFF_SESSION_SECRET` as Vercel, so staff logins keep working.
- Never upload this file to GitHub.

### 3.5 Build and start the app
```bash
npm ci
npm run build
pm2 start npm --name nyl -- start -- -p 3000
pm2 save
pm2 startup        # run the command it prints, so the app starts after a reboot
```
Check: `curl http://localhost:3000` should return HTML.

### 3.6 Connect the domain (Nginx + HTTPS)
Create `/etc/nginx/sites-available/nyl`:
```nginx
server {
    server_name register.nylhealing.com;
    client_max_body_size 10M;               # photo and ID card uploads

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Then:
```bash
sudo ln -s /etc/nginx/sites-available/nyl /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d register.nylhealing.com     # free HTTPS certificate
```
**HTTPS is required.** WhatsApp downloads the payment QR image from this address and refuses plain HTTP.

---

## 4. Supabase – choose ONE option

### Option A (recommended): keep Supabase cloud
- **Nothing to move.** The server uses the same `SUPABASE_URL` and key.
- Skip to Part 5.

### Option B: move Supabase to our server (more work)
Only if the company wants all data on its own server.
1. Install self-hosted Supabase with Docker: follow **supabase.com/docs/guides/self-hosting/docker**.
2. **Copy the database** (run on a machine with `psql` / `pg_dump`; the old connection string is in Supabase → Project Settings → Database):
   ```bash
   pg_dump "<OLD connection string>" --no-owner --schema=public --schema=auth --schema=storage -F c -f nyl.dump
   pg_restore --no-owner -d "<NEW connection string>" nyl.dump
   ```
3. **Copy the stored files** from the 3 buckets: `nyl-photos` (private), `patient-ids` (private), `room-photos` (public). Use `rclone` with the S3 settings of both Supabase setups (Supabase → Storage → Settings → S3).
4. Make sure the buckets keep the same **public/private** setting.
5. In `.env.production`, set the **new** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then rebuild (`npm run build && pm2 restart nyl`).
6. In **n8n**, update:
   - Credential **NYL Supabase** (Postgres) → new database host, user and password.
   - Credential **NYL Supabase Storage (service key)** → new service key.
   - The Supabase address `eujrkroskvxvqrxrpaai.supabase.co` inside these workflows: **NYL - Photo Healing (WhatsApp)** (*Upload Photo*, *Upload Receipt*), **NYL - Photo Cleanup (keep latest 2)**, **NYL - ID Photo Cleanup (2 days)**.

---

## 5. Switch everything to the new address

1. In **Supabase → SQL Editor**, run (with your real domain):
   ```sql
   update settings set value = '"https://register.nylhealing.com"' where key = 'site_url';
   ```
   The bot uses this for the registration links, patient passes, ID card links and payment QR.
2. **n8n:** nothing else to change if n8n stays at `n8n.srv1691210.hstgr.cloud`.
   If n8n's address changes, add these to `.env.production` and rebuild:
   ```
   EMERGENCY_UPDATE_HOOK_URL=https://<new n8n>/webhook/nyl-emergency-update
   REGISTRATION_DONE_HOOK_URL=https://<new n8n>/webhook/nyl-registration-done
   PAYMENT_RESULT_HOOK_URL=https://<new n8n>/webhook/nyl-payment-result
   ```
   and update the webhook address in **Waau**.
3. Old links sent before the move still point to the Vercel address. **Keep Vercel running for 1–2 weeks**, then delete it.

---

## 6. Test before telling anyone

Open each and check it works:
- [ ] `https://register.nylhealing.com/staff/login` → staff can sign in.
- [ ] `https://register.nylhealing.com/pay-qr?a=1` → shows a QR code.
- [ ] WhatsApp (test phone): send **register** → link opens the form on the new domain → register → the pass message arrives and the pass opens.
- [ ] Reception: scan a pass, mark a fee paid, check **Collections**.
- [ ] Healers' screen shows photos.
- [ ] Rooms: open a booking and a room photo.
- [ ] WhatsApp (test phone): **phtest** → photo healing booking → QR image arrives.

---

## 7. Everyday work on the server

| Task | Command |
|---|---|
| See if the app is running | `pm2 status` |
| See errors | `pm2 logs nyl` |
| Restart | `pm2 restart nyl` |
| Install a new update | `cd /var/www/nyl && git pull && npm ci && npm run build && pm2 restart nyl` |
| HTTPS certificate renewal | Automatic (certbot). Check: `sudo certbot renew --dry-run` |

**Database changes:** new updates sometimes include a file in `supabase/migrations/` (numbered, e.g. `020_...sql`). Run it in **Supabase → SQL Editor before** installing that update. Files `001`–`019` are already applied.

---

## 8. Keep it safe

- Keep `.env.production` private (`chmod 600 .env.production`).
- Turn on **two-factor login** for Supabase, GitHub, n8n and the server.
- Allow only ports **22, 80, 443** on the server firewall (`sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable`).
- **Backups:** Supabase cloud backs up daily. With Option B, set up a daily `pg_dump` and copy the storage files to another place.
