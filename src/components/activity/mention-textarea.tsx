"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/field";

type UserOption = { id: string; name: string };

// Matches an in-progress "@partial name" right at the cursor — used both to
// decide whether to show suggestions and, on pick, to know what to replace.
const MENTION_IN_PROGRESS = /(?:^|\s)@([^\s@]*)$/;

export function MentionTextarea({
  name,
  users,
  placeholder,
  rows = 2,
}: {
  name: string;
  users: UserOption[];
  placeholder?: string;
  rows?: number;
}) {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Native form.reset() (used by ActivityForm after submit) won't touch our
  // React state on its own — sync it back explicitly, same fix as DatePicker.
  useEffect(() => {
    const form = textareaRef.current?.form;
    if (!form) return;
    const handleReset = () => {
      setValue("");
      setQuery(null);
    };
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  useEffect(() => {
    if (query === null) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setQuery(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [query]);

  const suggestions =
    query === null
      ? []
      : users.filter((user) => user.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    setValue(next);
    const cursor = event.target.selectionStart ?? next.length;
    const match = MENTION_IN_PROGRESS.exec(next.slice(0, cursor));
    setQuery(match ? match[1] : null);
  }

  function insertMention(user: UserOption) {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const before = value.slice(0, cursor).replace(MENTION_IN_PROGRESS, (matched) =>
      matched.startsWith(" ") || matched.startsWith("\n") ? `${matched[0]}@${user.name} ` : `@${user.name} `,
    );
    const after = value.slice(cursor);
    const next = before + after;
    setValue(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <Textarea
        ref={textareaRef}
        name={name}
        rows={rows}
        required
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={(event) => {
          if (event.key === "Escape") setQuery(null);
        }}
      />
      {query !== null && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {suggestions.map((user) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                insertMention(user);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-neutral-800"
            >
              {user.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
