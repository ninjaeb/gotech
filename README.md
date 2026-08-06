# GoTech CRM

A CRM built with Next.js (App Router), TypeScript, Tailwind CSS, and Prisma on MySQL.

## Features

- **Companies** — track organizations with industry, domain, and contact details
- **Contacts** — people linked to companies, with notes and history
- **Contact import** — upload a Google Contacts CSV export (`/contacts/import`) and preview matched/duplicate/skipped rows before anything is saved
- **Deals** — a kanban-style sales pipeline (Lead → Qualified → Proposal → Negotiation → Won/Lost) with per-stage totals
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

### 4. Seed sample data (optional)

```bash
npx prisma db seed
```

Populates the database with sample companies, contacts, deals, tasks, and activity so you can explore the app immediately. Re-running the seed clears and re-creates this sample data.

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

4. **Set environment variables** in that same Node app screen: `DATABASE_URL` (using the database from step 1, e.g. `mysql://username_gotech:PASSWORD@localhost:3306/username_gotech`), and optionally `GEMINI_API_KEY` to enable the AI Assistant.

5. **Install and migrate.** Click *Run NPM Install* in the Node app UI (this also triggers `prisma generate` via `postinstall`). Then open the app's terminal (the UI shows a `source /home/USERNAME/nodevenv/.../bin/activate` command — run that first if using SSH instead, or use the Node app screen's *Run JS script* button to run a one-off `.js` file instead of a terminal) and run:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed   # optional, sample data
   ```

6. **Restart** the app from the Node.js Selector UI, then visit the Application URL. `server.js` builds the production bundle itself the first time it starts (there's no separate "build" step to run) — the first request after a restart may take a little longer while `next build` runs; check `stderr.log` in the Application root if it doesn't come up.

No native binaries to worry about: Prisma 7's driver-adapter architecture (`@prisma/adapter-mariadb`, already configured in `src/lib/db.ts`) talks to MySQL through a pure JS/WASM query engine instead of a platform-specific compiled binary, which tends to be the main source of pain on shared hosting.

To redeploy after future changes: push to the branch cPanel's Git Version Control tracks, click *Deploy HEAD Commit* again, re-run *NPM Install* if dependencies changed, run `npx prisma migrate deploy` if the schema changed, **delete the `.next` folder** (File Manager, or `rm -rf .next`) so the next restart rebuilds it, then restart the app.

### Troubleshooting

- **"The system cannot deploy" / "no uncommitted changes exist on the checked-out branch"** — the Git checkout (shown on the *Manage Repository* page) has local changes. If your Application root *is* the Git checkout directory (a valid, simpler setup — everything below assumes this), the usual cause is cPanel's own runtime files landing in it: `.htaccess` (the Node proxy config it writes), `stderr.log`/`stdout.log`, and `tmp/` (Passenger/LiteSpeed's restart signal) all show up as untracked files the moment the app starts. This repo's `.gitignore` already excludes them — `git status` in that directory should be clean after pulling the latest commit. If it's still dirty, run `git status` there (Terminal) to see what's left; a modified `package-lock.json` usually means `npm install` was run directly in that directory, which is fine — just `git checkout -- package-lock.json` (or `git reset --hard HEAD` to discard everything non-essential) and retry *Deploy HEAD Commit*.
- **`stderr.log` shows `Error: Cannot find module 'next'`** — dependencies aren't installed yet in the Application root. Click *Run NPM Install* in the Node app screen.
- **`stderr.log` shows `Could not find a production build in the '.next' directory`** — you're running an older `server.js` from before it gained the auto-build step above. Redeploy the latest commit and restart.
- **A red "Error" popup after "Run NPM Install" that just shows an `npm warn deprecated ...` line** — this is cosmetic. cPanel's UI surfaces anything npm writes to stderr in a red box, including harmless deprecation warnings, regardless of whether the install actually failed. Check for an `npm error` line specifically; if there isn't one, the install succeeded.
- **`DEPLOYPATH`** in `.cpanel.yml` must match your actual Application root (it uses `$HOME` so only the folder name needs editing, e.g. `$HOME/crm.example.com/`) — commit the change, since `.cpanel.yml` is read from the Git checkout, not the deployed app.

## Project structure

```
prisma/
  schema.prisma        Data model (Company, Contact, Deal, Task, Activity)
  seed.ts               Sample data seed script
server.js               Custom Node entrypoint for cPanel/Passenger hosting
.cpanel.yml              Git Version Control deploy tasks (cPanel)
src/
  app/
    actions/            Server Actions (mutations) grouped by entity
    companies/           Companies list, detail, create, edit
    contacts/             Contacts list, detail, create, edit, CSV import
    deals/                 Deals kanban board, detail, create, edit
    tasks/                 Task list with filters and quick-add
    page.tsx              Dashboard
  components/
    ui/                  Design system primitives (Button, Card, Input, …)
    layout/              Sidebar / mobile nav
    companies/ contacts/ deals/ tasks/ activity/   Feature components
    ai/                  AiInsightsPanel (Contact/Company/Deal AI Assistant)
    dashboard/           AiPipelineDiagnosis (dashboard AI Assistant)
  lib/
    db.ts                Prisma Client singleton (MariaDB driver adapter)
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
| `npx prisma studio` | Browse/edit data in a GUI |
| `npx prisma migrate dev --name <name>` | Create and apply a new migration |
| `npx prisma db seed` | (Re-)seed sample data |
