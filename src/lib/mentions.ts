export type UserOption = { id: string; name: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// One alternation regex for every user's name, longest first — regex
// alternation tries alternatives left-to-right and takes the first match at
// a given position, so ordering by length here is what makes "@Jane Doe"
// resolve to Jane Doe rather than also matching a shorter "Jane" if both
// exist. Word-boundary lookarounds keep "user@example.com" from matching.
function buildMentionRegex(users: UserOption[]): RegExp | null {
  if (users.length === 0) return null;
  const names = [...users]
    .sort((a, b) => b.name.length - a.name.length)
    .map((user) => escapeRegExp(user.name));
  return new RegExp(`(^|\\s)@(${names.join("|")})(?=$|[\\s.,!?;:])`, "gi");
}

export type MentionMatch = { start: number; end: number; user: UserOption };

// Every @mention in `content` that resolves to a real user, as spans over
// the original string (used both to notify and to highlight in the feed).
export function matchMentions(content: string, users: UserOption[]): MentionMatch[] {
  const pattern = buildMentionRegex(users);
  if (!pattern) return [];
  const byNameLower = new Map(users.map((user) => [user.name.toLowerCase(), user]));

  const matches: MentionMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    const user = byNameLower.get(match[2].toLowerCase());
    if (!user) continue;
    const start = match.index + match[1].length; // position of "@"
    const end = start + 1 + match[2].length; // end of the matched name
    matches.push({ start, end, user });
  }
  return matches;
}

export function findMentionedUserIds(content: string, users: UserOption[]): string[] {
  return [...new Set(matchMentions(content, users).map((m) => m.user.id))];
}
