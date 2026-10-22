"use client";

import { useRef, useState } from "react";
import { Camera, FileUp, Image as ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/image-compression";
import { buttonClasses } from "@/components/ui/button";
import type { ContactDraft } from "@/lib/contact-draft";
import type { ScanCardResult } from "@/app/actions/scan-business-card";
import type { ImportVCardResult } from "@/app/actions/import-vcard";

// The scan/import actions are passed in rather than imported directly —
// the system CRM and the business portal each have their own pair (system
// resolves a company against the shared Company table, the partner-scoped
// ones against PartnerCompany), so this component stays reusable across
// both by staying agnostic to which one it's driving.
export function ContactQuickImport({
  onImported,
  scanAction,
  importAction,
}: {
  onImported: (draft: ContactDraft) => void;
  scanAction: (formData: FormData) => Promise<ScanCardResult>;
  importAction: (formData: FormData) => Promise<ImportVCardResult>;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const vcardInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<"camera" | "gallery" | "vcard" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Shared by both photo inputs below — they only differ in whether the
  // input forces the camera open (see `capture` on the input itself), not
  // in what happens once a file comes back.
  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>, source: "camera" | "gallery") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPending(source);
    setError(null);
    const compressed = file.type.startsWith("image/") ? await compressImage(file) : file;
    const formData = new FormData();
    formData.set("photo", compressed);
    const result = await scanAction(formData);
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
    const result = await importAction(formData);
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
        {/* Two separate inputs rather than one relying on the device's
        native chooser to offer both — `capture` here forces the camera
        open directly (a plain tap-to-scan path); the gallery input below
        has no `capture`, so it goes straight to the photo library/file
        picker instead of also showing a camera option a user who already
        tapped "Choose a photo" doesn't want. */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => handlePhoto(event, "camera")}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={pending !== null}
          className={buttonClasses("secondary", "sm")}
        >
          <Camera className="h-4 w-4" />
          {pending === "camera" ? "Reading card…" : "Take a photo"}
        </button>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => handlePhoto(event, "gallery")}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={pending !== null}
          className={buttonClasses("secondary", "sm")}
        >
          <ImageIcon className="h-4 w-4" />
          {pending === "gallery" ? "Reading card…" : "Choose a photo"}
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
