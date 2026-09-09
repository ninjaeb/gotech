# Gotka CRM

A CRM built with Next.js (App Router), TypeScript, Tailwind CSS, and Prisma on MySQL.

## Features

- **Login** — individual named accounts (email + password), one of four roles set from *Settings → Team*: **Admin** (full access), **Sales** (Companies, Contacts, Deals, Quotes, and the Leaderboard — no Settings), **Technical team** (Projects and Tasks — no Settings), and **Partner** (their own portal only, see *Partner referral program* below). Tasks themselves are shared across every role — each just manages its own. A light/dark theme toggle lives in the sidebar
- **Installable (PWA)** — on a phone, "Add to Home Screen" (iOS Safari) or the browser's own "Install app" prompt (Android/desktop Chrome) puts Gotka on the home screen/app list with its own icon, launching full-screen without browser chrome. Nothing to configure — the manifest, icons, and a minimal service worker (registered for install-eligibility only, no offline caching, so you always see live data) ship with the app. *Settings* also has an explicit "Install Gotka" card — a one-tap **Install app** button where the browser supports it, Safari-specific instructions on iOS, and it hides itself once you're already running the installed app
- **Global search** — a search bar at the top of every page, dynamic as you type, across Companies, Contacts, Deals, Tasks, and Projects at once, grouped and linked straight to each result. Scoped to what your role can otherwise see — a Technical team login's search only reaches Tasks and Projects
- **Companies** — track organizations with industry, domain, and contact details
- **Contacts** — people linked to companies, with notes and history. First and last names are auto-capitalized as you type or import them. "Save to phone" on a contact's page downloads a vCard (their details plus their company's) ready to add straight to your phone's Contacts app
- **Contact import** — upload a Google Contacts CSV export (`/contacts/import`) and preview matched/duplicate/skipped rows before anything is saved. Email and phone are validated on the way in — a badly-formatted value is dropped rather than failing the whole row — and a valid phone is converted to the `+countrycode...` standard. Duplicates are caught by email *or* phone, matching even when one side is missing its "+". Company industry comes along too when the CSV has it — and when it doesn't, a business-description column (if the CSV has one) is used to infer it instead, the same curated list either way. A company's address imports too, including Google's own "Address 1 - Formatted" column. None of this ever overwrites a company's existing industry, notes, or address — only fills them in if blank. On the *New contact* page you can also scan a photo of a business card *(optional, requires a Gemini API key)* or import a shared `.vcf` (vCard) file to fill in the form instead of typing — either way, the company is matched to an existing one or created, and everything's editable before you save
- **Deals** — a kanban-style pipeline with per-stage totals, in one CRM-wide currency you can change any time in *Settings*. Each deal has a Resources section for links to a proposal, presentation deck, or anything else worth keeping one click away
- **Pipelines** (*Settings → Pipelines*) — a new-build project, a maintenance retainer, and a referral don't have to share one kanban. Every install starts with one default "Sales" pipeline (Lead → Qualified → Proposal → Negotiation → Won/Lost); add more from Settings, each with its own ordered stage list and its own Won/Lost stage. The kanban board, stage-gate, deal-rotting flag, and Deal → Project handoff all key off a stage's Won/Lost flag rather than a fixed stage name, so they work the same way in every pipeline
- **Tasks** — follow-ups and to-dos with due dates and a Low/Medium/High priority (shown as a green/amber/red badge), linked to contacts/companies/deals, filterable by Open / Overdue / Due today / Completed, and always ordered by due date then priority. Each task can have any number of Assignees (who's responsible) and any number of Followers (who just want visibility) — both shown right in the task list. Clicking a task opens its own page: full details, its own activity log, and — when the task resolves to a client contact (directly, or through its deal/project) — buttons to email or WhatsApp them straight from the task, logged as an activity on both the task and the contact. Each send dialog has a "Draft with AI" button *(optional, requires a Gemini API key)* that writes a first draft grounded in that contact's real history
- **Activity timeline** — notes, calls, emails, meetings, and automatic stage-change/task-completion logging on every contact, company, and deal. Type `@` in a note to mention a teammate — they get an in-app notification (bell icon, top of the nav) linking straight back to it. From the bell dropdown, enable desktop alerts to also get a browser notification the moment a new one arrives, even while Gotka is open in a background tab
- **Dashboard** — pipeline overview (open value, closed-won, win rate), stage-by-stage breakdown, high-value open deals, and *your* upcoming tasks
- **AI Assistant** *(optional, requires an OpenRouter API key)* — on each Contact/Company/Deal page: AI-generated summary + suggested next action, and a draftable follow-up message (the same drafting also available inline on the Task page's Email/WhatsApp send dialogs). On the dashboard: an "AI Pipeline Diagnosis" that reads pipeline health and overdue work and names the single highest-priority thing to do next
- **Public lead-capture form** (`/lead`) — an embeddable, unauthenticated form for Gotka's own marketing site. Each submission creates (or matches, by email) a Contact and Company, and opens a new Deal in Lead stage — no manual re-entry from inbound interest. Two ways to embed it, both in *Settings → Forms & Booking*: a ready-to-paste `<iframe>` snippet, or a JS widget (`/embed/lead-form.js`) that renders straight into the host page's own DOM instead of an isolated iframe — so it automatically inherits that site's fonts, text color, and any existing input/button styling, rather than looking like a Gotka-branded box dropped on the page
- **Meeting scheduler** (`/book`) — a public booking link for discovery calls, built from a weekly-hours schedule you set in *Settings → Forms & Booking* (timezone as a fixed UTC offset, call length, per-day hours). A booking finds-or-creates a Contact and auto-adds a follow-up Task at the chosen time — no email back-and-forth
- **Email sync** (*Settings → Integrations*) — connect your own IMAP/SMTP mailbox (Gmail, Outlook, a cPanel mailbox, anything) and new mail to/from a matching Contact gets logged as an Activity automatically, attached to that contact's one open Deal when it's unambiguous. Send from inside a Contact page too. Runs whenever you hit *Sync now*, and on a schedule via a cron job you set up (see *Deploying on cPanel* below) — see the Setup section for what each provider needs. Once connected, set a display name and an HTML signature (right there, no reconnect needed) — applied to every email that mailbox sends: Contact/Task sends, sequence steps, and the daily digest alike
- **WhatsApp Business** (*Settings → Integrations*) — connect one shared Business phone number via the official [Meta WhatsApp Business Platform (Cloud API)](https://developers.facebook.com/docs/whatsapp/cloud-api) — never an unofficial/browser-automation integration. Incoming and outgoing messages to/from a matching Contact's phone number are logged as Activities automatically (delivered instantly via webhook, no polling), attached to that contact's one open Deal when unambiguous. An inbound message from a number that matches no existing Contact creates one on the spot (named from their WhatsApp profile name when Meta sends one, their number otherwise), so every conversation shows up — none are silently dropped for being from someone not already in the CRM. Send from inside a Contact page too, subject to WhatsApp's own 24-hour customer-service-window rule for freeform replies. The **WhatsApp** nav item (admin only) is a full conversation inbox — every contact you've exchanged messages with, ordered by most recent, and a chat-style thread per contact with delivery/read ticks and a reply box, built from that same Activity log
- **Resources** (on Company and Deal pages) — a running list of reference links, each with a title and a URL (contracts, briefs, credentials, pitch decks — anything hosted elsewhere), added, edited, and removed right from the page
- **Leaderboard** (`/leaderboard`) — every deal has an assignable Owner (set from the deal form, defaulting to whoever creates it); the leaderboard ranks teammates by deals won and value closed, filterable by this month / this quarter / this year / all time
- **Time tracking** — log time against any task (the clock icon next to it) with minutes, a date, and an optional note; Deals, Projects, Contacts, and Companies each roll up the total time logged across their tasks in the Tasks/Milestones card
- **Invoices** (on a Project page) — track payment milestones against a won deal's project: Draft → Deposit sent → Progress billed → Paid in full, with an amount, due date, and notes per invoice
- **Client portal** (`/portal`) — invite a Contact (from their Contact page, once they have an email and a company) and they get their own login, entirely separate from staff accounts, scoped strictly to their own Company's data: their Projects and milestones, their Quotes, their Invoices. Nothing internal — Activities, task descriptions, non-milestone tasks, deal notes — is ever exposed. Invite generates a one-time setup link (same copy-and-send pattern as quotes and the booking link); staff can revoke access at any time from the Contact page
- **Sequences** (*Settings → Sales → Sequences*) — multi-step automated email cadences. Build a sequence (subject, message, and a day-delay per step), then enroll any Contact with an email from their Contact page. Each step sends from your own connected mailbox on schedule; the whole sequence stops itself the moment the contact replies — checked against email sync's inbound record, no extra setup. Runs on the same cron-job pattern as email sync (see *Deploying on cPanel* below)
- **Newsletters** (`/newsletters`, sender configured in *Settings → Newsletter*) — a broadcast email to a whole Contact List (see Lists above — a hand-picked set or a live segment like "all contacts with an email"), written in a WYSIWYG editor (bold/italic, headings, lists, links, and inline images), sent from one shared mailbox rather than a personal one (bulk volume on someone's own connected inbox risks that mailbox's deliverability). Save as a draft, then send immediately or schedule a future date/time (in the same org timezone as the booking scheduler); a scheduled send is picked up and worked through by its own cron job, in small paced batches so a large list can't trip the sending mailbox's rate limits. Every send includes a one-click unsubscribe link — a contact who uses it is excluded from every newsletter after, until an admin resubscribes them from a small toggle right on their Contact page
- **Newsletter subscribe form** (`/subscribe`, configured in *Settings → Newsletter*) — a public, unauthenticated form (name, email, and phone, all required) that adds a contact straight to whichever list you designate as the subscriber list, same "finds or creates a Contact" behavior as the lead-capture form. Visitors choose email, WhatsApp, or both — each channel's consent flag (`emailOptOut`/`whatsappMarketingOptIn`) is cleared independently based on that choice, and the form states the no-spam/unsubscribe-anytime policy up front. Same two embed options as the lead-capture form too: a ready-to-paste `<iframe>` snippet, or a JS widget (`/embed/newsletter-form.js`) that adopts the host site's own fonts/colors/input styling instead of looking like a dropped-in box
- **WhatsApp broadcasts** (`/newsletters` → *New WhatsApp broadcast*) — a one-off marketing update (headline + link) sent via an approved WhatsApp template to every contact who opted into WhatsApp updates through the subscribe form above and still has a phone on file. See *WhatsApp broadcasts* further down for the required Meta template and cron job
- **Partner referral program** (`/referrals`, defaults in *Settings → Referrals*) — the **Partner** login role, for external referrers. Each partner gets a share link (`/r/<code>`) that counts the click and sends the visitor on to your marketing landing page; the lead-capture widget there passes the code back, so the resulting Deal is marked *Referred by* that partner (source *Referral*). When that deal is won, a commission (deal value × the default rate, or the partner's own override) is created for an admin to approve; the partner sees their clicks, leads and each one's progress, commissions, and available balance in their own portal (`/partner`) and requests withdrawals there, which an admin pays out by hand and marks paid. Partners never see the CRM itself. See *Partner referral program* further down
- **Partner directory** (`/directory`, styled like gotka.com) — a public, trilingual (English / 中文 / Bahasa Malaysia) listing of your Partner-role users: company name, tagline, services, industry, website, address, and operating hours, with a detail page per partner (map included once an address is set) and search that filters as you type. Each listing has its own SEO-optimized page (Open Graph, canonical URL, schema.org structured data) and an editable web address. A visitor's inquiry goes in through a spam-guarded contact form and never sees the partner's own phone or email — it's stored as a `DirectoryLead` and shows up in that partner's portal (`/partner/directory-leads`) for them to pick up, reply to (sent from a Gotka system address), and track through its own status/value pipeline, separate from the referral commissions above. A partner edits their own listing (`/partner/listing`) and submits it for review; an admin approves, rejects with a note, or unpublishes from *Settings → Directory*, which also has directory-wide stats and a feed of recent leads. See *Public partner directory* further down for the one-time WhatsApp template setup
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
DATABASE_URL="mysql://user:password@localhost:3306/gotka_crm"
```

Also set `SESSION_SECRET` (required — signs login sessions):

```bash
echo "SESSION_SECRET=\"$(openssl rand -base64 32)\"" >> .env
```

If you don't already have a database, the quickest way to get one locally is Docker:

```bash
docker run -d --name gotka-mysql -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=gotka_crm -p 3306:3306 mysql:8
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

The app requires logging in, so run this at least once. If no users exist yet, it creates one and prints the email/password to the terminal **once** — copy it down, then sign in at `/system/login`. It also populates sample companies, contacts, deals, tasks, and activity so you can explore the app immediately.

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

Open [http://localhost:3000/system/login](http://localhost:3000/system/login) — the bare root now redirects to the public business directory at `/directory`, so the CRM itself lives under `/system`.

### 6. Enable the AI Assistant (optional)

Get an API key from [OpenRouter](https://openrouter.ai/keys), then add it to `.env`:

```env
OPENROUTER_API_KEY="..."
```

Restart the dev server. "Generate insights", "Draft follow-up", "AI Pipeline Diagnosis", and the business-card scanner will now call OpenRouter (defaulting to `openai/gpt-4o-mini` — override with `OPENROUTER_MODEL`, any model at [openrouter.ai/models](https://openrouter.ai/models) that supports image input and JSON mode); without a key they show a "not configured" message instead of erroring. No other setup needed — see `src/lib/ai/` and `src/app/actions/ai-insights.ts`.

### 7. Enable email sync (optional)

Each user connects their own mailbox from *Settings → Integrations* — no env var to set (the encryption key for stored credentials is derived from `SESSION_SECRET`, which you've already got from step 2). It needs the mailbox's IMAP and SMTP host/port, and a password:

- **Gmail** — `imap.gmail.com:993` (SSL) / `smtp.gmail.com:465` (SSL). Needs an [App Password](https://myaccount.google.com/apppasswords) (requires 2-Step Verification), not the regular account password.
- **Outlook / Microsoft 365** — `outlook.office365.com:993` (SSL) / `smtp.office365.com:587` (uncheck "uses SSL/TLS" — it's STARTTLS on that port). Microsoft has phased out basic auth for IMAP/SMTP on Exchange Online mailboxes; an App Password (or your tenant's modern-auth equivalent) is required.
- **A cPanel-hosted mailbox** (e.g. one on the same account as this app) — usually `mail.yourdomain.com` on `993`/`465`, plain password, no App Password needed. Check *Email Accounts → Connect Devices* in cPanel for the exact settings.

"Sync now" in Settings runs it immediately; for it to run on its own, add a cron job (see the cPanel deploy steps below).

### 8. Enable sequences (optional)

No separate setup — a sequence sends through whichever staff member enrolled the contact, using their already-connected mailbox from step 7 above, so at least one user needs email sync set up first. Build a sequence from *Settings → Sales → Sequences*, then enroll a contact from their Contact page. Like email sync, this only runs on its own once you add a cron job — see the cPanel deploy steps below.

### 9. Enable the daily task digest (optional)

Also no separate setup — like sequences, it sends through whichever user's own connected mailbox from step 7 (only users with one connected get a digest; everyone else is silently skipped). Once a day, each user with a connected mailbox gets emailed a plain-text list of their assigned tasks that are due today or overdue — nothing if they have none. Rides along on the same cron job as email sync itself (see the cPanel deploy steps below) — no separate entry needed; it just self-limits to roughly once a day per mailbox regardless of how often that cron actually runs.

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

**Formatting and attachments:** the message box on a contact's WhatsApp tab (`/whatsapp/[contactId]`) has a small **B / I / S / `<>`** toolbar that wraps the selected text in WhatsApp's own formatting syntax (`*bold*`, `_italic_`, `~strikethrough~`, `` ```monospace``` ``) — no setup needed, WhatsApp renders it on the recipient's side either way, and the CRM renders it the same way on yours. The 📎 button attaches a photo, video, or document to send alongside (or instead of) a text message — same 24-hour-window rule as a plain reply applies, and **no separate template is needed** for this, unlike the template-based features above. Meta's own supported types apply: JPEG/PNG images, MP4/3GPP video, and PDF/Word/Excel/PowerPoint/plain-text documents, up to 5MB (images) or 16MB (video/documents). An inbound attachment from a contact is downloaded and stored the same way, so it displays inline too — Meta's own copy of it is only available for a short window, so this app keeps its own.

### 11. Daily WhatsApp task reminder (optional)

A once-a-day WhatsApp message summarizing what's due or overdue, per user, with a link straight to their own task list. Needs WhatsApp Business connected (above) and, because it's sent proactively rather than in reply to anything, a template approved in Meta Business Manager first — a plain-text message would fail for anyone outside the 24-hour window, which in practice is almost everyone every morning.

1. **Create the template.** Meta App Dashboard → WhatsApp → Message Templates → Create Template:
   - Name: `_daily_task_digest_v2` (must match `TEMPLATE_NAME` in `src/lib/task-reminder.ts` exactly, underscore and all — if you ever need to create another revision of this template, Meta requires a new name rather than editing the approved one in place, so update that constant to match whatever you actually typed into Meta's "Name your template" field)
   - Category: `Utility`
   - Language: `English`
   - Header, with exactly one variable: `{{1}}, here is your daily task digest` (or your own wording, as long as it has exactly one `{{1}}`) — this app always sends a header component for this template, so a header with no variable, or none at all, will mismatch just like too many/too few body variables would. Numbered independently of the body's own `{{1}}`, even though this app sends the same first name into both.
   - Body: `Good morning {{1}}! You have {{2}} overdue and {{3}} due today in Gotka CRM.` on its own line, then a blank line, then `View your tasks: {{4}}`
   - Footer (optional, static text only): anything you like, e.g. "Automated daily task digest from Gotka CRM"

   Submit for review — Meta typically approves a template this simple within a day, but it's entirely their review queue, not something this app controls. Whatever your header/body variable counts end up being, they need to exactly match what this app sends (1 header + 4 body, per above) — Meta rejects a send whose variable count doesn't match what was approved, so an older or differently-shaped version of this template won't work with the current code.
2. **Set `SITE_URL`** in your environment (e.g. `https://crm.yourcompany.com`, no trailing slash) — the link in the body's `{{4}}` is built from this, since a cron-run script has no incoming request to infer its own host from the way the rest of the app does. Without it, the script logs an error and sends nothing.
3. **An admin sets a phone number for each user who wants it**, from *Settings → Team* → *Edit* on that user's row. Leaving it blank opts that user back out.
4. **Pick a send time** — *Settings → Integrations → Daily WhatsApp task reminder*, in the same timezone as the booking scheduler (also in Settings). This is what actually decides when it sends, not the cron schedule.
5. **Nothing to schedule separately** — this rides along on the same cron job as email sync (see step 7 under *Deploying on cPanel* below), which already runs far more often than the hourly cadence this needs. It checks the configured send hour itself and only actually sends during the one hour that matches; the 20-hour per-user rate limit stops it from double-sending if that hour gets checked more than once.

The header's `{{1}}` (if you added one) and the body's `{{1}}` are both the user's first name; the body's `{{2}}`/`{{3}}` are their overdue/due-today counts, `{{4}}` a link to their own task list, filtered to exactly what those counts describe (`/tasks?filter=due&assignee=<their user id>` — the Tasks page's combined "Overdue & today" tab, not the broader "Open" one; WhatsApp auto-links a plain URL in message text, no button component needed) — nothing else is templated, so the wording above should match what you submit to Meta exactly (Meta reviews the literal template text). Tapping the link requires already being logged into Gotka CRM in that browser.

To trigger a send manually regardless of the configured hour (e.g. to test it), pass `--force`: `npm run send-task-digests-whatsapp -- --force`. The same Settings → Integrations card also has two buttons for this without a terminal: **Send now** runs the real digest against everyone opted in (same as `--force`), and **Send test** sends just the template itself, with placeholder counts, to your own number only — useful for confirming the template is approved and reachable without needing anyone to actually have tasks due.

### 12. WhatsApp @mention notifications (optional)

Whenever someone `@mentions` a teammate in a note or a task description, that teammate already gets an in-app notification (the bell icon). If they've also set a phone number in *Settings → Team*, they get a WhatsApp message too — who mentioned them, the note/task text they were tagged in, and a link straight back to that page. Sent the moment the mention is saved, not on a schedule.

Like the daily digest, this is proactive (not a reply to anything the recipient sent), so it needs its own approved template:

1. **Create the template.** Meta App Dashboard → WhatsApp → Message Templates → Create Template:
   - Name: `mention_notification` (must match exactly — this app hard-codes it)
   - Category: `Utility`
   - Language: `English`
   - Header (optional, static text only — no variable): anything you like, e.g. "You have a mention in Gotka CRM"
   - Body: `You were mentioned by {{1}} in Gotka CRM: "{{2}}"` on its own line, then a blank line, then `Open it here: {{3}}`
   - Footer (optional, static text only): anything you like, e.g. "Automated notification from Gotka CRM"
   - No buttons — the link is sent as the body's own `{{3}}` variable (a full URL); WhatsApp renders any URL in body text as tappable on its own, no button component needed. Meta will ask for a sample value for each body variable when you submit — anything realistic works, e.g. `Sarah` / `Can you review the proposal before Friday?` / `https://crm.yourcompany.com/system/contacts/abc123`.

   Submit for review, same as the digest template above.
2. Nothing else to configure — this reuses the same phone number from *Settings → Team* as the daily digest (setting one opts a user into both), and sends automatically the moment they're mentioned. If WhatsApp Business isn't connected, or the recipient has no phone number set, or the template isn't approved yet, the mention still creates the normal in-app notification — the WhatsApp message is just silently skipped.

`{{1}}` is the mentioning user's name, `{{2}}` the note/task text they were tagged in (long text is truncated), `{{3}}` a full link back to that page, built from your `SITE_URL` env var (same one the daily digest uses) plus the page's path.

Since a mention only fires when someone actually gets @mentioned, there's no cron job to manually trigger — the **Send test** button in the same Settings → Integrations card sends a one-off test notification to your own number instead, to confirm this template is approved and reachable.

### 13. Mention reply forwarding via WhatsApp (optional)

Builds on section 12 above: if the mentioned person swipes-to-reply (quotes) the WhatsApp notification they got, that reply is forwarded on to whoever mentioned them — also via WhatsApp — and logged in the CRM as an activity on the same note/task, so it shows up there even for people who weren't on either end of the WhatsApp exchange. It keeps going from there: swipe-replying to *that* forwarded message sends the reply right back, and so on for as long as the two of them keep swipe-replying — each forward quotes what's being answered, so the thread stays readable even after several hops. A plain new message to the Business number (not a reply-to/quote of the specific message you want to answer) isn't treated as a reply in this chain — tell your team to actually use "reply" in WhatsApp, not just type a fresh message.

This is its own proactive send (the mentioner is very unlikely to be within their own 24h reply window either), so it needs a second approved template:

1. **Create the template.** Meta App Dashboard → WhatsApp → Message Templates → Create Template:
   - Name: `mention_reply_notification` (must match exactly — this app hard-codes it)
   - Category: `Utility`
   - Language: `English`
   - Header (optional, static text only — no variable): anything you like, e.g. "You got a reply on Gotka CRM"
   - Body: `{{1}} replied to your mention in Gotka CRM.` on its own line, then a blank line, then `You said: "{{2}}"`, then a blank line, then `Their reply: "{{3}}"`, then a blank line, then `{{4}}`
   - Footer (optional, static text only): anything you like
   - No buttons — same reasoning as section 12's template: the link is sent as the body's own `{{4}}` variable and WhatsApp renders it as tappable on its own. Sample values Meta asks for when you submit: e.g. `Sarah` / `Can you review the proposal before Friday?` / `Yes, looks good to me` / `https://crm.yourcompany.com/system/contacts/abc123`.

   Submit for review, same as the other templates above.
2. Nothing else to configure. If WhatsApp Business isn't connected, or the original mentioner never set their own phone number, or this template isn't approved yet, the reply is still logged in the CRM as normal — only the WhatsApp forward is silently skipped.

`{{1}}` is the replying (mentioned) user's name, `{{2}}` the original note/task excerpt they were mentioned in, `{{3}}` their reply text (long text is truncated same as `{{2}}`), `{{4}}` a full link back to that page.

The **Send test** button in the same Settings → Integrations card (next to section 12's) sends a one-off test with placeholder content to your own number, to confirm this template is approved and reachable without waiting for a real reply.

### 14. WhatsApp task assignment notifications (optional)

Whenever a task gets a new assignee (creating a task with assignees, or adding someone to an existing one's assignee list), that person already gets an in-app notification (the bell icon). If they've also set a phone number in *Settings → Team*, they get a WhatsApp message too — who assigned them, the task's title, and a link straight to the task. Assigning a task to yourself never notifies you.

By default this sends the moment the task is saved. *Settings → Integrations → WhatsApp task assignment notifications* has a **Send after** option to hold it instead — Immediately, 15 minutes, 30 minutes, 1/2/3/4/5 hours — useful if you'd rather tell someone in person or on Slack first and only want the CRM to follow up if that doesn't happen. The delay is CRM-wide (one setting, not per-user), checked by the same cron job as the daily digests (see *Deploying on cPanel* below) rather than an in-process timer, so a delayed notification still fires even if the app restarts in the meantime. If you remove someone as an assignee before their delayed notification fires, it's cancelled — they were never actually left holding the task, so they never hear about it. Re-assigning someone who already has one pending just pushes its send time out rather than sending twice.

Assigning a task to someone also automatically follows that task for you (see *Task followers* in Features above) — no separate step needed to stay in the loop on it, and see section 15 below for what following actually gets you.

Like the @mention notification, this is proactive, so it needs its own approved template:

1. **Create the template.** Meta App Dashboard → WhatsApp → Message Templates → Create Template:
   - Name: `task_assignment_notification` (must match exactly — this app hard-codes it)
   - Category: `Utility`
   - Language: `English`
   - Header (optional, static text only — no variable): anything you like, e.g. "You have a new task in Gotka CRM"
   - Body: `{{1}} assigned you a task in Gotka CRM: "{{2}}"` on its own line, then a blank line, then `Open it here: {{3}}`
   - Footer (optional, static text only): anything you like, e.g. "Automated notification from Gotka CRM"
   - No buttons — the link is sent as the body's own `{{3}}` variable (a full URL), same reasoning as mention_notification above. Meta will ask for a sample value for each body variable when you submit — anything realistic works, e.g. `Sarah` / `Follow up with Acme Corp` / `https://crm.yourcompany.com/system/tasks/abc123`.

   Submit for review, same as the other templates above.
2. Nothing else to configure — this reuses the same phone number from *Settings → Team* as the daily digest and @mention notification (setting one opts a user into all three). If WhatsApp Business isn't connected, the assignee has no phone number set, or the template isn't approved yet, the assignment still creates the normal in-app notification — the WhatsApp message is just silently skipped.

`{{1}}` is the assigning user's name, `{{2}}` the task's title, `{{3}}` a full link to the task, built from your `SITE_URL` env var (same one the other templates use).

Since this only fires when a task actually gets a new assignee, there's no cron job to manually trigger — the **Send test** button in the same Settings → Integrations card sends a one-off test notification to your own number instead, to confirm this template is approved and reachable.

### 15. WhatsApp task status notifications (optional)

Whenever a task's completion status changes (marked complete, or reopened), everyone following that task — except whoever just made the change — already gets an in-app notification. If they've also set a phone number in *Settings → Team*, they get a WhatsApp message too — who changed it, the task's title, whether it was completed or reopened, and a link straight to the task. This is what makes following a task (rather than being assigned to it) actually worth something: assigning someone a task auto-follows it for you (see section 14 above), so you find out the moment they mark it done without having to check back.

Like the other proactive notifications, this needs its own approved template:

1. **Create the template.** Meta App Dashboard → WhatsApp → Message Templates → Create Template:
   - Name: `task_status_notification` (must match exactly — this app hard-codes it)
   - Category: `Utility`
   - Language: `English`
   - Header (optional, static text only — no variable): anything you like, e.g. "A task you're following was updated"
   - Body: `{{1}} {{3}} a task in Gotka CRM: "{{2}}"` on its own line, then a blank line, then `Open it here: {{4}}`
   - Footer (optional, static text only): anything you like
   - No buttons — same reasoning as the other templates above: the link is the body's own `{{4}}` variable. Sample values Meta asks for when you submit: e.g. `Sarah` / `Follow up with Acme Corp` / `completed` / `https://crm.yourcompany.com/system/tasks/abc123`.

   Submit for review, same as the other templates above.
2. Nothing else to configure — this reuses the same phone number from *Settings → Team* as the other WhatsApp notifications. If WhatsApp Business isn't connected, a follower has no phone number set, or the template isn't approved yet, the change still creates the normal in-app notification — the WhatsApp message is just silently skipped.

`{{1}}` is the name of whoever changed the status, `{{2}}` the task's title, `{{3}}` either `completed` or `reopened`, `{{4}}` a full link to the task, built from your `SITE_URL` env var.

Since this only fires on a real status change, there's no cron job to manually trigger — the **Send test** button in the same Settings → Integrations card sends a one-off test notification (with placeholder task/status text) to your own number instead, to confirm this template is approved and reachable.

### 16. WhatsApp new-message notifications (optional)

Whenever a new WhatsApp message arrives from a contact (not Meta's own delivery/read receipts, and not a swipe-reply to a mention notification — see section 13 above for that separate chain), anyone who's checked "Notify me of new WhatsApp messages" on their own row in *Settings → Team* and set a phone number gets a WhatsApp ping about it — who it's from, an excerpt, and a link straight to that conversation. Unlike the notifications above, this one creates no separate in-app bell notification — the WhatsApp nav item's own unread-conversation badge already covers that, and doubling it up at chat-inbox volume would just be noisy. Admin-only (the `/whatsapp` inbox itself is), so a Sales or Technical team login can't opt in.

Like the other proactive notifications, this needs its own approved template:

1. **Create the template.** Meta App Dashboard → WhatsApp → Message Templates → Create Template:
   - Name: `new_whatsapp_message_notification` (must match exactly — this app hard-codes it)
   - Category: `Utility`
   - Language: `English`
   - Header (optional, static text only — no variable): anything you like, e.g. "New WhatsApp message in Gotka CRM"
   - Body: `{{1}} sent a new WhatsApp message: "{{2}}"` on its own line, then a blank line, then `Open it here: {{3}}`
   - Footer (optional, static text only): anything you like, e.g. "Automated notification from Gotka CRM"
   - No buttons — the link is sent as the body's own `{{3}}` variable (a full URL); WhatsApp renders any URL in body text as tappable on its own. Meta will ask for a sample value for each body variable when you submit — anything realistic works, e.g. `Sarah` / `Is the proposal ready yet?` / `https://crm.yourcompany.com/system/whatsapp/abc123`.

   Submit for review, same as the other templates above.
2. **Turn it on per person** — each admin who wants this checks "Notify me of new WhatsApp messages" on their own row in *Settings → Team* (an admin sets it for anyone, same as the phone number itself) and needs a phone number set too; leaving either off means that person is silently skipped. If WhatsApp Business isn't connected, or the template isn't approved yet, the message is still logged in the CRM as normal — the WhatsApp ping is just silently skipped.

`{{1}}` is the contact's name (or their phone number, for a brand-new conversation with no name on file yet), `{{2}}` an excerpt of the message (long text is truncated; a photo/document/video shows as a placeholder like "Sent an image"), `{{3}}` a full link to that conversation, built from your `SITE_URL` env var.

Since a real message has no scheduled run to manually trigger, the **Send test** button in the same Settings → Integrations card sends a one-off test with placeholder content to your own number instead, to confirm this template is approved and reachable.

### 17. WhatsApp new-lead notifications (optional)

Whenever the public lead-capture form (see *Public lead-capture form* in Features above) creates a new lead, anyone who's checked "Notify me of new leads" on their own row in *Settings → Team* gets an in-app bell notification, and — if they've also set a phone number — a WhatsApp ping too, with the lead's name, company, and a link straight to the new deal. Unlike the notifications above, there's no natural single person a new, unclaimed lead belongs to, so this is its own explicit opt-in rather than reusing the phone-number-presence pattern the others share. Open to Admin and Sales, the two roles `/deals` itself is open to — a Technical team login can't opt in.

Like the other proactive notifications, this needs its own approved template:

1. **Create the template.** Meta App Dashboard → WhatsApp → Message Templates → Create Template:
   - Name: `new_lead_notification` (must match exactly — this app hard-codes it)
   - Category: `Utility`
   - Language: `English`
   - Header (optional, static text only — no variable): anything you like, e.g. "New lead in Gotka CRM"
   - Body: `New website lead: {{1}} ({{2}})` on its own line, then a blank line, then `Open it here: {{3}}`
   - Footer (optional, static text only): anything you like, e.g. "Automated notification from Gotka CRM"
   - No buttons — same reasoning as the other templates above: the link is the body's own `{{3}}` variable. Sample values Meta asks for when you submit: e.g. `Sarah Tan` / `Acme Corp` / `https://crm.yourcompany.com/system/deals/abc123`.

   Submit for review, same as the other templates above.
2. **Turn it on per person** — each admin who wants this checks "Notify me of new leads" on their own row in *Settings → Team* (an admin sets it for anyone). A phone number is only needed for the WhatsApp half — the in-app bell notification goes out either way. If WhatsApp Business isn't connected, the person has no phone number set, or the template isn't approved yet, the lead is still logged (and the in-app notification still sent) as normal — only the WhatsApp ping is silently skipped.

`{{1}}` is the lead's name, `{{2}}` their company (or "No company given" if the form was submitted without one), `{{3}}` a full link to the new deal, built from your `SITE_URL` env var.

Since a real lead has no scheduled run to manually trigger, the **Send test** button in the same Settings → Integrations card sends a one-off test with placeholder content to your own number instead, to confirm this template is approved and reachable.

### 18. WhatsApp broadcasts (optional)

Send a one-off marketing update — a headline and a link — to every contact who chose "WhatsApp" or "Both" when subscribing via the public newsletter subscribe form (see *Newsletter subscribe form* above) and still has a phone number on file. Unlike the notifications above (which reuse a User's own opt-in phone number for internal alerts), this reaches Contacts, and unlike Newsletters (email), it needs an approved Marketing-category template rather than free-form HTML, since it's necessarily outside every recipient's 24-hour reply window.

1. **Create the template.** Meta App Dashboard → WhatsApp → Message Templates → Create Template:
   - Name: `gotech_new_update` (must match `NEW_UPDATE_TEMPLATE_NAME` in `src/lib/whatsapp-broadcast.ts` exactly)
   - Category: `Marketing`
   - Language: `English`
   - Header (optional, static text only — no variable): anything you like, e.g. your brand name and domain
   - Body: a line with `{{1}}` (the update's headline) followed by a blank line, then a line with `{{2}}` (the link) — wording is up to you as long as the variables are in that order and the body doesn't start or end with a variable (Meta rejects that)
   - Footer (optional, static text only): must tell the recipient how to opt out, e.g. "Reply STOP to unsubscribe." — Meta requires this for Marketing-category templates, and the inbound webhook (`src/app/api/whatsapp/webhook/route.ts`) is what actually clears `Contact.whatsappMarketingOptIn` when someone does
   - Optional buttons: a Quick Reply button (e.g. "Stop") works as an opt-out too — the webhook handles both a typed "STOP"/"UNSUBSCRIBE" reply and a tap on such a button — and/or a Website URL button as a separate call-to-action, static or pointing at a fixed page (not tied to `{{2}}`, which already carries the specific link in the body)

   Submit for review — Marketing-category templates get stricter review than Utility ones (avoid ALL CAPS, excessive emoji, or discount/sales-pitch framing for a smoother pass).
2. **Compose and send** — *Newsletters → New WhatsApp broadcast*: pick a headline, a link, and a list, then send. There's no draft or schedule step; it starts sending immediately.
3. **Schedule the cron job** — see step 7 under *Deploying on cPanel* below (`npm run send-whatsapp-broadcasts`). Without it, a broadcast sits stuck in "Sending" forever.

`{{1}}` is the broadcast's headline, `{{2}}` its link — nothing else is templated. If WhatsApp Business isn't connected, or a contact has no phone number or hasn't opted into WhatsApp, they're simply excluded from that broadcast's recipient list rather than causing an error.

### 19. Partner referral program (optional)

Lets external partners bring you leads in exchange for a cut of the deals those leads turn into. Nothing to enable — it's live as soon as the first Partner login exists.

1. **Set the defaults** in *Settings → Referrals*: the commission rate (a percent of a won deal's value, default 10%) and the landing page a partner's link should send visitors to (default `https://gotka.com/landing/new-business/`). The landing page must have the lead-capture **JS widget** on it (*Settings → Forms & Booking* → the "adapts to your site" embed) — that widget is what reads the `?ref=` code off the page URL and sends it with the inquiry. An `<iframe>` embed or a direct link to `/lead` only attributes the lead if the host page passes `?ref=<code>` through on that URL itself.
2. **Add a partner** from *Settings → Team* with the **Partner** role. They get a referral code (`<firstname>-<4 chars>`) the moment the account is created (or switched to Partner), and a login that only ever reaches the partner portal at `/partner` — every CRM page bounces them back there.
3. **They share their link**, `https://crm.yourcompany.com/r/<code>`. Each visit is logged as a click, then 302'd to the landing page with `?ref=<code>` appended; the widget remembers the code for 30 days (localStorage) so a visitor who browses around first, or comes back tomorrow, is still credited — last click wins.
4. **A lead comes in** through the widget with the code → the new Deal has *Referred by* set to that partner and source *Referral* (visible on the deal page, and filterable with the existing source filter). The partner's portal lists it, with its progress shown as In progress / Won / Lost only — never your actual stage names, notes, or anyone else's leads.
5. **The deal is won** → a commission is created: deal value × the partner's rate (their own override from the *Referrals* page, else the default), snapshotted at that moment so later rate changes don't re-price it. It sits as *Awaiting approval* on the **Referrals** page until an admin approves it (or voids it — self-referral, refund, etc.). Editing a won deal's value re-prices a still-pending commission; moving the deal back out of the won stage voids a still-pending one. Once approved (or paid), an admin's decision stands regardless of later deal edits.
6. **Payout**: approved commissions form the partner's available balance. From their portal they request a withdrawal of the whole balance, typing in how they want to be paid (this app doesn't move money). The request shows on the **Referrals** page; an admin pays by hand and clicks *Mark paid* (optionally noting a reference), which marks every commission in it paid too — or *Reject*, which releases them back into the partner's balance. One open request per partner at a time.

Deleting a deal keeps its commission record (with the deal's title snapshotted) so the money trail survives; deleting a partner login deletes their clicks, commissions, and withdrawals with it.

### 20. Public partner directory (optional)

Publishes a Partner-role user's own profile to a public, trilingual directory at `/directory`. Nothing to enable to see the pages — they render as soon as a listing exists — but a partner is only alerted to a new inquiry by WhatsApp once its own template is approved, same as the other proactive notifications above. Both the directory and the partner portal (`/partner`) use gotka.com's own colors rather than the CRM's; on a listing's detail page, the Get in touch card stays in view as you scroll, the logo shows large in the header alongside a Share button, and About/Products & Services/Visit us/Hours are laid out as: About full width, Products & Services and Operating hours side by side, then the address and map as their own full-width row, then FAQ. Every product/service on the detail page is clickable, checkbox-style, and multiple can be picked at once — the first pick scrolls to the Get in touch card and prefills its message with an inquiry listing everything picked so far, so a visitor doesn't have to type out what they're asking about.

1. **A partner fills in their listing** from their portal (*My listing*, `/partner/listing`): company name, tagline, description, products & services, industry, website, address, operating hours, an FAQ, a logo, and optional SEO title/description, then submits it for review. Tagline, Website, and Location share one row, and Operating hours sits beside FAQ, to make better use of the page. The description (About) field supports simple formatting — bold, bullet/numbered lists (pressing Enter at the end of a list item continues it, same as most editors), links (pasted), and images (uploaded directly, not just linked) — via a small toolbar and a Preview tab, rather than plain text only, and grows to fit its content instead of scrolling inside a small box; About and Products & Services display side by side here in the editor. Each product/service is its own entry — a title with its price alongside it, and an optional description — added and removed from a small list rather than typed as one line each; shown in full (not just as tags) on the public listing, where a visitor can click any number of them to build up one inquiry covering everything they're interested in. Operating hours are set day by day — an Open/Closed dropdown per day, with time fields when open, Google-My-Business style — rather than typed as free text; the detail page shows them as a day-by-day table (today highlighted). FAQ is the same kind of repeatable list — a question and an answer per entry, shown on the detail page as an expandable Q&A list. A **Rewrite/Generate with AI** button sits next to About, Products & Services, FAQ, and the SEO fields — each improves whatever's already there (never touching a service's price) or drafts fresh from the rest of the listing when the field is empty; About's rewrite in particular only ever expands the draft with more relevant detail, never shortens it, and is written to work for both traditional search engines and AI answer engines. Address is optional and shown only when filled in — the detail page adds an embedded map once it (or Location) is set. The listing's web address (the `/directory/<slug>` part of its link) is editable from the same page any time; changing it takes effect immediately, so the old link stops resolving.
2. **An admin approves it** from *Settings → Directory*. Approving snapshots the current draft onto the public page — the partner can keep editing afterwards without taking the live listing down; only submitting for review again (or an admin unpublishing it) changes what's public.
3. **Create the WhatsApp template** so a partner is pinged the moment someone contacts them, the same way as *WhatsApp new-lead notifications* above:
   - Name: `new_directory_lead_notification` (must match exactly — this app hard-codes it)
   - Category: `Utility`
   - Language: `English`
   - Header (optional, static text only — no variable): anything you like, e.g. "New directory inquiry"
   - Body: `New directory inquiry from {{1}} ({{2}})` on its own line, then a blank line, then `Reply here: {{3}}`
   - Footer (optional, static text only): anything you like, e.g. "Automated notification from Gotka CRM"
   - No buttons — the link is the body's own `{{3}}` variable. Sample values Meta asks for: e.g. `Sarah Tan` / `Acme Corp` / `https://crm.yourcompany.com/business/directory-leads/abc123`.

   Submit for review, same as the other templates above.
4. **Nothing to opt in** — a partner with a phone number on file gets the WhatsApp ping automatically once the template's approved; without WhatsApp Business connected, or without a phone number, the lead is still created and still emailed (if a system mailbox is configured in *Settings → Newsletter*) — only the WhatsApp half is silently skipped.

`{{1}}` is the visitor's name, `{{2}}` their company (or "No company given"), `{{3}}` a full link to the lead in that partner's portal, built from your `SITE_URL` env var.

A visitor's inquiry never carries the partner's phone or email to the outside world both ways: the public listing itself omits them, and a partner's reply sends from Gotka's own system mailbox rather than their personal one.

**SEO and search**: a listing's detail page carries Open Graph/Twitter metadata, a canonical URL, and schema.org `LocalBusiness` structured data (name, description, address, services with their own price/description, and a link back — never a phone number, which stays internal as above) for both search engines and AI answer engines. When an FAQ is set, the page also carries a separate schema.org `FAQPage` structured data block (each entry as its own `Question`/`acceptedAnswer` pair) — a standard source for search-result rich snippets, and grounded Q&A content for AI answer engines to quote directly. The title/description a partner sets under *Search & social preview* (optionally AI-drafted) take priority; otherwise it falls back to the tagline/About text, same as before that field existed. The social preview image — and the structured data's own image — is the partner's actual logo (served from their approved listing, never a live unapproved edit) rather than Gotka's generic app icon, now that logos are re-served under a real URL instead of the inline `data:` URL they're stored as (which Open Graph/Twitter/JSON-LD can't reference directly). `/directory` and its listings are the only pages included in `/sitemap.xml`; `/robots.txt` allows just that path and disallows the rest of the app (everywhere else already requires a login, so this is belt-and-suspenders). The directory's own search box filters as you type (matching a service's title or description too), with no page reload.

## Deploying on cPanel

The app ships with everything needed for cPanel's **Setup Node.js App** tool (Phusion Passenger): a plain-Node `server.js` entrypoint that regenerates the Prisma Client and rebuilds the app itself on every start (see "No `postinstall` step" below for why that isn't handled by `npm install`).

**Requirements:** a cPanel account with "Setup Node.js App" and "MySQL Databases", and a Node.js version of 20.19+, 22.12+, or 24+ available in the Node selector (Prisma 7 requires one of those; picking the latest available 24.x is the simplest way to satisfy it).

1. **Create the database.** In cPanel → *MySQL Databases*, create a database and a user, add the user to the database with all privileges. cPanel prefixes both with your account username, e.g. database `username_gotka`, user `username_gotka`.

2. **Get the code onto the server**, either:
   - cPanel → *Git Version Control* → clone this repo, then use *Manage → Pull or Deploy → Deploy HEAD Commit*. This runs the copy tasks in `.cpanel.yml` — edit the `DEPLOYPATH` in that file first to match the Application root you'll use in step 3, and commit that change.
   - or upload/`rsync` the repository contents directly into the Application root.

3. **Create the Node app.** cPanel → *Setup Node.js App* → Create:
   - Node.js version: 20.19+, 22.12+, or 24+ (see Requirements above)
   - Application mode: `Production`
   - Application root: e.g. `gotka-crm` (must match `DEPLOYPATH` in `.cpanel.yml` if you used Git deploy)
   - Application URL: the domain or subdomain to serve it on
   - Application startup file: `server.js`

4. **Set environment variables** in that same Node app screen: `DATABASE_URL` (using the database from step 1, e.g. `mysql://username_gotka:PASSWORD@localhost:3306/username_gotka`), `SESSION_SECRET` (required — generate one with `openssl rand -base64 32`), optionally `OPENROUTER_API_KEY` (and `OPENROUTER_MODEL`) to enable the AI Assistant, and optionally `SITE_URL` (e.g. `https://crm.yourcompany.com`) to enable the daily WhatsApp task reminder's task-list link.

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
   (the exact `source` path is the same one the Node app screen shows for running commands by hand). This one entry covers four things every time it runs: syncing every connected mailbox, the daily email task digest, the daily WhatsApp task reminder (needs a Meta-approved template first — see *Daily WhatsApp task reminder* above), and sending any delayed task-assignment notifications that have come due (see *WhatsApp task assignment notifications* above) — both digests check their own rate limit (and, for the WhatsApp one, its configured send hour too) internally, and the assignment-notification phase just looks for rows whose delay has actually elapsed, so it's safe to check all of this every 10 minutes even though most of it only actually sends occasionally. Without this cron entry, mailboxes only sync when someone clicks *Sync now*, neither digest ever sends on its own, and a delayed assignment notification never fires (it just sits pending forever).

   If anyone uses Sequences too, add a second entry the same way for `npm run process-sequences` — an hourly schedule is plenty, since a step's delay is day-granularity. Without this, enrolled contacts never actually get their emails, even though enrolling still "succeeds."

   If you use Newsletters, add a third entry for `npm run send-newsletters` — every 5-10 minutes, similar to `sync-email`, since a scheduled send should go out close to its chosen time and a large audience needs several ticks to work through in paced batches. This also needs `SITE_URL` set (see step 2 under *Daily WhatsApp task reminder* above) to build each recipient's unsubscribe link — without it, this entry logs a message and sends nothing rather than sending without one. Without this cron entry at all, a scheduled or "send now" newsletter sits stuck in Scheduled/Sending forever.

   If you use WhatsApp broadcasts (*Newsletters → New WhatsApp broadcast*), add a fourth entry for `npm run send-whatsapp-broadcasts` — every 5-10 minutes, same reasoning as `send-newsletters`: a broadcast sends immediately on creation, but a large audience needs several ticks to work through in paced batches. Needs a Meta-approved Marketing template (see *WhatsApp broadcasts* below) and WhatsApp Business connected (*Settings → Integrations*). Without this cron entry, a broadcast sits stuck in Sending forever.

   `npm run send-task-digests` and `npm run send-task-digests-whatsapp` (the latter with `-- --force` to bypass its rate limit and send hour) still work as one-off commands for testing a digest by hand — see the sections above — but neither needs its own cron entry anymore.

No native binaries to worry about: Prisma 7's driver-adapter architecture (`@prisma/adapter-mariadb`, already configured in `src/lib/db.ts`) talks to MySQL through a pure JS/WASM query engine instead of a platform-specific compiled binary, which tends to be the main source of pain on shared hosting.

To redeploy after future changes: push to the branch cPanel's Git Version Control tracks, click *Deploy HEAD Commit* again, re-run *NPM Install* if dependencies changed, run `npx prisma migrate deploy` if the schema changed, then restart the app — `server.js` rebuilds from the new source on every start, so there's no `.next` folder to manually clear. Or skip all of that by hand — see *Auto-deploy from GitHub* below.

### Auto-deploy from GitHub (optional)

A push to one branch does everything the manual redeploy steps above do — pull, install (only if `package-lock.json` changed), migrate, restart — without touching cPanel. This only works when the Application root *is* the Git checkout directory itself (the simpler setup the Troubleshooting section below already assumes, not the separate-`DEPLOYPATH`-copy one) — the deploy script runs `git reset --hard` directly on the Application root.

1. **Set `DEPLOY_WEBHOOK_SECRET` and `DEPLOY_BRANCH`** as environment variables in the Node app screen (same place as `DATABASE_URL` etc. in step 4 above): a random secret (`openssl rand -base64 32`) and the exact branch name this environment deploys (e.g. `main`). Both are required together — auto-deploy stays off, returning `503` on the webhook, until they're set.
2. **Register the webhook.** On GitHub: repo → *Settings → Webhooks → Add webhook* — Payload URL `https://yourdomain.com/api/deploy/webhook`, Content type `application/json`, Secret: the same value as `DEPLOY_WEBHOOK_SECRET`, and just the `push` event. Save, then restart the app so it picks up the new env vars.
3. **Push to `DEPLOY_BRANCH`.** GitHub calls the webhook, which spawns the deploy in the background and responds immediately (so GitHub's own webhook delivery doesn't time out waiting on `npm install`/migrations) — a push to any other branch, or any other event GitHub might send (like its initial `ping` when you save the webhook), is acknowledged and ignored without deploying anything.

Everything the deploy does is appended to `deploy.log` in the Application root (already covered by `.gitignore`) — check there first if a push doesn't seem to have taken effect. Since this runs `npx prisma migrate deploy` unattended on every push that changes the schema, a migration goes live the moment its commit reaches `DEPLOY_BRANCH` — the same way this repo's own workflow already pushes straight to a shared branch with no review gate, just now automatic instead of a manual step you'd otherwise run right after.

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
  send-newsletters.ts     CLI to send due/in-progress newsletters (npm run send-newsletters) — for cron
  send-whatsapp-broadcasts.ts  CLI to send a paced batch of any in-progress WhatsApp broadcasts (npm run send-whatsapp-broadcasts) — for cron
  remove-contacts-without-phone.ts  CLI to delete contacts with no phone and no linked history (npm run remove-contacts-without-phone)
  remove-contacts-without-phone-or-email.ts  CLI to delete contacts with no phone AND no email, and no linked history (npm run remove-contacts-without-phone-or-email)
  remove-duplicate-contacts.ts  CLI to delete contacts sharing a phone or email with another contact, keeping the one with history if any (npm run remove-duplicate-contacts)
  remove-contacts-with-invalid-email.ts  CLI to delete contacts whose email is badly formatted and have no linked history (npm run remove-contacts-with-invalid-email)
  remove-contacts-with-invalid-phone.ts  CLI to delete contacts whose phone isn't in "+countrycode..." format and have no linked history (npm run remove-contacts-with-invalid-phone)
  remove-contacts-without-company.ts  CLI to delete contacts with no linked company and no linked history (npm run remove-contacts-without-company)
  remove-companies-without-contacts.ts  CLI to delete companies with no linked contact and no linked history (npm run remove-companies-without-contacts)
  deploy.ts               Pull/install/migrate/restart (npm run deploy) — run by the GitHub push webhook, see "Auto-deploy from GitHub"
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
    whatsapp.ts              Cloud API send + phone matching
    webhook-signature.ts     Shared HMAC-SHA256 verifier for the WhatsApp and GitHub-deploy webhooks
    phone.ts                 Stored-phone standard: normalize to "+<digits>", validate loose E.164 shape, phoneMatchKey() for +/no-+ duplicate matching
    email-format.ts          Shared email-format validator (import + cleanup scripts)
    names.ts                 toTitleCase() — auto-capitalization for contact names
    vcard.ts                 Builds a vCard 3.0 file from a Contact + Company
    notification-href.ts     Shared "where does this notification link to" resolver (layout + poll route)
    ai/                  Gemini client + Prisma-to-prompt context builders
    format.ts, labels.ts, utils.ts
  components/layout/notification-poller.tsx   Background polling + native desktop Notification firing
  app/api/whatsapp/webhook/route.ts   Public: Meta's inbound-message webhook (GET verify, POST receive)
  app/api/deploy/webhook/route.ts     Public: GitHub's push webhook, triggers npm run deploy (see "Auto-deploy from GitHub")
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
| `npm run sync-email` | Sync every connected mailbox, then check both daily digests, once (what the cron job runs) |
| `npm run process-sequences` | Send any due sequence steps once (what the cron job runs) |
| `npm run send-newsletters` | Send a paced batch of any due/in-progress newsletters once (what the cron job runs) |
| `npm run send-whatsapp-broadcasts` | Send a paced batch of any in-progress WhatsApp broadcasts once (what the cron job runs) |
| `npm run send-task-digests` | Manually check/send the daily email task digest once, outside the cron job |
| `npm run send-task-digests-whatsapp` | Manually check/send the daily WhatsApp task reminder once, outside the cron job |
| `npm run deploy` | Pull/install/migrate/restart once, by hand — what the GitHub push webhook runs (see *Auto-deploy from GitHub*) |
| `npx prisma studio` | Browse/edit data in a GUI |
| `npx prisma migrate dev --name <name>` | Create and apply a new migration |
| `npx prisma db seed` | (Re-)seed sample data; also creates the first login if none exist |
