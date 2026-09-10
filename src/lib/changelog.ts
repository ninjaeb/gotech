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
    version: "1.79",
    date: "2026-09-10",
    title: "Admin: transfer a listing to a different partner account",
    changes: [
      "Settings → Directory's \"All listings\" table now has a Transfer control on each listing — pick another partner account and it immediately becomes that listing's owner",
      "Everything else about the listing (status, published page, leads) stays exactly as it was — only who manages it changes",
    ],
  },
  {
    version: "1.78",
    date: "2026-09-10",
    title: "Listing header: website back beside state/country on mobile",
    changes: [
      "On phones, website now shares the same line as state/country again instead of sitting on its own line below — there's enough width for all three there, unlike the narrower column beside the header's larger logo on tablet and desktop",
    ],
  },
  {
    version: "1.77",
    date: "2026-09-10",
    title: "Listing header: state/website on their own lines, smaller mobile logo",
    changes: [
      "State/country and website now each sit on their own line below the industry/category tags, instead of sharing one wrapping row",
      "The header logo is smaller on phones (96px) and full-size on tablet and desktop (200px) — fixes the company name clipping instead of wrapping on narrow screens",
    ],
  },
  {
    version: "1.76",
    date: "2026-09-10",
    title: "Listing header: industry, state, and website move up beside the logo",
    changes: [
      "Industry, categories, state, country, and website now sit in the same column as the company name and tagline, beside the logo, instead of their own full-width row further down the header",
      "Fills the empty space that was otherwise left below a short tagline next to the header's larger logo",
    ],
  },
  {
    version: "1.75",
    date: "2026-09-10",
    title: "AI Auto Create also writes SEO title/description and fetches your logo",
    changes: [
      "AI Auto Create now also writes the Search & social preview section's SEO title and description, drafted together with everything else in the same pass",
      "AI Auto Create now also fills in your logo, copied straight from your Google Maps listing's own photo when it has one",
    ],
  },
  {
    version: "1.74",
    date: "2026-09-10",
    title: "Share/Recommend buttons moved into the listing header",
    changes: [
      "Share and Recommend now sit in the listing page header's top-right corner, next to the logo and name, instead of their own row below the category and location badges",
      "On tablet and desktop they're stacked — Recommend Business above Share Business; on phones they show as their own row below the badges (or stack if the screen's too narrow to fit both side by side)",
      "The Share button now has a proper \"Share Business\" label in English, Chinese, and Malay, instead of always showing English \"Share\"",
    ],
  },
  {
    version: "1.73",
    date: "2026-09-10",
    title: "Operating hours upgrades, AI Auto Translate, editor layout",
    changes: [
      "Operating hours now has a 24 Hours option alongside Open/Closed — no time fields to fill in for a day that never closes",
      "A \"Copy to weekday\" link on Monday copies its hours (or 24 Hours) onto Tuesday through Friday in one click",
      "AI Auto Business Details Creation now sits on the left and Public URL on the right, in the listing editor's first row",
      "A new AI Auto Translate button next to AI Auto Create fills in the Chinese and Malay tabs from your English content, without scrolling down to the language tabs",
    ],
  },
  {
    version: "1.72",
    date: "2026-09-10",
    title: "AI Auto Create: dynamic Maps search, Website field moved in",
    changes: [
      "Your business on Google Maps now searches live as you type — no more Search button to click",
      "The Website field now lives inside the AI Auto Business Details Creation section itself, right where it gets filled in from",
      "A Google Maps key blocked by an HTTP referrer restriction now explains why (these requests run on the server, which sends no referrer) instead of just showing Google's raw error",
    ],
  },
  {
    version: "1.71",
    date: "2026-09-09",
    title: "Listing editor: AI Auto Business Details Creation",
    changes: [
      "A new section at the top of a business's listing editor finds the business on Google Maps — picking it fills in the Website field straight away",
      "One click on AI Auto Create then drafts the whole listing from the Google listing and the website: About, tagline, Products & services, FAQ, industry, and business categories are AI-written, while operating hours and address are copied straight from Google — all as a draft to review before saving",
      "Google Maps search needs a GOOGLE_PLACES_API_KEY (see .env.example); without it, AI Auto Create still works from the Website field alone",
    ],
  },
  {
    version: "1.70",
    date: "2026-09-09",
    title: "Listing page: clickable address, mobile jump bar",
    changes: [
      "A listing's address under Visit us is now a link that opens the location in Google Maps",
      "On mobile, a listing page now has a bar pinned to the bottom of the screen with quick jumps to Products & Services and Get in touch",
    ],
  },
  {
    version: "1.69",
    date: "2026-09-09",
    title: "Task assignees/followers: searchable multi-select, staff only",
    changes: [
      "Picking a task's assignees and followers is now a searchable multi-select dropdown instead of a long list of checkboxes, on both Edit task and the Tasks page's quick Add task form",
      "Add task now has a Followers field too, matching Edit task — it was missing there before",
      "The list to pick from is now System logins only (Admin/Sales/Technical) — Partners no longer show up as possible assignees or followers, since a Partner has no task list of their own to see one land in",
    ],
  },
  {
    version: "1.68",
    date: "2026-09-09",
    title: "Friendly category pages, SEO/GEO upgrades, and a wider search box",
    changes: [
      "The directory's search box is now wider and sits on its own row above the industry/category filters, instead of squeezed alongside them",
      "Every business category now has its own crawlable page — /directory/category/<name>, with /zh or /ms for the other languages — linked directly from the home page and every category page, not just reachable through the category dropdown",
      "The home page and every listing now support a specific language via ?lang= (in addition to the language switcher), and every directory page declares its language versions to search engines",
      "The home page and every category page now carry structured data describing what's on the page, on top of a listing's own existing structured data",
      "The homepage subtitle is shorter: \"Browse trusted businesses and reach out directly.\"",
    ],
  },
  {
    version: "1.67",
    date: "2026-09-09",
    title: "Directory nav menu: clearer sign-in label, a link back for visitors",
    changes: [
      "A visitor who isn't signed in can now get back to the directory listing from the menu on pages outside it, like List your business or the sign-in page",
      "The sign-in link is now labeled \"Business Login\" instead of the more roundabout \"Login / Register\", since it only ever leads to a sign-in page",
    ],
  },
  {
    version: "1.66",
    date: "2026-09-09",
    title: "Directory nav menu no longer surfaces the internal /system link",
    changes: [
      "A staff member browsing the public directory while signed in now gets a \"Go to CRM\" menu link that no longer exposes the CRM's internal /system path directly — it routes through the business portal, which sends them on to the right place",
    ],
  },
  {
    version: "1.65",
    date: "2026-09-09",
    title: "Settings → Team: mobile layout fix, System logins vs Partners",
    changes: [
      "Settings → Team now splits Users into two sections — System logins (Admin/Sales/Technical, the accounts that actually sign into the CRM) and Partners — instead of one flat list mixing both",
      "Fixed a mobile layout bug where a row's action buttons (role, reset password, delete) could run off the edge of the screen on a phone instead of wrapping onto their own line",
    ],
  },
  {
    version: "1.64",
    date: "2026-09-09",
    title: "Pick multiple products & services for one inquiry",
    changes: [
      "A visitor can now pick more than one product/service on a listing's detail page — each shows a clear, persistent checkbox-style marker (not just a hover effect) so it's obvious they're clickable, and picking several builds one inquiry listing everything they're interested in instead of only the last thing clicked",
    ],
  },
  {
    version: "1.63",
    date: "2026-09-09",
    title: "Editor layout cleanup, a list-editing bug fix, and clickable products",
    changes: [
      "My listing's editor is reorganized to use its space better: Tagline/Website/Location now share one row, Operating hours sits beside FAQ, and each product/service's price now sits next to its title instead of below its description",
      "The About field now grows to fit its content instead of scrolling inside a small box, and fixed a bug where pressing Enter at the end of a bullet or numbered list started a plain new line instead of continuing the list",
      "Services are now labeled Products & Services throughout, for both the editor and the public listing",
      "On a listing's detail page, every product/service is now clickable — picking one scrolls to the Get in touch card and prefills the message with an inquiry about it",
      "Font sizes across a listing's detail page (products/services, the hours table) are now consistent with the rest of the page",
    ],
  },
  {
    version: "1.62",
    date: "2026-09-09",
    title: "SEO/GEO-optimized About rewrites, and a listing FAQ section",
    changes: [
      "The About field's Rewrite with AI button now optimizes for AI answer engines as well as search engines, and always expands rather than shortens — it'll never trim your draft down, only add relevant detail",
      "A listing can now have an FAQ section — a partner can add, edit, and reorder question-and-answer entries from My listing, with a Generate with AI button that drafts or improves them from the rest of the listing",
      "A listing's detail page shows its FAQ as an expandable Q&A list, with schema.org FAQPage structured data for search-result rich snippets and AI answer engines",
    ],
  },
  {
    version: "1.61",
    date: "2026-09-09",
    title: "AI-written SEO, service pricing, and a few listing refinements",
    changes: [
      "New Search & social preview fields (SEO title and description) on a listing, with a Generate with AI button — falls back to the existing tagline/About-based behavior when left blank",
      "A listing's social share preview (and its schema.org image) now uses the partner's own logo instead of Gotka's generic app icon",
      "Services are now a full catalog entry — a title, an optional description, and an optional price — instead of just a name; shown in full on the detail page, with an AI button that improves the wording without ever touching a price",
      "Detail page layout: About is back to full width, Services now sits side by side with Operating hours (instead of with About), and the map has its own full-width row with the day-by-day hours table promoted to its own card",
      "Bigger logo and a Share button (native share sheet, or copies the link) on the detail page header",
    ],
  },
  {
    version: "1.60",
    date: "2026-09-09",
    title: "Photo uploads, a proper hours table, and a tidier layout",
    changes: [
      "The About field's Image button now uploads a photo directly, instead of only accepting a pasted image URL",
      "A listing's detail page shows a proper day-by-day hours table (today highlighted), side by side with the map, and About/Services now sit side by side too — on both the detail page and the partner's own editor, which now makes better use of the full-width layout",
    ],
  },
  {
    version: "1.59",
    date: "2026-09-09",
    title: "Simple formatting on the About field",
    changes: [
      "A partner's About field now supports simple formatting — bold, bullet and numbered lists, links, and images — via a small toolbar above the field, with a Preview tab to see how it'll look before saving",
      "A listing's detail page renders this formatting for real (bold text, real lists, clickable links, embedded images); its search-engine and AI-answer-engine description stays plain text either way",
    ],
  },
  {
    version: "1.58",
    date: "2026-09-09",
    title: "Gotka.com branding on the directory and partner portal",
    changes: [
      "The public directory and partner portal now use gotka.com's own colors — petrol teal for links and highlights, LED green for primary buttons — instead of the CRM's indigo",
      "On a listing's detail page, the Get in touch card now follows you down the page instead of scrolling out of view once the About/Services/Visit us content runs long",
      "Bigger, easier-to-read text throughout a listing's detail page — the About and Services sections, the Visit us details, and the inquiry form",
    ],
  },
  {
    version: "1.57",
    date: "2026-09-09",
    title: "Google-My-Business-style operating hours",
    changes: [
      "Operating hours on a partner listing are now set day by day — an Open/Closed dropdown per day, with opening and closing time fields when open — instead of typing hours as free text",
      "A listing's detail page groups consecutive days with matching hours onto one line (e.g. \"Monday – Friday: 09:00 – 18:00\"), and its schema.org structured data now includes proper machine-readable opening hours, which free text couldn't support",
      "Service tags on a listing's detail page are noticeably bigger, easier to scan at a glance",
    ],
  },
  {
    version: "1.56",
    date: "2026-09-09",
    title: "Directory SEO, editable web address, and live search",
    changes: [
      "A partner can now change their listing's web address (the /directory/<slug> part of the link) from My listing — the old link stops working the moment the new one takes effect",
      "A listing's detail page now carries proper SEO metadata (Open Graph, Twitter card, canonical URL) and schema.org structured data for search engines and AI answer engines — never including the partner's own phone or email, which stay internal either way",
      "New Address, Operating hours, and an embedded map on a listing's detail page — set from My listing, shown only when filled in",
      "/directory and /sitemap.xml/robots.txt are now included for search engines; every other page stays out of it, same as before",
      "The directory's search box now filters as you type — no more pressing Enter or waiting for a page reload",
    ],
  },
  {
    version: "1.55",
    date: "2026-09-09",
    title: "Sales and Technical team roles",
    changes: [
      "Two new login roles alongside Admin and Partner: Sales (Companies, Contacts, Deals, Quotes, and the Leaderboard) and Technical team (Projects and Tasks) — each scoped to just its own area, with no access to Settings or any other admin page",
      "The Developer role is renamed Technical team; every existing Developer login keeps exactly the same access under the new name",
      "New-lead WhatsApp alerts now reach opted-in Sales logins too, not just Admins, matching who can actually open a deal",
      "Partner directory listing: a Rewrite with AI button on the About and Services fields drafts or improves the wording from what's already filled in",
      "Partner portal: a new Profile page to change your own email, password, and contact phone (used only for WhatsApp lead alerts — never shown on your public listing)",
      "Submit for review on a partner listing now validates and saves whatever's currently in the form, with the error shown right under the field that needs fixing, instead of an unrelated saved copy from before your last edit",
      "The public directory and the whole partner portal now use the full page width instead of a centered column",
      "Fixed a layout bug on a listing's detail page where the contact form's spam-guard field could push the page's scroll area far off to the side",
    ],
  },
  {
    version: "1.54",
    date: "2026-09-09",
    title: "Public partner directory",
    changes: [
      "A public, trilingual (EN / 中文 / BM) partner directory at /directory, styled after gotka.com — browse partners by company, services, and industry, then view a detail page and send an inquiry with no login required",
      "A visitor's contact form never exposes the partner's own phone or email — the inquiry lands as a lead the partner replies to from inside the CRM, which the visitor receives from a Gotka system address",
      "Partner portal: a My listing page to edit and submit your directory profile for review, and a Directory leads page to pick up, reply to, and track each inquiry's status and value, with new stats on the Overview page",
      "A partner is alerted by WhatsApp and email as soon as a new directory inquiry comes in",
      "Settings → Directory (admin): approve or reject submitted listings, unpublish a live one, and see directory-wide stats and recent leads",
    ],
  },
  {
    version: "1.53",
    date: "2026-09-08",
    title: "Partner referral program",
    changes: [
      "A new Partner login role for external referrers, with their own portal (/partner) — their referral link, click and lead counts, each lead's progress, commissions earned, and withdrawal requests — and no access to the CRM itself",
      "Referral links (/r/<code>) count every click and send visitors on to the landing page; the lead-capture widget passes the code back, so the resulting deal is marked Referred by that partner with source Referral",
      "A commission (deal value × rate) is created when a referred deal is won, for an admin to approve; Settings → Referrals sets the default rate and landing page, with a per-partner rate override on the new Referrals page",
      "Referrals page (admin): every partner's clicks, leads, won deals and balance, plus approving commissions and marking withdrawal requests paid",
    ],
  },
  {
    version: "1.52",
    date: "2026-09-08",
    title: "WhatsApp updates: subscribe channel choice and broadcasts",
    changes: [
      "The public subscribe form now asks whether to get updates via Email, WhatsApp, or Both — name, email, and phone are all required, and the form states the no-spam/unsubscribe-anytime policy up front",
      "Newsletters → New WhatsApp broadcast: send a one-off update (headline + link) to a list's WhatsApp-opted-in contacts via an approved Meta template",
      "A WhatsApp reply of \"STOP\"/\"UNSUBSCRIBE\", typed or tapped as a template button, opts a contact out of WhatsApp updates",
    ],
  },
  {
    version: "1.51",
    date: "2026-09-07",
    title: "A public newsletter subscribe form",
    changes: [
      "Settings → Newsletter: pick which list a public subscribe form (name + email) adds new contacts to — a direct link (/subscribe), an iframe embed, and a JS widget (/embed/newsletter-form.js) that adopts your site's own fonts/colors/input styling are all generated automatically once you do",
      "Subscribing finds or creates a Contact, marks them a Subscriber, and clears any previous unsubscribe — same as resubscribing to any mailing list",
    ],
  },
  {
    version: "1.50",
    date: "2026-09-07",
    title: "Auto-deploy end-to-end test",
    changes: [
      "If you're reading this on the live site, the GitHub push webhook successfully pulled this commit, ran any pending migration, and restarted the app on its own — no manual redeploy needed",
    ],
  },
  {
    version: "1.49",
    date: "2026-09-07",
    title: "Auto-deploy from GitHub",
    changes: [
      "A push to the deployed branch can now pull, install, migrate, and restart the app on its own via a GitHub webhook — see the README's \"Auto-deploy from GitHub\" section to set it up (DEPLOY_WEBHOOK_SECRET/DEPLOY_BRANCH)",
    ],
  },
  {
    version: "1.48",
    date: "2026-09-05",
    title: "Lead-capture widget that adapts to your site's own style",
    changes: [
      "Settings → Forms & Booking now also offers a JS embed for the lead-capture form, alongside the existing iframe snippet — it renders straight into your page instead of an isolated iframe, so it automatically picks up your site's own fonts, colors, and input/button styling",
      "Submissions from the widget create the same Contact + Deal as the hosted /lead form and iframe — no separate flow to maintain",
    ],
  },
  {
    version: "1.47",
    date: "2026-09-04",
    title: "WhatsApp now receives from every number, not just known contacts",
    changes: [
      "An inbound WhatsApp message from a number that doesn't match an existing contact now creates one automatically (named from their WhatsApp profile when available) instead of being silently dropped — every conversation now shows up in the WhatsApp inbox",
    ],
  },
  {
    version: "1.46",
    date: "2026-09-04",
    title: "AI-drafted testimonial requests",
    changes: [
      "Request testimonial on a Contact page generates a unique link and an AI-drafted starting testimonial based on what that client actually bought (their won deals' accepted quotes)",
      "The client opens the link, edits the draft however they like, and submits — no login required",
      "See submitted testimonials (with an optional star rating) right on the contact's page; regenerate the draft or copy the link again anytime before they submit",
    ],
  },
  {
    version: "1.45",
    date: "2026-09-04",
    title: "Link a deal from a Company's quick task form, and richer company data on import",
    changes: [
      "A Company page's quick \"Add task\" form now has a Deal picker (when the company has one or more) so a task can be tied to the right deal without opening the full task form",
      "Scanning a business card or importing a .vcf now also fills in a new (or existing, if blank) company's website domain, phone, and address — the domain from the card's own printed website or the contact's email, phone/address from the card or the vCard's work-typed fields — never overwriting anything already set",
    ],
  },
  {
    version: "1.44",
    date: "2026-09-04",
    title: "Searchable company, contact, and deal pickers",
    changes: [
      "Company/Contact/Deal fields on the Deal, Task, and Contact forms (and linking an existing contact to a company, or adding one to a list) are now type-to-search instead of a long scrolling dropdown — handy once you've got hundreds or thousands of companies",
    ],
  },
  {
    version: "1.43",
    date: "2026-09-04",
    title: "Paste images and attach files to notes and task descriptions",
    changes: [
      "The note composer (on Companies, Contacts, Deals, Projects, and Tasks) and a task's Description field now take attachments — paste a screenshot straight from your clipboard, or click Attach file for anything else",
      "Attachments show inline as an image preview, or a small file card you can open or download, wherever that note or task appears",
      "5MB per file — a file over that is flagged right away, before you save",
    ],
  },
  {
    version: "1.42",
    date: "2026-09-03",
    title: "Drag to reorder pipeline stages, and success confirmations everywhere",
    changes: [
      "Settings → Sales pipeline → Stages: drag a stage by its handle to reorder it, alongside the existing up/down arrows",
      "Every settings save and action button across the app now confirms with a toast when it's worked — including ones that redirect to a new page, and ones where the row you acted on disappears (like deleting an item or setting a new default pipeline)",
      "Fixed two spots where a failed save (an invalid billing rate, a role change) went silent instead of showing an error",
    ],
  },
  {
    version: "1.41",
    date: "2026-09-02",
    title: "Tasks search now reaches companies, contacts, deals",
    changes: [
      "The Tasks search box now filters instantly as you type (no more pressing Enter), and matches against company, contact, deal/project, and assignee names too — not just the task's own title and description",
    ],
  },
  {
    version: "1.40",
    date: "2026-08-30",
    title: "Delay the task assignment notification",
    changes: [
      "Settings → Integrations → WhatsApp task assignment notifications: pick a Send after delay (Immediately, 15/30 min, 1-5 hours) instead of always notifying the instant a task is assigned",
      "Removing someone as an assignee before their delayed notification fires cancels it — they never hear about a task they're no longer on",
    ],
  },
  {
    version: "1.39",
    date: "2026-08-30",
    title: "Auto-follow on assignment, and status-change notifications for followers",
    changes: [
      "Assigning someone a task now automatically follows that task for you too, so you don't have to remember to add yourself as a follower to stay in the loop",
      "Following a task now actually does something: marking a followed task complete or reopening it notifies every other follower, in-app and via WhatsApp for anyone with a phone number set — requires a new Meta-approved template (see the README)",
    ],
  },
  {
    version: "1.38",
    date: "2026-08-30",
    title: "WhatsApp notifications for task assignment",
    changes: [
      "Assigning someone a task now also sends a WhatsApp message — who assigned it, the task's title, and a link straight to it — to anyone assigned who's set a phone number in Settings → Team (same opt-in as the daily reminder and @mention notifications)",
      "Requires a Meta-approved message template, same as the other WhatsApp notifications (see the README for the template to submit)",
    ],
  },
  {
    version: "1.37",
    date: "2026-08-30",
    title: "An actual \"Install app\" button",
    changes: [
      "Settings now has an Install Gotka card with a one-tap install button on Android/desktop, Safari-specific instructions on iOS, and it hides itself once you're already running the installed app",
      "Fixed a display glitch where the sidebar's bottom-left user menu could get clipped on short/landscape screens like a tablet in landscape orientation",
    ],
  },
  {
    version: "1.36",
    date: "2026-08-29",
    title: "Install Gotka as an app",
    changes: [
      "Gotka is now installable — \"Add to Home Screen\" on iOS, or the browser's own \"Install app\" prompt on Android/desktop — for a full-screen, no-browser-chrome experience with its own icon",
    ],
  },
  {
    version: "1.35",
    date: "2026-08-29",
    title: "Mention-reply WhatsApp forwarding now goes both ways",
    changes: [
      "Swipe-replying to a forwarded mention reply now forwards it right back, so the two of you can keep going back and forth on WhatsApp instead of the thread stopping after one round trip",
    ],
  },
  {
    version: "1.34",
    date: "2026-08-29",
    title: "New \"Overdue & today\" tasks tab",
    changes: [
      "Added a combined Overdue + Due today tab to the Tasks page, and the WhatsApp task reminder's link now lands there instead of the broader Open tab, filtered to that assignee — matching exactly what the message itself reports",
    ],
  },
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
      "Desktop notifications — enable them from the notification bell to get a browser alert for new notifications while Gotka is open in another tab",
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
      "Refreshed the Gotka brand mark across the favicon and app icon",
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
      "Added the Gotka favicon and app icon",
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
