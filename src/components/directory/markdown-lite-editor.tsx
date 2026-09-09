"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Bold, Image as ImageIcon, Link2, List, ListOrdered } from "lucide-react";
import { uploadDirectoryListingImage } from "@/app/actions/directory-images";
import { compressImage } from "@/lib/image-compression";
import { renderMarkdownLite } from "@/lib/markdown-lite";
import { cn } from "@/lib/utils";

type Range = { start: number; end: number };

const TOOLBAR_BUTTON_CLASS =
  "inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-neutral-700 dark:hover:text-slate-200";

const TAB_BUTTON_CLASS = (active: boolean) =>
  cn(
    "rounded px-2 py-1 text-xs font-medium transition-colors",
    active
      ? "bg-white text-slate-800 shadow-sm dark:bg-neutral-700 dark:text-slate-100"
      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
  );

// A plain textarea plus a small toolbar that inserts/wraps text with
// src/lib/markdown-lite.tsx's grammar — not a WYSIWYG editor (nothing
// contentEditable, no HTML to sanitize). Selection stays native/
// uncontrolled between clicks; only the value itself is controlled, same
// division of labor as every other field in this form.
export function MarkdownLiteEditor({
  id,
  name,
  value,
  onChange,
  rows = 5,
  placeholder,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSelection = useRef<Range | null>(null);

  // Restores the cursor/selection after a toolbar click replaces `value`
  // — a controlled textarea's own selection resets on every value change,
  // so this has to happen explicitly, once the new value has committed.
  useLayoutEffect(() => {
    const pending = pendingSelection.current;
    if (!pending || !textareaRef.current) return;
    pendingSelection.current = null;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(pending.start, pending.end);
  }, [value]);

  function currentSelection(): Range {
    const el = textareaRef.current;
    if (!el) return { start: value.length, end: value.length };
    return { start: el.selectionStart ?? value.length, end: el.selectionEnd ?? value.length };
  }

  // Wraps the current selection in `before`/`after` — or, with nothing
  // selected, inserts `placeholderText` between them, pre-selected, so
  // typing immediately replaces it (the same interaction most comment-box
  // toolbars use for bold/italic).
  function wrapSelection(before: string, after: string, placeholderText: string) {
    const { start, end } = currentSelection();
    const selected = value.slice(start, end) || placeholderText;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    pendingSelection.current = { start: start + before.length, end: start + before.length + selected.length };
    onChange(next);
  }

  // Prefixes every line the current selection touches — for the list
  // buttons, where the target is whole lines rather than a text span.
  function prefixLines(prefixFor: (lineIndex: number) => string) {
    const { start, end } = currentSelection();
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const rawLineEnd = value.indexOf("\n", end);
    const lineEnd = rawLineEnd === -1 ? value.length : rawLineEnd;
    const block = value.slice(lineStart, lineEnd);
    const lines = block.length > 0 ? block.split("\n") : [""];
    const prefixed = lines.map((line, i) => `${prefixFor(i)}${line}`).join("\n");
    const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
    pendingSelection.current = { start: lineStart, end: lineStart + prefixed.length };
    onChange(next);
  }

  // Splices `text` in at the current selection (replacing it) and leaves
  // the cursor right after it — shared by the link prompt and the image
  // upload's own insertion once it has a URL to work with.
  function insertAtSelection(text: string) {
    const { start, end } = currentSelection();
    const next = value.slice(0, start) + text + value.slice(end);
    const cursor = start + text.length;
    pendingSelection.current = { start: cursor, end: cursor };
    onChange(next);
  }

  function insertLink() {
    const { start, end } = currentSelection();
    const selectedText = value.slice(start, end);
    const url = window.prompt("Link URL (https://…)");
    if (!url) return;
    insertAtSelection(`[${selectedText || "link text"}](${url.trim()})`);
  }

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    const compressed = await compressImage(file);
    const formData = new FormData();
    formData.set("image", compressed);
    const result = await uploadDirectoryListingImage(formData);
    setUploading(false);

    if (result.status !== "ok") {
      setUploadError(result.message);
      return;
    }
    const defaultAlt = file.name.replace(/\.\w+$/, "").replace(/[-_]+/g, " ").trim();
    const alt = window.prompt("Alt text (a short description of the image)", defaultAlt) ?? defaultAlt;
    insertAtSelection(`![${alt}](${result.url})`);
  }

  return (
    <div className="overflow-hidden rounded-md ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-led dark:ring-neutral-700">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-2 py-1 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-0.5">
          <button type="button" title="Bold" aria-label="Bold" onClick={() => wrapSelection("**", "**", "bold text")} className={TOOLBAR_BUTTON_CLASS}>
            <Bold className="h-4 w-4" />
          </button>
          <button type="button" title="Bullet list" aria-label="Bullet list" onClick={() => prefixLines(() => "- ")} className={TOOLBAR_BUTTON_CLASS}>
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Numbered list"
            aria-label="Numbered list"
            onClick={() => prefixLines((i) => `${i + 1}. `)}
            className={TOOLBAR_BUTTON_CLASS}
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button type="button" title="Link" aria-label="Link" onClick={insertLink} className={TOOLBAR_BUTTON_CLASS}>
            <Link2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Upload image"
            aria-label="Upload image"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className={TOOLBAR_BUTTON_CLASS}
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          {uploading && <span className="text-xs text-slate-400">Uploading…</span>}
        </div>
        <div className="flex items-center gap-0.5 rounded bg-slate-200/70 p-0.5 dark:bg-neutral-800">
          <button type="button" onClick={() => setMode("write")} className={TAB_BUTTON_CLASS(mode === "write")}>
            Write
          </button>
          <button type="button" onClick={() => setMode("preview")} className={TAB_BUTTON_CLASS(mode === "preview")}>
            Preview
          </button>
        </div>
      </div>
      {uploadError && <p className="border-b border-slate-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-600 dark:border-neutral-800 dark:bg-rose-950/40 dark:text-rose-400">{uploadError}</p>}

      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        hidden={mode === "preview"}
        className="block w-full resize-y border-0 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:bg-neutral-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      {mode === "preview" && (
        <div className="min-h-32 px-3 py-2 text-base text-slate-600 dark:text-slate-300">
          {renderMarkdownLite(value) ?? <p className="text-slate-400">Nothing to preview yet.</p>}
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelected} className="hidden" />
    </div>
  );
}
