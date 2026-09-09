"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClasses, controlHeight } from "@/components/ui/field";
import type { ComboboxOption } from "@/components/ui/combobox";

const MAX_VISIBLE_OPTIONS = 200;

function normalize(text: string) {
  return text.toLowerCase();
}

// A searchable, type-to-filter multi-select — same interaction model as
// Combobox (search-as-you-type, keyboard nav, click-outside to close, a
// hidden-input escape hatch so it still submits through a plain form), but
// picking an option adds it to a list of removable chips instead of
// replacing a single value. Submits one hidden `name` input per selected
// id, so a plain `formData.getAll(name)` on the server sees the same shape
// a group of same-named checkboxes would have. Uncontrolled by default
// (`defaultValue`, the common case); pass `value`/`onValueChange` when a
// caller needs to react to the selection itself.
export function MultiCombobox({
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
  size = "md",
}: {
  id?: string;
  name: string;
  options: ComboboxOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  // "lg" for a more prominent field — bigger chips, taller input, bigger
  // text — where this is a standalone, visually important picker (e.g. the
  // business directory's own category field) rather than one field among
  // many in a dense form (task assignees/followers, which stay "md").
  size?: "md" | "lg";
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue ?? []);
  const selected = isControlled ? value : internalValue;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formAnchorRef = useRef<HTMLInputElement>(null);

  const optionsById = useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);
  const selectedOptions = useMemo(
    () => selected.map((optionId) => optionsById.get(optionId)).filter((option): option is ComboboxOption => !!option),
    [selected, optionsById],
  );

  const filteredOptions = useMemo(() => {
    const q = normalize(query.trim());
    const unselected = options.filter((option) => !selected.includes(option.value));
    if (!q) return unselected.slice(0, MAX_VISIBLE_OPTIONS);
    return unselected
      .filter((option) => normalize(option.label).includes(q) || (option.sublabel && normalize(option.sublabel).includes(q)))
      .slice(0, MAX_VISIBLE_OPTIONS);
  }, [options, selected, query]);

  function setSelected(next: string[]) {
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  }

  // Native form.reset() won't touch our React state on its own — sync it
  // back explicitly, same reasoning as Combobox/DatePicker.
  useEffect(() => {
    if (isControlled) return;
    const form = formAnchorRef.current?.form;
    if (!form) return;
    const handleReset = () => setInternalValue(defaultValue ?? []);
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

  function addOption(optionId: string) {
    if (!selected.includes(optionId)) setSelected([...selected, optionId]);
    setQuery("");
    setHighlightedIndex(0);
    inputRef.current?.focus();
  }

  function removeOption(optionId: string) {
    setSelected(selected.filter((id) => id !== optionId));
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
        addOption(filteredOptions[highlightedIndex].value);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setQuery("");
      }
    } else if (event.key === "Backspace" && query === "" && selectedOptions.length > 0) {
      // Same "backspace pops the last chip" affordance as most tag inputs —
      // only kicks in once the search box is already empty, so it never
      // eats a keystroke mid-search.
      removeOption(selectedOptions[selectedOptions.length - 1].value);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* No `name` — this exists only to reach `.form` for the reset
          listener below, and an unnamed input is never included in
          FormData. */}
      <input ref={formAnchorRef} type="hidden" readOnly />
      {selected.map((optionId) => (
        <input key={optionId} type="hidden" name={name} value={optionId} readOnly />
      ))}

      {selectedOptions.length > 0 && (
        <div className={cn("mb-2 flex flex-wrap", size === "lg" ? "gap-2" : "gap-1.5")}>
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className={cn(
                "inline-flex items-center rounded-full bg-indigo-50 font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/30",
                size === "lg" ? "gap-1.5 py-1.5 pl-3.5 pr-2 text-sm" : "gap-1 py-0.5 pl-2.5 pr-1 text-xs",
              )}
            >
              {option.label}
              <button
                type="button"
                onClick={() => removeOption(option.value)}
                disabled={disabled}
                aria-label={`Remove ${option.label}`}
                className={cn(
                  "rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20",
                  size === "lg" ? "p-1" : "p-0.5",
                )}
              >
                <X className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} />
              </button>
            </span>
          ))}
        </div>
      )}

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
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setHighlightedIndex(0);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            fieldClasses,
            controlHeight,
            size === "lg" ? "h-12 pr-10 text-base" : "pr-8",
          )}
        />
        <ChevronsUpDown
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400",
            size === "lg" ? "right-3 h-5 w-5" : "right-2.5 h-4 w-4",
          )}
        />
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
            <li key={option.value} role="option" aria-selected={false}>
              <button
                type="button"
                // onMouseDown, not onClick — fires before the input's onBlur
                // would otherwise close the dropdown first and drop the click.
                onMouseDown={(event) => {
                  event.preventDefault();
                  addOption(option.value);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "flex w-full flex-col text-left text-slate-700 dark:text-slate-300",
                  size === "lg" ? "px-3.5 py-2.5 text-base" : "px-3 py-2 text-sm",
                  index === highlightedIndex ? "bg-indigo-50 dark:bg-neutral-800" : "",
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
