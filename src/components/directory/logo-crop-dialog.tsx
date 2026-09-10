"use client";

import { useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { X } from "lucide-react";
import { cropImage } from "@/lib/crop-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";

// Shown right after a partner picks a logo file (see handleLogoChange in
// partner-listing-form.tsx) — crop/zoom/rotate before it ever becomes the
// listing's logo, rather than uploading whatever rectangle the original
// photo happened to be. Cancelling leaves the previous logo untouched;
// Apply hands the finished square PNG back as a data: URL, the same shape
// AI Auto Create's own fetched logo already rides to Save in.
export function LogoCropDialog({
  imageUrl,
  onCancel,
  onApply,
}: {
  imageUrl: string;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  async function handleApply() {
    if (!croppedAreaPixels) return;
    setApplying(true);
    setError(null);
    try {
      const dataUrl = await cropImage(imageUrl, croppedAreaPixels, rotation);
      onApply(dataUrl);
    } catch {
      setError("Couldn't crop that image — try a different file.");
      setApplying(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crop logo"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-2xl dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Crop logo</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-neutral-800 dark:hover:text-slate-300"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative h-72 w-full overflow-hidden rounded-md bg-slate-900 sm:h-80">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="logo-crop-zoom" className="mb-1 text-xs">
              Zoom
            </Label>
            <input
              id="logo-crop-zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-led"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label htmlFor="logo-crop-rotation" className="mb-0 text-xs">
                Rotate
              </Label>
              {rotation !== 0 && (
                <button
                  type="button"
                  onClick={() => setRotation(0)}
                  className="text-xs text-petrol hover:underline dark:text-petrol-light"
                >
                  Reset
                </button>
              )}
            </div>
            <input
              id="logo-crop-rotation"
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(event) => setRotation(Number(event.target.value))}
              className="w-full accent-led"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={applying}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={applying || !croppedAreaPixels}
            className="bg-led text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led"
          >
            {applying ? "Applying…" : "Apply"}
          </Button>
        </div>
      </div>
    </div>
  );
}
