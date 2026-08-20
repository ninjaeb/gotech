import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { matchMentions, type UserOption } from "@/lib/mentions";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function renderPlainSegment(segment: string, keyPrefix: string): ReactNode[] {
  return segment.split(URL_PATTERN).map((part, i) =>
    /^https?:\/\/[^\s]+$/.test(part) ? (
      <a
        key={`${keyPrefix}-${i}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

// Like Linkify (URLs → links), plus "@Full Name" → a highlighted span for
// every name in `users` — the same matching addActivity uses to decide who
// gets notified, so what's highlighted here is exactly who got pinged.
export function ActivityContent({
  text,
  users,
  className,
}: {
  text: string;
  users: UserOption[];
  className?: string;
}) {
  const mentions = matchMentions(text, users);
  const nodes: ReactNode[] = [];
  let cursor = 0;

  mentions.forEach((mention, i) => {
    if (mention.start > cursor) {
      nodes.push(...renderPlainSegment(text.slice(cursor, mention.start), `t${i}`));
    }
    nodes.push(
      <span
        key={`m${i}`}
        className="rounded bg-indigo-50 px-1 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
      >
        {text.slice(mention.start, mention.end)}
      </span>,
    );
    cursor = mention.end;
  });
  if (cursor < text.length) {
    nodes.push(...renderPlainSegment(text.slice(cursor), "tail"));
  }

  return <p className={cn("whitespace-pre-wrap break-words", className)}>{nodes}</p>;
}
