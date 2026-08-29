// A hand-maintained record of what shipped, for the Settings > Changelog
// page. Versions are sequential and specific to this list — they don't
// track package.json or any git tag. Newest first.
export type ChangelogEntry = {
  version: string;
  date: string; // ISO date
  title: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.33",
    date: "2026-08-29",
    title: "One cron job instead of three",
    changes: [
      "The daily email task digest and the daily WhatsApp task reminder now ride along on the same cron job as email sync, instead of each needing their own — see the README's updated cPanel setup steps if you deployed before this",
    ],
  },
  {
    version: "1.32",
    date: "2026-08-29",
    title: "WhatsApp formatting and attachments",
    changes: [
      "The WhatsApp reply box now has a Bold/Italic/Strikethrough/Monospace toolbar, rendered the same way for both you and the contact",
      "Attach a photo, video, or document to a WhatsApp message — sent and received attachments both show up inline in the thread and on the contact/company/deal/task activity feed",
    ],
  },
  {
    version: "1.31",
    date: "2026-08-29",
    title: "Mention-reply forwarding via WhatsApp",
    changes: [
      "Swipe-reply to a WhatsApp @mention notification and it's now forwarded to whoever mentioned you, and logged in the CRM on the same note or task — see the README's WhatsApp section for the new template this needs",
    ],
  },
  {
    version: "1.30",
    date: "2026-08-29",
    title: "Fixed a duplicated host in the WhatsApp webhook URL",
    changes: [
      "Settings → Integrations' WhatsApp webhook URL could come out as \"https://yourdomain.com, yourdomain.com/api/whatsapp/webhook\" behind more than one reverse-proxy hop, which Meta then rejected as invalid — now only the first hop's host/protocol is used",
    ],
  },
  {
    version: "1.29",
    date: "2026-08-29",
    title: "Fixed Currency and reminder-hour settings appearing to revert after Save",
    changes: [
      "Settings → General's Currency picker and Settings → Integrations' daily reminder send-time picker now correctly show the value you just saved, instead of snapping back to what they were before",
    ],
  },
  {
    version: "1.28",
    date: "2026-08-29",
    title: "Tasks page defaults to your own tasks",
    changes: [
      "The Tasks page assignee filter now defaults to your own tasks on every tab (Open/Overdue/Due today/Completed), instead of showing everyone's",
      "Added an \"Unassigned\" option to the assignee filter to find tasks with no owner; \"All assignees\" still shows everything",
    ],
  },
  {
    version: "1.27",
    date: "2026-08-29",
    title: "Fix WhatsApp template param mismatches for real templates",
    changes: [
      "The @mention notification is back to sending its link as a plain body variable (a full URL) instead of a button — matches what most people actually approve in Meta Business Manager, and fixes a \"Number of parameters does not match\" error against a template built that way",
      "The daily task digest now also sends a header variable (the recipient's first name), for templates that greet by name in the header as well as the body — previously omitted, causing the same param-mismatch error for any template with a header variable",
    ],
  },
  {
    version: "1.26",
    date: "2026-08-29",
    title: "Fix the WhatsApp thread's scroll-to-bottom for real",
    changes: [
      "Opening a WhatsApp conversation now reliably lands on the true last message instead of stopping just short of it behind the composer — the fix now scrolls the page's own scroll container to its actual bottom rather than estimating a margin",
    ],
  },
  {
    version: "1.25",
    date: "2026-08-29",
    title: "Test buttons for the WhatsApp templates, no terminal needed",
    changes: [
      "Settings → Integrations: Send now sends the real daily task reminder to everyone opted in, right away, ignoring the configured hour and each person's once-a-day limit",
      "Send test on the task reminder and the @mention notification each send a one-off test message (placeholder counts for the reminder) to your own number, to confirm a template is approved and reachable without needing real due tasks or an actual @mention",
    ],
  },
  {
    version: "1.24",
    date: "2026-08-29",
    title: "Configurable send time for the WhatsApp task reminder",
    changes: [
      "Settings → Integrations: pick what time the daily WhatsApp task reminder sends, in the same timezone as the booking scheduler — previously fixed by whatever time the cron job happened to run",
      "The reminder script now checks that configured hour itself, so its cron job should run hourly rather than once a day; a new --force flag bypasses the check for a manual test send",
    ],
  },
  {
    version: "1.23",
    date: "2026-08-28",
    title: "WhatsApp notifications for @mentions",
    changes: [
      "Being @mentioned in a note or task now also sends a WhatsApp message — who mentioned you, the tagged text, and a link back to the page — to anyone who's set a phone number in Settings → Team (same opt-in as the daily task reminder)",
      "Requires a Meta-approved message template, same as the daily reminder (see the README for the template to submit)",
    ],
  },
  {
    version: "1.22",
    date: "2026-08-28",
    title: "WhatsApp task reminder now links to your tasks and splits overdue/due today",
    changes: [
      "The daily WhatsApp task reminder now reports overdue and due-today counts separately, and links straight to your own task list — requires updating the approved Meta template to the new 4-variable body (see the README) and setting a SITE_URL env var",
    ],
  },
  {
    version: "1.21",
    date: "2026-08-28",
    title: "Harder-to-miss unread WhatsApp messages",
    changes: [
      "The WhatsApp inbox now shows an \"N unread conversations\" banner, tints and left-borders unread rows, and tags each with a \"New\" badge",
      "The browser tab title picks up an unread count (e.g. \"(2) WhatsApp\") while you're on the WhatsApp page, live as new messages arrive",
    ],
  },
  {
    version: "1.20",
    date: "2026-08-28",
    title: "Edit teammates from Settings → Team",
    changes: [
      "Settings → Team: edit a teammate's name, email, title, and WhatsApp reminder number directly from their row — no more self-service-only phone number",
    ],
  },
  {
    version: "1.19",
    date: "2026-08-28",
    title: "Reorganized Settings, full-width pages, and a daily WhatsApp reminder",
    changes: [
      "Settings is now split into categories — General, Sales, Team, Forms & Booking, Integrations — with a sidebar sub-menu, instead of one long scrolling page",
      "Optional daily WhatsApp message summarizing each user's due/overdue tasks, opt-in per user with a phone number set from Settings → Team; requires a Meta-approved message template, since a proactive daily reminder falls outside WhatsApp's 24-hour freeform-reply window (see the README for the template to submit)",
      "Settings and most other pages now use the full available page width instead of a narrow centered column",
    ],
  },
  {
    version: "1.18",
    date: "2026-08-28",
    title: "Products & Services catalog: bundles, billing frequency, and margin",
    changes: [
      "A dedicated Products & Services management page (Settings → Sales → Products & Services), with a Product/Service type distinction, replacing the old read-only embedded list",
      "Each catalog item can carry a billing frequency (One-time/Monthly/Quarterly/Yearly, informational) and an optional unit cost, with margin computed live from price and cost so it never drifts out of sync",
      "Catalog items can bundle other items as components, one level deep — a bundle's components can't themselves have components, so bundles can't cycle",
      "Reusable quote templates (Settings → Sales → Quote templates): a saved set of line items and default terms that a new quote can start from via a picker, fully editable afterward",
      "Picking a bundle on a quote or quote template fills one line with the bundle's own name and price by default, with an \"Expand into N lines\" action on that row for the itemized breakdown",
    ],
  },
  {
    version: "1.17",
    date: "2026-08-27",
    title: "Search fixes and inline editing",
    changes: [
      "Fixed global search: a multi-word contact query (e.g. \"eugene boon\") now matches, instead of only matching when the full query sat in a single field",
      "Contact lifecycle stage can now be changed inline from the contact's own page, no need to open the edit form",
      "The Contacts list search now filters live as you type, matching the Companies page",
      "CSV import can infer a company's industry from a free-text business description when there's no usable Industry column, and now imports the company's address",
      "Dashboard stage-by-stage rows now link to that exact stage's column on the Deals board, and stat card labels no longer wrap out of alignment",
      "A Changelog link now appears in the sidebar/mobile nav under Settings, not just as a card on the Settings page",
      "Lowered the default DB connection pool size to make room for CLI scripts on constrained hosting",
      "Cleanup scripts: remove-duplicate-contacts now also catches badly-formatted email/phone, and cleans up companies left with zero contacts after a dedup",
    ],
  },
  {
    version: "1.16",
    date: "2026-08-27",
    title: "Cleaner contact data, AI drafting, and desktop alerts",
    changes: [
      "Contact first and last names are auto-capitalized everywhere — data entry, edits, and CSV import",
      "\"Save to phone\" on a contact's page downloads a vCard with their and their company's details, ready to add to your phone's contacts",
      "CSV import now validates email and phone format (dropping only the bad field, not the whole contact), converts phone numbers to the +country-code standard, catches duplicates by phone even when one side is missing its \"+\", and imports company industry",
      "Draft with AI on the Email/WhatsApp send dialogs (Task and Contact pages) — one click drafts a follow-up grounded in that contact's real history",
      "New cleanup tools: contacts with a badly-formatted phone, contacts without a company, and companies without a contact",
      "Desktop notifications — enable them from the notification bell to get a browser alert for new notifications while GoTech is open in another tab",
    ],
  },
  {
    version: "1.15",
    date: "2026-08-26",
    title: "A page for every task, with its own activity log",
    changes: [
      "Every task now has its own page — full details, linked company/deal/project, assignees, followers, and time logged",
      "Task pages have their own activity log, the same notes feed already on Contact/Company/Deal/Project pages",
      "Email or WhatsApp a task's client straight from the task page — the message logs as an activity on both the task and the contact",
      "Task titles across every task list now link to this new page",
    ],
  },
  {
    version: "1.14",
    date: "2026-08-26",
    title: "Dashboard shortcuts and navigation",
    changes: [
      "Dashboard stat cards (Companies, Contacts, My tasks due today, My overdue tasks, Needs follow-up) are now clickable and jump straight to the matching filtered view",
      "Tasks without a due date now sort after tasks with one, instead of appearing first",
      "Breadcrumb navigation on every detail, edit, and sub-resource page for an easy way back up",
    ],
  },
  {
    version: "1.13",
    date: "2026-08-26",
    title: "Company industry and a phone number standard",
    changes: [
      "Company industry is now a curated category picked from a list, instead of free text",
      "Phone numbers on Contacts and Companies must include a country code and a \"+\" sign; public forms (lead capture, booking) stay permissive so formatting mistakes never cost real business",
    ],
  },
  {
    version: "1.12",
    date: "2026-08-26",
    title: "Contact lifecycle, lists, and data cleanup",
    changes: [
      "Contact lifecycle stage (Lead, MQL, SQL, Customer, etc.), set automatically as a contact moves through a deal or submits the lead form",
      "Contact lists — static or dynamic segments, with bulk sequence enrollment",
      "A \"Deals by source\" breakdown on the dashboard",
      "CSV import now fetches profile photos, can fill in missing info on re-import, and requires a phone or email",
      "New cleanup tools for contacts missing a phone/email, duplicate contacts, and malformed email addresses",
    ],
  },
  {
    version: "1.11",
    date: "2026-08-25",
    title: "WhatsApp Business and lead source tracking",
    changes: [
      "WhatsApp Business integration via the official Meta Cloud API — messages log automatically to the contact's activity timeline",
      "Track where each deal came from (lead source), auto-tagged for public lead-form submissions",
      "Filter tasks by assignee; companies gained a Resources section too",
      "Refreshed the GoTech brand mark across the favicon and app icon",
    ],
  },
  {
    version: "1.10",
    date: "2026-08-22",
    title: "Role-based permissions and project budgets",
    changes: [
      "Role-based permissions: Admin (full access) vs Developer (scoped to their own work)",
      "Project hour/cost budget tracking against timeline targets",
      "Deal resource links can now be edited after adding",
    ],
  },
  {
    version: "1.9",
    date: "2026-08-20",
    title: "Task priority, @mentions, and a personalized dashboard",
    changes: [
      "Scan a business card or import a vCard to fill in a new contact",
      "A personalized \"My Tasks\" dashboard card, a nav badge for due/overdue tasks, and an optional daily digest email",
      "Task priority (Low/Medium/High) and multiple assignees per task",
      "Follow a task without owning it, to keep visibility",
      "@mention a teammate in an activity note or task description — they get a notification",
      "A Resources section on deals, and drag-and-drop reordering of a deal or contact's page sections",
      "Smarter CSV import: recognizes more job-title columns, folds category/industry into notes",
      "Live search while typing on the Companies page",
    ],
  },
  {
    version: "1.8",
    date: "2026-08-19",
    title: "Task followers",
    changes: [
      "Tasks can now have followers (visibility) in addition to assignees",
      "Added the GoTech favicon and app icon",
    ],
  },
  {
    version: "1.7",
    date: "2026-08-18",
    title: "Lead capture, booking, email sync, and the client portal",
    changes: [
      "Public lead-capture form and a meeting scheduler / booking link for the marketing site",
      "Multiple pipelines — different deal types can now use their own stage list",
      "Two-way email sync (IMAP/SMTP), auto-logged to the contact's activity timeline",
      "Deal ownership and a leaderboard ranking teammates by deals won",
      "Time tracking on tasks",
      "Invoice / payment-milestone tracking on projects",
      "A client portal for scoped, external access to a company's projects and invoices",
      "Outbound email sequences / cadences",
    ],
  },
  {
    version: "1.6",
    date: "2026-08-16",
    title: "Mobile navigation",
    changes: ["Replaced the mobile nav's scrolling strip with a hamburger drawer"],
  },
  {
    version: "1.5",
    date: "2026-08-14",
    title: "Quotes, delivery handoff, and pipeline hygiene",
    changes: [
      "Contact profile photos, with automatic compression and a click-to-zoom view",
      "Quotes & Proposals: line items, shareable links, view tracking",
      "A won deal now automatically creates a delivery Project with milestone tasks",
      "Stage-gate: block advancing a deal to Won with incomplete records",
      "Flags for open deals with no scheduled next step, and for deals going stale",
    ],
  },
  {
    version: "1.4",
    date: "2026-08-13",
    title: "Click-to-contact links",
    changes: ["Click straight through to WhatsApp or email from a contact or company"],
  },
  {
    version: "1.3",
    date: "2026-08-12",
    title: "Search, filtering, and reliability",
    changes: [
      "Search on the Tasks and Deals pages",
      "A task's Deal picker now filters to the selected company/contact",
      "Automatic recovery from stale-build errors after a deploy",
    ],
  },
  {
    version: "1.2",
    date: "2026-08-11",
    title: "Currency, user management, and workflow polish",
    changes: [
      "Set a CRM-wide currency in Settings",
      "In-app user management — create and reset teammate logins",
      "Task editing, optional last names, auto-filtered company/contact pickers",
      "Link an existing contact to a company",
      "Self-service and admin password reset",
    ],
  },
  {
    version: "1.1",
    date: "2026-08-06",
    title: "Deployment and theming",
    changes: [
      "cPanel deployment support",
      "Light/dark theme toggle",
    ],
  },
  {
    version: "1.0",
    date: "2026-08-06",
    title: "Launch: Companies, Contacts, Deals, and Tasks",
    changes: [
      "Core CRM: Companies, Contacts, a kanban Deals pipeline, and Tasks with an activity timeline",
      "Import contacts from a Google Contacts CSV export",
      "AI Assistant on Contact/Company/Deal pages, and an AI-powered dashboard diagnosis",
      "Individual login accounts",
    ],
  },
];
