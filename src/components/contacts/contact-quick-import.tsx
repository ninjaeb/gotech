"use client";

import { useRef, useState } from "react";
import { Camera, FileUp } from "lucide-react";
import { scanBusinessCard } from "@/app/actions/scan-business-card";
import { importVCard } from "@/app/actions/import-vcard";
import { compressImage } from "@/lib/image-compression";
import { buttonClasses } from "@/components/ui/button";
import type { ContactDraft } from "@/lib/contact-draft";

export function ContactQuickImport({ onImported }: { onImported: (draft: ContactDraft) => void }) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const vcardInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<"photo" | "vcard" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPending("photo");
    setError(null);
    const compressed = file.type.startsWith("image/") ? await compressImage(file) : file;
    const formData = new FormData();
    formData.set("photo", compressed);
    const result = await scanBusinessCard(formData);
    setPending(null);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    onImported(result.data);
  }

  async function handleVCard(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPending("vcard");
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await importVCard(formData);
    setPending(null);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    onImported(result.data);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={pending !== null}
          className={buttonClasses("secondary", "sm")}
        >
          <Camera className="h-4 w-4" />
          {pending === "photo" ? "Reading card…" : "Scan a business card"}
        </button>

        <input
          ref={vcardInputRef}
          type="file"
          accept=".vcf,text/vcard,text/x-vcard"
          onChange={handleVCard}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => vcardInputRef.current?.click()}
          disabled={pending !== null}
          className={buttonClasses("secondary", "sm")}
        >
          <FileUp className="h-4 w-4" />
          {pending === "vcard" ? "Reading file…" : "Import a vCard (.vcf)"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
