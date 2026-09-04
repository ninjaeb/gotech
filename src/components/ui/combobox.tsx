"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClasses, controlHeight } from "@/components/ui/field";

export type ComboboxOption = {
  value: string;
  label: string;
  // Extra text shown in muted gray after the label (e.g. a contact's
  // company) — also searched, so typing a company name can surface its
  // contacts even though the label itself is just the person's name.
  sublabel?: string;
};

// Cap how many filtered rows actually render — with a company list in the
// thousands (see AGENTS.md-adjacent real-world data), rendering every match
// on each keystroke is the kind of thing that looks fine in dev and then
// janks on a real dataset. Narrowing the query brings the rest back.
const MAX_VISIBLE_OPTIONS = 200;

function normalize(text: string) {
  return text.toLowerCase();
}

// A searchable, type-to-filter replacement for a plain <select> — same
// role as DatePicker (a custom control that still submits through a plain
// form via a hidden input), used wherever an option list is long enough
// that scrolling a native dropdown stops being the fastest way to find one
// (companies, contacts, deals). Supports both an uncontrolled form field
// (`defaultValue`, read via `name` in FormData like any other input — the
// common case: contact/task/global-task quick-add forms) and a controlled
// one (`value`/`onValueChange`, for forms like DealForm/TaskForm that
// derive other fields — e.g. narrowing the contact list — from this one's
// current value).
export function Combobox({
  id,
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Search…",
  emptyMessage = "No matches",
  className,
  disabled,
}: {
  id?: string;
  name: string;
  options: ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = isControlled ? value : internalValue;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === currentValue),
    [options, currentValue],
  );

  const filteredOptions = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options.slice(0, MAX_VISIBLE_OPTIONS);
    return options
      .filter((option) => normalize(option.label).includes(q) || (option.sublabel && normalize(option.sublabel).includes(q)))
      .slice(0, MAX_VISIBLE_OPTIONS);
  }, [options, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, open]);

  // Native form.reset() (quick-add forms that reset after submit) won't
  // touch our React state on its own — sync it back explicitly, same
  // reasoning as DatePicker.
  useEffect(() => {
    if (isControlled) return;
    const form = hiddenInputRef.current?.form;
    if (!form) return;
    const handleReset = () => setInternalValue(defaultValue ?? "");
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [isControlled, defaultValue]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function selectOption(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      if (open && filteredOptions[highlightedIndex]) {
        event.preventDefault();
        selectOption(filteredOptions[highlightedIndex].value);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setQuery("");
      }
    }
  }

  const displayValue = open ? query : (selectedOption?.label ?? "");

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input ref={hiddenInputRef} type="hidden" name={name} value={currentValue} readOnly />
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-listbox` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={displayValue}
          placeholder={selectedOption ? undefined : placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setOpen(false);
            setQuery("");
          }}
          className={cn(fieldClasses, controlHeight, "pr-8")}
        />
        <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {open && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {filteredOptions.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">{emptyMessage}</li>
          )}
          {filteredOptions.map((option, index) => (
            <li key={option.value || "__empty__"} role="option" aria-selected={option.value === currentValue}>
              <button
                type="button"
                // onMouseDown, not onClick — fires before the input's onBlur
                // (which would otherwise close the dropdown first and drop
                // the click).
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option.value);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "flex w-full flex-col px-3 py-2 text-left text-sm",
                  index === highlightedIndex ? "bg-indigo-50 dark:bg-neutral-800" : "",
                  option.value === currentValue
                    ? "font-medium text-indigo-600 dark:text-indigo-400"
                    : "text-slate-700 dark:text-slate-300",
                )}
              >
                <span>{option.label}</span>
                {option.sublabel && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">{option.sublabel}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
