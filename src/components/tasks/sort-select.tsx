"use client";

import { Select } from "@/components/ui/field";
import { SORTS, type SortKey } from "@/lib/task-filters";

export function SortSelect({ defaultValue }: { defaultValue: SortKey }) {
  return (
    <Select
      name="sort"
      defaultValue={defaultValue}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="w-auto"
      aria-label="Sort by"
    >
      {SORTS.map((sort) => (
        <option key={sort.key} value={sort.key}>
          Sort: {sort.label}
        </option>
      ))}
    </Select>
  );
}
