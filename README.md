# GoTech CRM

A CRM built with Next.js (App Router), TypeScript, Tailwind CSS, and Prisma on MySQL.

## Features

- **Login** — individual named accounts (email + password); everyone who signs in shares the same CRM data. A light/dark theme toggle lives in the sidebar
- **Global search** — a search bar at the top of every page, dynamic as you type, across Companies, Contacts, Deals, Tasks, and Projects at once, grouped and linked straight to each result. Scoped to what your role can otherwise see — a Developer's search only reaches Tasks and Projects
- **Companies** — track organizations with industry, domain, and contact details
- **Contacts** — people linked to companies, with notes and history. First and last names are auto-capitalized as you type or import them. "Save to phone" on a contact's page downloads a vCard (their details plus their company's) ready to add straight to your phone's Contacts app
- **Contact import** — upload a Google Contacts CSV export (`/contacts/import`) and preview matched/duplicate/skipped rows before anything is saved. Email and phone are validated on the way in — a badly-formatted value is dropped rather than failing the whole row — and a valid phone is converted to the `+countrycode...` standard. Duplicates are caught by email *or* phone, matching even when one side is missing its "+". Company industry comes along too when the CSV has it — and when it doesn't, a business-description column (if the CSV has one) is used to infer it instead, the same curated list either way. A company's address imports too, including Google's own "Address 1 - Formatted" column. None of this ever overwrites a company's existing industry, notes, or address — only fills them in if blank. On the *New contact* page you can also scan a photo of a business card *(optional, requires a Gemini API key)* or import a shared `.vcf` (vCard) file to fill in the form instead of typing — either way, the company is matched to an existing one or created, and everything's editable before you save
- **Deals** — a kanban-style pipeline with per-stage totals, in one CRM-wide currency you can change any time in *Settings*. Each deal has a Resources section for links to a proposal, presentation deck, or anything else worth keeping one click away
- **Pipelines** (*Settings → Pipelines*) — a new-build project, a maintenance retainer, and a referral don't have to share one kanban. Every install starts with one default "Sales" pipeline (Lead → Qualified → Proposal → Negotiation → Won/Lost); add more from Settings, each with its own ordered stage list and its own Won/Lost stage. The kanban board, stage-gate, deal-rotting flag, and Deal → Project handoff all key off a stage's Won/Lost flag rather than a fixed stage name, so they work the same way in every pipeline
- **Tasks** — follow-ups and to-dos with due dates and a Low/Medium/High priority (shown as a green/amber/red badge), linked to contacts/companies/deals, filterable by Open / Overdue / Due today / Completed, and always ordered by due date then priority. Each task can have any number of Assignees (who's responsible) and any number of Followers (who just want visibility) — both shown right in the task list. Clicking a task opens its own page: full details, its own activity log, and — when the task resolves to a client contact (directly, or through its deal/project) — buttons to email or WhatsApp them straight from the task, logged as an activity on both the task and the contact. Each send dialog has a "Draft with AI" button *(optional, requires a Gemini API key)* that writes a first draft grounded in that contact's real history
- **Activity timeline** — notes, calls, emails, meetings, and automatic stage-change/task-completion logging on every contact, company, and deal. Type `@` in a note to mention a teammate — they get an in-app notification (bell icon, top of the nav) linking straight back to it. From the bell dropdown, enable desktop alerts to also get a browser notification the moment a new one arrives, even while GoTech is open in a background tab
- **Dashboard** — pipeline overview (open value, closed-won, win rate), stage-by-stage breakdown, high-value open deals, and *your* upcoming tasks
- **AI Assistant** *(optional, requires a Gemini API key)* — on each Contact/Company/Deal page: AI-generated summary + suggested next action, and a draftable follow-up message (the same drafting also available inline on the Task page's Email/WhatsApp send dialogs). On the dashboard: an "AI Pipeline Diagnosis" that reads pipeline health and overdue work and names the single highest-priority thing to do next
- **Public lead-capture form** (`/lead`) — an embeddable, unauthenticated form for GoTech's own marketing site. Each submission creates (or matches, by email) a Contact and Company, and opens a new Deal in Lead stage — no manual re-entry from inbound interest. The direct link and a ready-to-paste `<iframe>` snippet are both in *Settings → Forms & Booking*
- **Meeting scheduler** (`/book`) — a public booking link for discovery calls, built from a weekly-hours schedule you set in *Settings → Forms & Booking* (timezone as a fixed UTC offset, call length, per-day hours). A booking finds-or-creates a Contact and auto-adds a follow-up Task at the chosen time — no email back-and-forth
- **Email sync** (*Settings → Integrations*) — connect your own IMAP/SMTP mailbox (Gmail, Outlook, a cPanel mailbox, anything) and new mail to/from a matching Contact gets logged as an Activity automatically, attached to that contact's one open Deal when it's unambiguous. Send from inside a Contact page too. Runs whenever you hit *Sync now*, and on a schedule via a cron job you set up (see *Deploying on cPanel* below) — see the Setup section for what each provider needs. Once connected, set a display name and an HTML signature (right there, no reconnect needed) — applied to every email that mailbox sends: Contact/Task sends, sequence steps, and the daily digest alike
- **WhatsApp Business** (*Settings → Integrations*) — connect one shared Business phone number via the official [Meta WhatsApp Business Platform (Cloud API)](https://developers.facebook.com/docs/whatsapp/cloud-api) — never an unofficial/browser-automation integration. Incoming and outgoing messages to/from a matching Contact's phone number are logged as Activities automatically (delivered instantly via webhook, no polling), attached to that contact's one open Deal when unambiguous. Send from inside a Contact page too, subject to WhatsApp's own 24-hour customer-service-window rule for freeform replies. The **WhatsApp** nav item (admin only) is a full conversation inbox — every contact you've exchanged messages with, ordered by most recent, and a chat-style thread per contact with delivery/read ticks and a reply box, built from that same Activity log
- **Resources** (on Company and Deal pages) — a running list of reference links, each with a title and a URL (contracts, briefs, credentials, pitch decks — anything hosted elsewhere), added, edited, and removed right from the page
- **Leaderboard** (`/leaderboard`) — every deal has an assignable Owner (set from the deal form, defaulting to whoever creates it); the leaderboard ranks teammates by deals won and value closed, filterable by this month / this quarter / this year / all time
- **Time tracking** — log time against any task (the clock icon next to it) with minutes, a date, and an optional note; Deals, Projects, Contacts, and Companies each roll up the total time logged across their tasks in the Tasks/Milestones card
- **Invoices** (on a Project page) — track payment milestones against a won deal's project: Draft → Deposit sent → Progress billed → Paid in full, with an amount, due date, and notes per invoice
- **Client portal** (`/portal`) — invite a Contact (from their Contact page, once they have an email and a company) and they get their own login, entirely separate from staff accounts, scoped strictly to their own Company's data: their Projects and milestones, their Quotes, their Invoices. Nothing internal — Activities, task descriptions, non-milestone tasks, deal notes — is ever exposed. Invite generates a one-time setup link (same copy-and-send pattern as quotes and the booking link); staff can revoke access at any time from the Contact page
- **Sequences** (*Settings → Sales → Sequences*) — multi-step automated email cadences. Build a sequence (subject, message, and a day-delay per step), then enroll any Contact with an email from their Contact page. Each step sends from your own connected mailbox on schedule; the whole sequence stops itself the moment the contact replies — checked against email sync's inbound record, no extra setup. Runs on the same cron-job pattern as email sync (see *Deploying on cPanel* below)
- **Task notifications** — the dashboard's "My Tasks" card and stat cards only show tasks assigned to you, and the Tasks nav item gets a red badge counting how many are due today or overdue. Optionally enable a daily digest email of that same list per mailbox, via a cron job (see *Deploying on cPanel* below)

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions)
- TypeScript, Tailwind CSS v4
- [Prisma ORM 7](https://www.prisma.io) with the `@prisma/adapter-mariadb` driver adapter
- MySQL / MariaDB
- [Gemini (`gemini-flash-latest`)](https://ai.google.dev) via `@google/genai`, for the optional AI Assistant

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up a MySQL database

Point `DATABASE_URL` at any MySQL 8+ or MariaDB 10.4+ database. Copy the example env file and fill in your connection string:

```bash
cp .env.example .env
```

```env
DATABASE_URL="mysql://user:password@localhost:3306/gotech_crm"
```

Also set `SESSION_SECRET` (required — signs login sessions):

```bash
echo "SESSION_SECRET=\"$(openssl rand -base64 32)\"" >> .env
```

If you don't already have a database, the quickest way to get one locally is Docker:

```bash
docker run -d --name gotech-mysql -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=gotech_crm -p 3306:3306 mysql:8
```

### 3. Run migrations

```bash
npx prisma migrate dev
```

This creates the schema and generates the Prisma Client into `src/generated/prisma`.

> Prisma Client is generated to `src/generated/prisma` (not `node_modules`) and is gitignored. Run `npx prisma generate` again any time the schema changes without running a migration.

### 4. Seed your first login (and sample data)

```bash
npx prisma db seed
```

The app requires logging in, so run this at least once. If no users exist yet, it creates one and prints the email/password to the terminal **once** — copy it down, then sign in at `/login`. It also populates sample companies, contacts, deals, tasks, and activity so you can explore the app immediately.

Re-running the seed clears and re-creates the sample CRM data, but never touches existing users — it's safe to run again later without affecting logins. Set `ADMIN_EMAIL`/`ADMIN_NAME` env vars before the *first* run to customize the initial account.

To add teammates, use **Settings → Team** in the running app, or the `create-user` script from the command line (both hash the password properly — don't add users directly via `prisma studio`):

```bash
npm run create-user -- --email="jane@example.com" --name="Jane Doe" --title="Sales"
```

Either way, set your own password or leave it blank for a generated one (shown once — copy it down; the script takes `--password="..."`). Any signed-in user can reset a teammate's password from **Settings → Team**, and change their own from **Settings → Change your password**.

When you're ready to move off the sample data (Acme Inc., Sarah Chen, etc.) and start entering real companies/contacts/deals, use `clear-data` instead of re-running the seed — seeding would just refill it with the same sample records. It deletes all CRM data and leaves logins untouched:

```bash
npm run clear-data          # shows what would be deleted, deletes nothing
npm run clear-data -- --yes # actually deletes it
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Enable the AI Assistant (optional)

Get an API key from [Google AI Studio](https://aistudio.google.com/apikey), then add it to `.env`:

```env
GEMINI_API_KEY="..."
```

Restart the dev server. "Generate insights", "Draft follow-up", and "AI Pipeline Diagnosis" buttons will now call Gemini; without a key they show a "not configured" message instead of erroring. No other setup needed — see `src/lib/ai/` and `src/app/actions/ai-insights.ts`.

### 7. Enable email sync (optional)

Each user connects their own mailbox from *Settings → Integrations* — no env var to set (the encryption key for stored credentials is derived from `SESSION_SECRET`, which you've already got from step 2). It needs the mailbox's IMAP and SMTP host/port, and a password:

- **Gmail** — `imap.gmail.com:993` (SSL) / `smtp.gmail.com:465` (SSL). Needs an [App Password](https://myaccount.google.com/apppasswords) (requires 2-Step Verification), not the regular account password.
- **Outlook / Microsoft 365** — `outlook.office365.com:993` (SSL) / `smtp.office365.com:587` (uncheck "uses SSL/TLS" — it's STARTTLS on that port). Microsoft has phased out basic auth for IMAP/SMTP on Exchange Online mailboxes; an App Password (or your tenant's modern-auth equivalent) is required.
- **A cPanel-hosted mailbox** (e.g. one on the same account as this app) — usually `mail.yourdomain.com` on `993`/`465`, plain password, no App Password needed. Check *Email Accounts → Connect Devices* in cPanel for the exact settings.

"Sync now" in Settings runs it immediately; for it to run on its own, add a cron job (see the cPanel deploy steps below).

### 8. Enable sequences (optional)

No separate setup — a sequence sends through whichever staff member enrolled the contact, using their already-connected mailbox from step 7 above, so at least one user needs email sync set up first. Build a sequence from *Settings → Sales → Sequences*, then enroll a contact from their Contact page. Like email sync, this only runs on its own once you add a cron job — see the cPanel deploy steps below.

### 9. Enable the daily task digest (optional)

Also no separate setup — like sequences, it sends through whichever user's own connected mailbox from step 7 (only users with one connected get a digest; everyone else is silently skipped). Once a day, each user with a connected mailbox gets emailed a plain-text list of their assigned tasks that are due today or overdue — nothing if they have none. Needs its own cron job (see the cPanel deploy steps below) to actually run.

### 10. Enable WhatsApp Business (optional)

Unlike email, this is one shared connection for the whole team, made through the official [Meta WhatsApp Business Platform (Cloud API)](https://developers.facebook.com/docs/whatsapp/cloud-api) — there's no supported way to connect the regular WhatsApp Business *app*, and no unofficial/browser-automation integration is used here.

**Get credentials from Meta:**

1. Create a [Meta App](https://developers.facebook.com/apps) (type: Business), then add the **WhatsApp** product to it.
2. In WhatsApp → API Setup, note the **Phone number ID** and **WhatsApp Business Account ID**, and add/verify a phone number (the free test number Meta provides works for trying this out, but can only message pre-approved recipient numbers — add a real, verified business number to message anyone).
3. Generate a **permanent access token**: Meta App Dashboard → App Settings → Basic (or *System Users* under Business Settings, for a token that doesn't expire) — a temporary 24-hour token from the quickstart page won't stay working.
4. Copy the App Secret from App Settings → Basic too.

**Connect in the CRM:** *Settings → Integrations* → paste in the Phone number ID, WABA ID, access token, and App Secret. The app tests the connection against Meta's API before saving.

**Register the webhook:** once connected, Settings shows a webhook URL and a verify token — paste both into Meta App Dashboard → WhatsApp → Configuration → Webhook, subscribe to the `messages` field. Meta calls that URL directly (no login), so incoming messages arrive instantly — no cron job needed for this one, unlike email sync.

**The 24-hour window:** WhatsApp only allows freeform replies within 24 hours of the customer's last message to you; starting a new conversation outside that window requires a pre-approved message template, which most of this integration doesn't manage (that's a template-creation-and-review flow inside Meta Business Manager, separate from anything here) — sending outside the window fails with a clear error rather than silently doing nothing. The one exception is the daily task digest below, which is proactive by design and so always sends as a template.

### 11. Daily WhatsApp task reminder (optional)

A once-a-day WhatsApp message summarizing what's due or overdue, per user. Needs WhatsApp Business connected (above) and, because it's sent proactively rather than in reply to anything, a template approved in Meta Business Manager first — a plain-text message would fail for anyone outside the 24-hour window, which in practice is almost everyone every morning.

1. **Create the template.** Meta App Dashboard → WhatsApp → Message Templates → Create Template:
   - Name: `daily_task_digest` (must match exactly — this app hard-codes it)
   - Category: `Utility`
   - Language: `English`
   - Body: `Good morning {{1}}! You have {{2}} task(s) due today or overdue in GoTech CRM. Open the app to see the full list.`

   Submit for review — Meta typically approves a template this simple within a day, but it's entirely their review queue, not something this app controls.
2. **An admin sets a phone number for each user who wants it**, from *Settings → Team* → *Edit* on that user's row. Leaving it blank opts that user back out.
3. **Schedule the cron job** — see step 7 under *Deploying on cPanel* below.

`{{1}}` is filled with the user's first name, `{{2}}` with their task count — nothing else is templated, so the wording above should match what you submit to Meta exactly (Meta reviews the literal template text).

## Deploying on cPanel

The app ships with everything needed for cPanel's **Setup Node.js App** tool (Phusion Passenger): a plain-Node `server.js` entrypoint that regenerates the Prisma Client and rebuilds the app itself on every start (see "No `postinstall` step" below for why that isn't handled by `npm install`).

**Requirements:** a cPanel account with "Setup Node.js App" and "MySQL Databases", and a Node.js version of 20.19+, 22.12+, or 24+ available in the Node selector (Prisma 7 requires one of those; picking the latest available 24.x is the simplest way to satisfy it).

1. **Create the database.** In cPanel → *MySQL Databases*, create a database and a user, add the user to the database with all privileges. cPanel prefixes both with your account username, e.g. database `username_gotech`, user `username_gotech`.

2. **Get the code onto the server**, either:
   - cPanel → *Git Version Control* → clone this repo, then use *Manage → Pull or Deploy → Deploy HEAD Commit*. This runs the copy tasks in `.cpanel.yml` — edit the `DEPLOYPATH` in that file first to match the Application root you'll use in step 3, and commit that change.
   - or upload/`rsync` the repository contents directly into the Application root.

3. **Create the Node app.** cPanel → *Setup Node.js App* → Create:
   - Node.js version: 20.19+, 22.12+, or 24+ (see Requirements above)
   - Application mode: `Production`
   - Application root: e.g. `gotech-crm` (must match `DEPLOYPATH` in `.cpanel.yml` if you used Git deploy)
   - Application URL: the domain or subdomain to serve it on
   - Application startup file: `server.js`

4. **Set environment variables** in that same Node app screen: `DATABASE_URL` (using the database from step 1, e.g. `mysql://username_gotech:PASSWORD@localhost:3306/username_gotech`), `SESSION_SECRET` (required — generate one with `openssl rand -base64 32`), and optionally `GEMINI_API_KEY` to enable the AI Assistant.

5. **Install and migrate.** Click *Run NPM Install* in the Node app UI. Then open the app's terminal (the UI shows a `source /home/USERNAME/nodevenv/.../bin/activate` command — run that first if using SSH instead, or use the Node app screen's *Run JS script* button to run a one-off `.js` file instead of a terminal) and run:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed   # required — this is also how you get your first login; see "Seed your first login" above
   ```

6. **Restart** the app from the Node.js Selector UI, then visit the Application URL. `server.js` builds the production bundle itself on every start (there's no separate "build" step to run) — the app takes ~20-30s to come up while `next build` runs each time; check `stderr.log` in the Application root if it doesn't come up.

7. **(Optional) Schedule background jobs.** If anyone connects a mailbox (*Settings → Integrations*), add a cPanel *Cron Jobs* entry — e.g. every 10 minutes — running:
   ```bash
   cd /home/USERNAME/APPLICATION_ROOT && source /home/USERNAME/nodevenv/APPLICATION_ROOT/*/bin/activate && npm run sync-email
   ```
   (the exact `source` path is the same one the Node app screen shows for running commands by hand). Without this, connected mailboxes only sync when someone clicks *Sync now*.

   If anyone uses Sequences too, add a second entry the same way for `npm run process-sequences` — an hourly schedule is plenty, since a step's delay is day-granularity. Without this, enrolled contacts never actually get their emails, even though enrolling still "succeeds."

   For the daily task digest, add a third entry for `npm run send-task-digests` on a once-a-day schedule (e.g. 7am) — it self-limits to roughly one send per connected mailbox per day regardless of how often it's actually invoked, so a more frequent schedule wouldn't double-send, but there's no reason to run it more than daily either.

   For the daily WhatsApp task reminder (see *Daily WhatsApp task reminder* above — needs a Meta-approved template first), add a fourth entry the same way for `npm run send-task-digests-whatsapp`, also once a day in the morning. Same self-limiting behavior as the email digest.

No native binaries to worry about: Prisma 7's driver-adapter architecture (`@prisma/adapter-mariadb`, already configured in `src/lib/db.ts`) talks to MySQL through a pure JS/WASM query engine instead of a platform-specific compiled binary, which tends to be the main source of pain on shared hosting.

To redeploy after future changes: push to the branch cPanel's Git Version Control tracks, click *Deploy HEAD Commit* again, re-run *NPM Install* if dependencies changed, run `npx prisma migrate deploy` if the schema changed, then restart the app — `server.js` rebuilds from the new source on every start, so there's no `.next` folder to manually clear.

### Troubleshooting

- **"Deploy HEAD Commit" is greyed out** — that button deploys whatever commit is already in cPanel's *local* checkout, which is a separate copy from GitHub. Pushing a new commit doesn't update it by itself. Click *Update from Remote* first (same *Pull or Deploy* page) to fetch the new commit into the local checkout — *Deploy HEAD Commit* unlocks once its HEAD actually differs from what's currently deployed.
- **"The system cannot deploy" / "no uncommitted changes exist on the checked-out branch"** — the Git checkout (shown on the *Manage Repository* page) has local changes. If your Application root *is* the Git checkout directory (a valid, simpler setup — everything below assumes this), the usual cause is cPanel's own runtime files landing in it: `.htaccess` (the Node proxy config it writes), `stderr.log`/`stdout.log`, and `tmp/` (Passenger/LiteSpeed's restart signal) all show up as untracked files the moment the app starts. This repo's `.gitignore` already excludes them — `git status` in that directory should be clean after pulling the latest commit. If it's still dirty, run `git status` there (Terminal) to see what's left; a modified `package-lock.json` usually means `npm install` was run directly in that directory, which is fine — just `git checkout -- package-lock.json` (or `git reset --hard HEAD` to discard everything non-essential) and retry *Deploy HEAD Commit*.
- **`stderr.log` shows `Error: Cannot find module 'next'`** — dependencies aren't installed yet in the Application root. Click *Run NPM Install* in the Node app screen.
- **`stderr.log` shows `Could not find a production build in the '.next' directory`** — you're running an older `server.js` from before it gained the auto-build step above (or before that step ran on every start rather than only when `.next` was missing). Redeploy the latest commit and restart.
- **The app still shows old behavior after redeploying and restarting** — if `stderr.log` doesn't show `> Building production bundle...` near the top on that restart, you're running a `server.js` from before it rebuilt on every start (it used to only build when no build existed yet, silently serving a stale one otherwise). Redeploy the latest commit; from then on every restart rebuilds automatically.
- **`next build` fails with `Error [TurbopackInternalError]: Symlink [project]/node_modules is invalid, it points out of the filesystem root`** — this is a `nodevenv`-hosting quirk: cPanel installs dependencies into a separate per-account directory and symlinks `node_modules` back into the Application root from there, which Turbopack refuses to follow by default. `next.config.ts` already works around this (it widens Turbopack's root to `$HOME` whenever `$HOME` is an ancestor of the app directory, which is exactly this situation) — if you still hit this, make sure you've deployed the latest commit.
- **`next build` fails with `Cannot find module '@tailwindcss/postcss'`** (or `'typescript'`) — cPanel's "Production" Application mode sets `NODE_ENV=production`, which makes `npm install` skip `devDependencies`. Since the build itself runs on this server (there's no separate build step elsewhere), anything `next build` needs — Tailwind's PostCSS plugin, TypeScript, the `@types/*` packages for its build-time type-check — has to be a regular `dependency`, not a dev one. This repo already lists them that way; if you still hit this, `npm install` an outdated `package.json` from before that fix, or a stale `node_modules` — re-run *Run NPM Install* after pulling the latest commit.
- **No `postinstall` step, on purpose.** Earlier versions of this repo tried to regenerate the Prisma Client automatically in a `postinstall` script right after `npm install`. On at least one real cPanel/nodevenv hosting account, that lifecycle script ran from inside the nodevenv's own internal directory (`/home/USER/nodevenv/DOMAIN/24/lib`) rather than the project directory — and every npm-provided variable meant to work around exactly this (`$INIT_CWD`, `$npm_config_local_prefix`) turned out to report that same wrong directory too, because npm's own operating context was wrong from the start for that invocation, not just one variable among several. Rather than keep chasing that, Prisma Client regeneration was moved entirely to where it was already working reliably: `server.js` already regenerates it on every app start/restart (see its comments), and `npx prisma migrate dev`/`migrate deploy` already regenerate it as a side effect too — both unaffected by any of this, since neither goes through an npm lifecycle script. *Run NPM Install* now only installs dependencies — expect no Prisma-related output from it, and no red error popup either.
- **Build fails on `/icon` or `/apple-icon` with `vips2png: unable to write to target` / `glib: Error creating thread: Resource temporarily unavailable`** — the favicon is rendered at build time via `next/og`, which briefly needs to spawn a native image-processing thread; on tightly resource-capped shared hosting that can momentarily fail if something else on the account is busy at that exact instant. `server.js` already keeps the previous build serving when this happens and retries the same commit on the next restart — it's expected to be transient and self-heal; only worth investigating further if it fails on every single deploy rather than occasionally.
- **`DEPLOYPATH`** in `.cpanel.yml` must match your actual Application root (it uses `$HOME` so only the folder name needs editing, e.g. `$HOME/crm.example.com/`) — commit the change, since `.cpanel.yml` is read from the Git checkout, not the deployed app.
- **`stderr.log` fills with `failed to get redirect response ... ERR_SSL_PACKET_LENGTH_TOO_LONG` (or `ECONNREFUSED`) on every form submission**, sometimes alongside `Failed to find Server Action` — you're running a `server.js` from before it set `__NEXT_PRIVATE_ORIGIN`. Every Server Action that redirects (nearly all of them — creating/editing anything, logging in) makes Next.js stream the redirect target back via an internal request to this same server; without that env var it guesses the wrong port and, behind cPanel's TLS-terminating proxy, the wrong protocol, so the internal request fails outright. Next.js catches the failure and falls back to a normal redirect, so it's mostly log noise and a slower redirect rather than a broken page — but it fires on essentially every write in the app. Redeploy the latest commit and restart; a page loaded before the redeploy may also throw one `Failed to find Server Action` on its first submission afterward (it has stale action IDs baked in from the old build) — refreshing it clears that up.
- **A `remove-*`/`sync-email`/etc. CLI script fails with `pool timeout: failed to retrieve a connection from pool` (`P2039`)** — the shared hosting account's MySQL `max_user_connections` is close to exhausted, usually by the always-running app's own connection pool, leaving no headroom for the script's separate one. `src/lib/db.ts` already defaults to a conservative pool size (`connectionLimit=5`) for exactly this reason; if it still happens, run the script again when the app is quieter, lower it further by adding `?connectionLimit=2` (or `&connectionLimit=2` if the URL already has a `?`) to `DATABASE_URL`, or ask your host to raise `max_user_connections` for the account.

## Project structure

```
prisma/
  schema.prisma        Data model (User, Settings, Company, Contact, Deal, Task, Activity)
  seed.ts               Sample data seed script (also creates the first login)
scripts/
  create-user.ts         CLI to add more logins (npm run create-user)
  clear-data.ts           CLI to wipe sample/CRM data without touching logins
  sync-email.ts           CLI to sync every connected mailbox (npm run sync-email) — for cron
  process-sequences.ts    CLI to send due sequence steps (npm run process-sequences) — for cron
  remove-contacts-without-phone.ts  CLI to delete contacts with no phone and no linked history (npm run remove-contacts-without-phone)
  remove-contacts-without-phone-or-email.ts  CLI to delete contacts with no phone AND no email, and no linked history (npm run remove-contacts-without-phone-or-email)
  remove-duplicate-contacts.ts  CLI to delete contacts sharing a phone or email with another contact, keeping the one with history if any (npm run remove-duplicate-contacts)
  remove-contacts-with-invalid-email.ts  CLI to delete contacts whose email is badly formatted and have no linked history (npm run remove-contacts-with-invalid-email)
  remove-contacts-with-invalid-phone.ts  CLI to delete contacts whose phone isn't in "+countrycode..." format and have no linked history (npm run remove-contacts-with-invalid-phone)
  remove-contacts-without-company.ts  CLI to delete contacts with no linked company and no linked history (npm run remove-contacts-without-company)
  remove-companies-without-contacts.ts  CLI to delete companies with no linked contact and no linked history (npm run remove-companies-without-contacts)
server.js               Custom Node entrypoint for cPanel/Passenger hosting
proxy.ts (src/)          Optimistic auth redirect, runs on every route
.cpanel.yml              Git Version Control deploy tasks (cPanel)
src/
  app/
    actions/            Server Actions (mutations) grouped by entity, incl. auth.ts (login/logout)
    (app)/               Route group: everything behind login, shares one layout
      companies/           Companies list, detail, create, edit
      contacts/             Contacts list, detail, create, edit, CSV import
      deals/                 Deals kanban board, detail, create, edit
      tasks/                 Task list with filters and quick-add
      settings/              Currency setting
      page.tsx              Dashboard
      layout.tsx             Sidebar / mobile nav + secure session check
    login/                Login page (outside the (app) group — no sidebar)
    layout.tsx            Root layout: fonts, global CSS, theme-init script
  components/
    ui/                  Design system primitives (Button, Card, Input, ThemeToggle, Breadcrumbs, …)
    layout/              Sidebar / mobile nav / user menu (name, role, logout)
    companies/ contacts/ deals/ tasks/ activity/   Feature components
    ai/                  AiInsightsPanel (Contact/Company/Deal AI Assistant)
    dashboard/           AiPipelineDiagnosis (dashboard AI Assistant)
  lib/
    db.ts                Prisma Client singleton (MariaDB driver adapter)
    auth/                Password hashing (scrypt), JWT sessions (jose), DAL (verifySession/getCurrentUser)
    settings.ts            Cached getCurrency()/setCurrency() (Settings singleton row)
    currency.ts             Curated list of ISO 4217 currencies for the Settings dropdown
    google-contacts-import.ts   CSV parsing/column-mapping for contact import
    email.ts                IMAP sync + SMTP send for connected mailboxes
    whatsapp.ts              Cloud API send + webhook signature verification + phone matching
    phone.ts                 Stored-phone standard: normalize to "+<digits>", validate loose E.164 shape, phoneMatchKey() for +/no-+ duplicate matching
    email-format.ts          Shared email-format validator (import + cleanup scripts)
    names.ts                 toTitleCase() — auto-capitalization for contact names
    vcard.ts                 Builds a vCard 3.0 file from a Contact + Company
    notification-href.ts     Shared "where does this notification link to" resolver (layout + poll route)
    ai/                  Gemini client + Prisma-to-prompt context builders
    format.ts, labels.ts, utils.ts
  components/layout/notification-poller.tsx   Background polling + native desktop Notification firing
  app/api/whatsapp/webhook/route.ts   Public: Meta's inbound-message webhook (GET verify, POST receive)
  app/api/contacts/[id]/vcard/route.ts   Downloads a Contact as a .vcf ("Save to phone")
  app/api/notifications/poll/route.ts    Polled by NotificationPoller for desktop-alert-worthy new notifications
```

## Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build with `next start` |
| `npm run start:cpanel` | Serve the production build via `server.js` (cPanel/Passenger-style hosts) |
| `npm run lint` | Run ESLint |
| `npm run create-user -- --email=… --name=…` | Add another login |
| `npm run clear-data -- --yes` | Delete all CRM data (companies/contacts/deals/tasks/activity), keep logins |
| `npm run sync-email` | Sync every connected mailbox once (what the cron job runs) |
| `npm run process-sequences` | Send any due sequence steps once (what the cron job runs) |
| `npm run send-task-digests` | Send the daily email task digest once (what the cron job runs) |
| `npm run send-task-digests-whatsapp` | Send the daily WhatsApp task reminder once (what the cron job runs) |
| `npx prisma studio` | Browse/edit data in a GUI |
| `npx prisma migrate dev --name <name>` | Create and apply a new migration |
| `npx prisma db seed` | (Re-)seed sample data; also creates the first login if none exist |
