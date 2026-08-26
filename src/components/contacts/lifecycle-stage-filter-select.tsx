"use client";

import { Select } from "@/components/ui/field";
import { LIFECYCLE_STAGES, LIFECYCLE_STAGE_LABELS } from "@/lib/labels";

// "unset" is a synthetic option (not a real enum value) for filtering down
// to contacts nobody has classified yet — a large, meaningful slice given
// most existing contacts predate this field.
export function LifecycleStageFilterSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <Select
      name="stage"
      defaultValue={defaultValue ?? ""}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="w-auto"
    >
      <option value="">All stages</option>
      <option value="unset">Unclassified</option>
      {LIFECYCLE_STAGES.map((stage) => (
        <option key={stage} value={stage}>
          {LIFECYCLE_STAGE_LABELS[stage]}
        </option>
      ))}
    </Select>
  );
}
