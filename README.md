# GoTech CRM

A CRM built with Next.js (App Router), TypeScript, Tailwind CSS, and Prisma on MySQL.

## Features

- **Login** — individual named accounts (email + password); everyone who signs in shares the same CRM data. A light/dark theme toggle lives in the sidebar
- **Companies** — track organizations with industry, domain, and contact details
- **Contacts** — people linked to companies, with notes and history
- **Contact import** — upload a Google Contacts CSV export (`/contacts/import`) and preview matched/duplicate/skipped rows before anything is saved
- **Deals** — a kanban-style sales pipeline (Lead → Qualified → Proposal → Negotiation → Won/Lost) with per-stage totals, in one CRM-wide currency you can change any time in *Settings*
- **Tasks** — follow-ups and to-dos with due dates, linked to contacts/companies/deals, filterable by Open / Overdue / Due today / Completed
- **Activity timeline** — notes, calls, emails, meetings, and automatic stage-change/task-completion logging on every contact, company, and deal
- **Dashboard** — pipeline overview (open value, closed-won, win rate), stage-by-stage breakdown, high-value open deals, and upcoming tasks
- **AI Assistant** *(optional, requires a Gemini API key)* — on each Contact/Company/Deal page: AI-generated summary + suggested next action, and a draftable follow-up message. On the dashboard: an "AI Pipeline Diagnosis" that reads pipeline health and overdue work and names the single highest-priority thing to do next

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

To add teammates, use **Settings → Users** in the running app, or the `create-user` script from the command line (both hash the password properly — don't add users directly via `prisma studio`):

```bash
npm run create-user -- --email="jane@example.com" --name="Jane Doe" --title="Sales"
```

Either way, set your own password or leave it blank for a generated one (shown once — copy it down; the script takes `--password="..."`). Any signed-in user can reset a teammate's password from **Settings → Users**, and change their own from **Settings → Change your password**.

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

## Deploying on cPanel

The app ships with everything needed for cPanel's **Setup Node.js App** tool (Phusion Passenger): a plain-Node `server.js` entrypoint, and a `postinstall` script that regenerates the Prisma Client automatically whenever `npm install` runs.

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

5. **Install and migrate.** Click *Run NPM Install* in the Node app UI (this also triggers `prisma generate` via `postinstall`). Then open the app's terminal (the UI shows a `source /home/USERNAME/nodevenv/.../bin/activate` command — run that first if using SSH instead, or use the Node app screen's *Run JS script* button to run a one-off `.js` file instead of a terminal) and run:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed   # required — this is also how you get your first login; see "Seed your first login" above
   ```

6. **Restart** the app from the Node.js Selector UI, then visit the Application URL. `server.js` builds the production bundle itself the first time it starts (there's no separate "build" step to run) — the first request after a restart may take a little longer while `next build` runs; check `stderr.log` in the Application root if it doesn't come up.

No native binaries to worry about: Prisma 7's driver-adapter architecture (`@prisma/adapter-mariadb`, already configured in `src/lib/db.ts`) talks to MySQL through a pure JS/WASM query engine instead of a platform-specific compiled binary, which tends to be the main source of pain on shared hosting.

To redeploy after future changes: push to the branch cPanel's Git Version Control tracks, click *Deploy HEAD Commit* again, re-run *NPM Install* if dependencies changed, run `npx prisma migrate deploy` if the schema changed, **delete the `.next` folder** (File Manager, or `rm -rf .next`) so the next restart rebuilds it, then restart the app.

### Troubleshooting

- **"The system cannot deploy" / "no uncommitted changes exist on the checked-out branch"** — the Git checkout (shown on the *Manage Repository* page) has local changes. If your Application root *is* the Git checkout directory (a valid, simpler setup — everything below assumes this), the usual cause is cPanel's own runtime files landing in it: `.htaccess` (the Node proxy config it writes), `stderr.log`/`stdout.log`, and `tmp/` (Passenger/LiteSpeed's restart signal) all show up as untracked files the moment the app starts. This repo's `.gitignore` already excludes them — `git status` in that directory should be clean after pulling the latest commit. If it's still dirty, run `git status` there (Terminal) to see what's left; a modified `package-lock.json` usually means `npm install` was run directly in that directory, which is fine — just `git checkout -- package-lock.json` (or `git reset --hard HEAD` to discard everything non-essential) and retry *Deploy HEAD Commit*.
- **`stderr.log` shows `Error: Cannot find module 'next'`** — dependencies aren't installed yet in the Application root. Click *Run NPM Install* in the Node app screen.
- **`stderr.log` shows `Could not find a production build in the '.next' directory`** — you're running an older `server.js` from before it gained the auto-build step above. Redeploy the latest commit and restart.
- **`next build` fails with `Error [TurbopackInternalError]: Symlink [project]/node_modules is invalid, it points out of the filesystem root`** — this is a `nodevenv`-hosting quirk: cPanel installs dependencies into a separate per-account directory and symlinks `node_modules` back into the Application root from there, which Turbopack refuses to follow by default. `next.config.ts` already works around this (it widens Turbopack's root to `$HOME` whenever `$HOME` is an ancestor of the app directory, which is exactly this situation) — if you still hit this, make sure you've deployed the latest commit.
- **`next build` fails with `Cannot find module '@tailwindcss/postcss'`** (or `'typescript'`) — cPanel's "Production" Application mode sets `NODE_ENV=production`, which makes `npm install` skip `devDependencies`. Since the build itself runs on this server (there's no separate build step elsewhere), anything `next build` needs — Tailwind's PostCSS plugin, TypeScript, the `@types/*` packages for its build-time type-check — has to be a regular `dependency`, not a dev one. This repo already lists them that way; if you still hit this, `npm install` an outdated `package.json` from before that fix, or a stale `node_modules` — re-run *Run NPM Install* after pulling the latest commit.
- **A red "Error" popup after "Run NPM Install" that just shows an `npm warn deprecated ...` line** — this is cosmetic. cPanel's UI surfaces anything npm writes to stderr in a red box, including harmless deprecation warnings, regardless of whether the install actually failed. Check for an `npm error` line specifically; if there isn't one, the install succeeded.
- **`DEPLOYPATH`** in `.cpanel.yml` must match your actual Application root (it uses `$HOME` so only the folder name needs editing, e.g. `$HOME/crm.example.com/`) — commit the change, since `.cpanel.yml` is read from the Git checkout, not the deployed app.
- **`stderr.log` fills with `failed to get redirect response ... ERR_SSL_PACKET_LENGTH_TOO_LONG` (or `ECONNREFUSED`) on every form submission**, sometimes alongside `Failed to find Server Action` — you're running a `server.js` from before it set `__NEXT_PRIVATE_ORIGIN`. Every Server Action that redirects (nearly all of them — creating/editing anything, logging in) makes Next.js stream the redirect target back via an internal request to this same server; without that env var it guesses the wrong port and, behind cPanel's TLS-terminating proxy, the wrong protocol, so the internal request fails outright. Next.js catches the failure and falls back to a normal redirect, so it's mostly log noise and a slower redirect rather than a broken page — but it fires on essentially every write in the app. Redeploy the latest commit and restart; a page loaded before the redeploy may also throw one `Failed to find Server Action` on its first submission afterward (it has stale action IDs baked in from the old build) — refreshing it clears that up.

## Project structure

```
prisma/
  schema.prisma        Data model (User, Settings, Company, Contact, Deal, Task, Activity)
  seed.ts               Sample data seed script (also creates the first login)
scripts/
  create-user.ts         CLI to add more logins (npm run create-user)
  clear-data.ts           CLI to wipe sample/CRM data without touching logins
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
    ui/                  Design system primitives (Button, Card, Input, ThemeToggle, …)
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
    ai/                  Gemini client + Prisma-to-prompt context builders
    format.ts, labels.ts, utils.ts
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
| `npx prisma studio` | Browse/edit data in a GUI |
| `npx prisma migrate dev --name <name>` | Create and apply a new migration |
| `npx prisma db seed` | (Re-)seed sample data; also creates the first login if none exist |
