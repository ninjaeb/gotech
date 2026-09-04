"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { regenerateTestimonialDraft, updateTestimonialDraft } from "@/app/actions/testimonials";
import { buttonClasses } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function TestimonialDraftEditor({
  testimonialId,
  initialDraft,
}: {
  testimonialId: string;
  initialDraft: string;
}) {
  const [value, setValue] = useState(initialDraft);
  const [savedValue, setSavedValue] = useState(initialDraft);
  const [saving, startSave] = useTransition();
  const [regenerating, startRegenerate] = useTransition();
  const toast = useToast();
  const dirty = value !== savedValue;
  const busy = saving || regenerating;

  function handleSave() {
    startSave(async () => {
      const result = await updateTestimonialDraft(testimonialId, value);
      if (result.ok) {
        setSavedValue(value);
        toast.success("Draft saved.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRegenerate() {
    startRegenerate(async () => {
      const result = await regenerateTestimonialDraft(testimonialId);
      if (!result.ok) {
        toast.error(result.error);
      } else if (result.regenerated && result.draft) {
        setValue(result.draft);
        setSavedValue(result.draft);
        toast.success("Draft regenerated.");
      } else {
        toast.error("Couldn't generate a new draft — AI may not be configured.");
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={4}
        placeholder="No draft yet — click “Regenerate with AI” to have AI write a starting point."
        className="text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleRegenerate} disabled={busy} className={buttonClasses("ghost", "sm")}>
          <RefreshCw className="h-3.5 w-3.5" />
          {regenerating ? "Regenerating…" : "Regenerate with AI"}
        </button>
        {dirty && (
          <button type="button" onClick={handleSave} disabled={busy} className={buttonClasses("secondary", "sm")}>
            {saving ? "Saving…" : "Save draft"}
          </button>
        )}
      </div>
    </div>
  );
}
