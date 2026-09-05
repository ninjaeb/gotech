"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { rewriteAdminDraft, updateTestimonialDraft } from "@/app/actions/testimonials";
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
  const [rewriting, startRewrite] = useTransition();
  const toast = useToast();
  const dirty = value !== savedValue;
  const busy = saving || rewriting;

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

  function handleRewrite() {
    const hadText = value.trim().length > 0;
    startRewrite(async () => {
      const result = await rewriteAdminDraft(testimonialId, value);
      if (result.ok) {
        // Only updates the textarea, not the DB — same as a manual edit,
        // it's still just a draft until "Save draft" is clicked.
        setValue(result.draft);
        toast.success(hadText ? "Draft rewritten." : "Draft generated.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={4}
        placeholder="No draft yet — click “Rewrite with AI” to have AI write a starting point."
        className="text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleRewrite} disabled={busy} className={buttonClasses("ghost", "sm")}>
          <Sparkles className="h-3.5 w-3.5" />
          {rewriting ? "Rewriting…" : "Rewrite with AI"}
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
