import { splitFullName } from "@/lib/format";

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

export type VCardContact = {
  firstName: string;
  lastName: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  company: { name: string; phone: string | null; address: string | null } | null;
};

// vCard 3.0, not 4.0 — broader compatibility with the phone Contacts apps
// this is actually meant to land in (older iOS/Android parsers, in
// particular, are shakier on 4.0). CRLF line endings per RFC 6350, same
// convention parseVCards above already expects when reading one back.
export function buildVCard(contact: VCardContact): string {
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCardValue(contact.lastName ?? "")};${escapeVCardValue(contact.firstName)};;;`,
    `FN:${escapeVCardValue(fullName)}`,
  ];
  if (contact.company) lines.push(`ORG:${escapeVCardValue(contact.company.name)}`);
  if (contact.title) lines.push(`TITLE:${escapeVCardValue(contact.title)}`);
  if (contact.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(contact.email)}`);
  if (contact.phone) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(contact.phone)}`);
  // The company's own switchboard number, distinct from the contact's own
  // mobile — only added when it's actually a different number.
  if (contact.company?.phone && contact.company.phone !== contact.phone) {
    lines.push(`TEL;TYPE=WORK:${escapeVCardValue(contact.company.phone)}`);
  }
  if (contact.company?.address) {
    // ADR;TYPE=WORK:pobox;ext;street;city;region;postal;country — Company.address
    // is one free-text field, not structured parts, so it all goes in the
    // "street" slot rather than guessing where city/state/zip start.
    lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(contact.company.address)};;;;`);
  }
  if (contact.notes) lines.push(`NOTE:${escapeVCardValue(contact.notes)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n") + "\r\n";
}

export type ParsedVCard = {
  firstName: string;
  lastName: string;
  title: string;
  companyName: string;
  email: string;
  phone: string;
};

// RFC 6350 §3.2: a line that starts with a space or tab is a continuation
// of the previous line (with that one leading whitespace char stripped) —
// long values get "folded" across lines this way before any field parsing.
function unfoldLines(text: string): string[] {
  const rawLines = text.split(/\r\n|\r|\n/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeValue(value: string): string {
  return value.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

// "item1.TEL;TYPE=CELL:+1 555..." -> { key: "TEL", value: "+1 555..." } —
// the group prefix (before a ".") and any ;PARAM=... are both irrelevant to
// the handful of fields this reads.
function parseLine(line: string): { key: string; value: string } | null {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return null;
  const rawKey = line.slice(0, colonIndex);
  const key = rawKey.split(";")[0].split(".").pop() || rawKey;
  return { key: key.toUpperCase(), value: unescapeValue(line.slice(colonIndex + 1)) };
}

// Reads the handful of fields a Contact form actually has: name, title,
// company, one email, one phone. Ignores everything else (addresses,
// photos, custom X- fields) rather than trying to be a complete vCard
// parser — this only feeds a quick-start prefill the user reviews anyway.
export function parseVCards(text: string): ParsedVCard[] {
  const cards: ParsedVCard[] = [];
  let current: {
    firstName: string;
    lastName: string;
    fullName: string;
    title: string;
    companyName: string;
    email: string;
    phone: string;
  } | null = null;

  for (const rawLine of unfoldLines(text)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^BEGIN:VCARD$/i.test(line)) {
      current = { firstName: "", lastName: "", fullName: "", title: "", companyName: "", email: "", phone: "" };
      continue;
    }
    if (/^END:VCARD$/i.test(line)) {
      if (current) {
        if (!current.firstName && !current.lastName && current.fullName) {
          const split = splitFullName(current.fullName);
          current.firstName = split.firstName;
          current.lastName = split.lastName;
        }
        cards.push({
          firstName: current.firstName,
          lastName: current.lastName,
          title: current.title,
          companyName: current.companyName,
          email: current.email,
          phone: current.phone,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const parsed = parseLine(line);
    if (!parsed) continue;

    switch (parsed.key) {
      case "N": {
        // N:Family;Given;Additional;Prefix;Suffix
        const [family, given] = parsed.value.split(";");
        if (given?.trim()) current.firstName = given.trim();
        if (family?.trim()) current.lastName = family.trim();
        break;
      }
      case "FN":
        current.fullName = parsed.value.trim();
        break;
      case "ORG":
        current.companyName = parsed.value.split(";")[0].trim();
        break;
      case "TITLE":
        current.title = parsed.value.trim();
        break;
      case "EMAIL":
        if (!current.email) current.email = parsed.value.trim();
        break;
      case "TEL":
        if (!current.phone) current.phone = parsed.value.trim();
        break;
    }
  }

  return cards;
}
