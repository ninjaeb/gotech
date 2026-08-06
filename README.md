# GoTech CRM

A CRM built with Next.js (App Router), TypeScript, Tailwind CSS, and Prisma on MySQL.

## Features

- **Companies** — track organizations with industry, domain, and contact details
- **Contacts** — people linked to companies, with notes and history
- **Deals** — a kanban-style sales pipeline (Lead → Qualified → Proposal → Negotiation → Won/Lost) with per-stage totals
- **Tasks** — follow-ups and to-dos with due dates, linked to contacts/companies/deals, filterable by Open / Overdue / Due today / Completed
- **Activity timeline** — notes, calls, emails, meetings, and automatic stage-change/task-completion logging on every contact, company, and deal

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions)
- TypeScript, Tailwind CSS v4
- [Prisma ORM 7](https://www.prisma.io) with the `@prisma/adapter-mariadb` driver adapter
- MySQL / MariaDB

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

## Project structure

```
prisma/
  schema.prisma        Data model (Company, Contact, Deal, Task, Activity)
  seed.ts               Sample data seed script
src/
  app/
    actions/            Server Actions (mutations) grouped by entity
    companies/           Companies list, detail, create, edit
    contacts/             Contacts list, detail, create, edit
    deals/                 Deals kanban board, detail, create, edit
    tasks/                 Task list with filters and quick-add
    page.tsx              Dashboard
  components/
    ui/                  Design system primitives (Button, Card, Input, …)
    layout/              Sidebar / mobile nav
    companies/ contacts/ deals/ tasks/ activity/   Feature components
  lib/
    db.ts                Prisma Client singleton (MariaDB driver adapter)
    format.ts, labels.ts, utils.ts
```

## Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Browse/edit data in a GUI |
| `npx prisma migrate dev --name <name>` | Create and apply a new migration |
| `npx prisma db seed` | (Re-)seed sample data |
