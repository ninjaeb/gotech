"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDisplay(value: string) {
  const date = parseISODate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthGrid(year: number, month: number) {
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0..Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Date[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(new Date(year, month, i - startOffset + 1));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length < 42) {
    const next = new Date(cells[cells.length - 1]);
    next.setDate(next.getDate() + 1);
    cells.push(next);
  }
  return cells;
}

export function DatePicker({
  name,
  id,
  defaultValue,
  className,
  placeholder = "Select date",
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  className?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const initial = parseISODate(defaultValue ?? "") ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Native form.reset() (used by quick-add forms after submit) won't touch
  // our React state on its own — sync it back explicitly.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const handleReset = () => setValue("");
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedDate = parseISODate(value);
  const today = new Date();

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function selectDate(date: Date) {
    setValue(toISODate(date));
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input ref={inputRef} type="hidden" name={name} id={id} value={value} readOnly />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-md border-0 px-3 text-left text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:bg-neutral-900 dark:text-slate-100 dark:ring-neutral-700"
      >
        <span className={value ? undefined : "text-slate-400 dark:text-slate-500"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-neutral-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
                new Date(viewYear, viewMonth, 1),
              )}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-neutral-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getMonthGrid(viewYear, viewMonth).map((date) => {
              const inMonth = date.getMonth() === viewMonth;
              const selected = selectedDate ? isSameDay(date, selectedDate) : false;
              const isToday = isSameDay(date, today);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors",
                    !inMonth && "text-slate-300 dark:text-slate-600",
                    inMonth && !selected && "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-neutral-800",
                    selected && "bg-indigo-600 text-white hover:bg-indigo-500",
                    isToday && !selected && "font-semibold text-indigo-600 dark:text-indigo-400",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
              className="mt-2 w-full rounded-md py-1.5 text-center text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-neutral-800"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
