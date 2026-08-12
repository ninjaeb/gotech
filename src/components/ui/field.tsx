import { cn } from "@/lib/utils";

const fieldClasses =
  "block w-full rounded-md border-0 px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:bg-neutral-900 dark:text-slate-100 dark:ring-neutral-700 dark:placeholder:text-slate-500";
// Shared fixed height for single-line controls (Input, Select, DatePicker's trigger)
// so they line up with each other in grids — Textarea is excluded since its
// height should come from `rows`, not this.
const controlHeight = "h-11";

// Native <select> chrome varies enough across browsers/OS that it can
// visually suppress our ring-based border while still showing its own
// dropdown arrow (the same underlying inconsistency behind the earlier
// height mismatch). appearance-none hands rendering entirely to our own
// CSS instead, so this draws a replacement arrow as a background image —
// rather than an absolutely-positioned icon in a wrapper element, which
// would need to track the select's own width (callers like
// DealStageSelect size it to content, not always 100%) — since a
// background image is always positioned relative to the select's own box
// no matter what width it ends up rendering at.
const selectChevronStyle: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
  backgroundPosition: "right 0.6rem center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "1rem",
};

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, controlHeight, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClasses, className)} {...props} />;
}

export function Select({
  className,
  style,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(fieldClasses, controlHeight, "appearance-none pr-8", className)}
      style={{ ...selectChevronStyle, ...style }}
      {...props}
    />
  );
}

export function RequiredMark() {
  return (
    <span className="text-rose-500" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

export function FieldGroup({
  label,
  htmlFor,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <RequiredMark />}
      </Label>
      {children}
    </div>
  );
}
