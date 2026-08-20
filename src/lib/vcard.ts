import { splitFullName } from "@/lib/format";

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
