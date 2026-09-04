"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, FileText, X } from "lucide-react";
import { MentionTextarea } from "@/components/activity/mention-textarea";
import { MAX_ATTACHMENT_BYTES } from "@/lib/attachment";

type UserOption = { id: string; name: string };

function formatMaxSize() {
  return `${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB`;
}

// MentionTextarea plus staged file attachments — paste an image straight
// from the clipboard, or pick one or more files, and both feed the same
// hidden <input type="file" multiple>, so a native form submission carries
// everything under one field name without needing its own useActionState
// wiring here. Oversized files are rejected at staging time (not just by
// the server) since that's the moment the mistake is easiest to fix.
export function AttachmentField({
  id,
  name,
  attachmentsName = "attachments",
  users,
  placeholder,
  rows = 2,
  defaultValue = "",
  required = true,
}: {
  id?: string;
  name: string;
  attachmentsName?: string;
  users: UserOption[];
  placeholder?: string;
  rows?: number;
  defaultValue?: string;
  required?: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const previewUrls = useMemo(
    () => files.map((file) => (file.type.startsWith("image/") ? URL.createObjectURL(file) : null)),
    [files],
  );
  useEffect(() => {
    return () => previewUrls.forEach((url) => url && URL.revokeObjectURL(url));
  }, [previewUrls]);

  // Native form.reset() won't touch this component's own state — same fix
  // MentionTextarea already needs for its own value.
  useEffect(() => {
    const form = fileInputRef.current?.form;
    if (!form) return;
    const handleReset = () => {
      setFiles([]);
      setError(null);
    };
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  function syncFileInput(next: File[]) {
    const dt = new DataTransfer();
    next.forEach((file) => dt.items.add(file));
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
  }

  function addFiles(candidates: File[]) {
    const oversized = candidates.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (oversized) {
      setError(`"${oversized.name}" is larger than ${formatMaxSize()}.`);
      return;
    }
    setError(null);
    const next = [...files, ...candidates];
    setFiles(next);
    syncFileInput(next);
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    syncFileInput(next);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const images = Array.from(event.clipboardData?.items ?? [])
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (images.length > 0) addFiles(images);
  }

  return (
    <div ref={containerRef} onPaste={handlePaste}>
      <MentionTextarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        users={users}
        defaultValue={defaultValue}
      />
      <input
        ref={fileInputRef}
        type="file"
        name={attachmentsName}
        multiple
        className="hidden"
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          if (picked.length > 0) addFiles(picked);
        }}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-neutral-800 dark:hover:text-slate-300"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach file
        </button>
        {files.map((file, index) => {
          const previewUrl = previewUrls[index];
          return (
            <span
              key={`${file.name}-${index}`}
              className="flex items-center gap-1.5 rounded-md bg-slate-100 py-1 pl-1.5 pr-1 text-xs text-slate-700 dark:bg-neutral-800 dark:text-slate-300"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview of a not-yet-uploaded file
                <img src={previewUrl} alt="" className="h-4 w-4 rounded object-cover" />
              ) : (
                <FileText className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="max-w-[10rem] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-neutral-700 dark:hover:text-slate-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
