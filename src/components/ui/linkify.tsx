import { cn } from "@/lib/utils";

export function Linkify({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, i) =>
        /^https?:\/\/[^\s]+$/.test(part) ? (
          <a
            key={i}
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
      )}
    </p>
  );
}
