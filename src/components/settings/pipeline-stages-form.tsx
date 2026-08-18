"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { updatePipelineStages } from "@/app/actions/pipelines";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type StageDraft = { key: string; id: string | null; name: string; isWon: boolean; isLost: boolean };

let draftKeySeq = 0;
function newDraftKey() {
  draftKeySeq += 1;
  return `draft-${draftKeySeq}`;
}

export function PipelineStagesForm({
  pipelineId,
  stages,
}: {
  pipelineId: string;
  stages: { id: string; name: string; isWon: boolean; isLost: boolean }[];
}) {
  const action = updatePipelineStages.bind(null, pipelineId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [rows, setRows] = useState<StageDraft[]>(() =>
    stages.map((stage) => ({ key: newDraftKey(), ...stage })),
  );

  function updateRow(key: string, patch: Partial<StageDraft>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));
  }

  function moveRow(index: number, direction: -1 | 1) {
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const stagesJson = JSON.stringify(
    rows.map((row) => ({ id: row.id, name: row.name, isWon: row.isWon, isLost: row.isLost })),
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="stagesJson" value={stagesJson} />

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className="grid grid-cols-1 items-center gap-2 rounded-md border border-slate-200 p-2.5 sm:grid-cols-[1fr_auto_auto_auto_auto] dark:border-neutral-800"
          >
            <Input
              value={row.name}
              onChange={(event) => updateRow(row.key, { name: event.target.value })}
              placeholder="Stage name"
              aria-label="Stage name"
            />
            <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={row.isWon}
                onChange={(event) => updateRow(row.key, { isWon: event.target.checked, isLost: false })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-neutral-700"
              />
              Won
            </label>
            <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={row.isLost}
                onChange={(event) => updateRow(row.key, { isLost: event.target.checked, isWon: false })}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 dark:border-neutral-700"
              />
              Lost
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveRow(index, -1)}
                disabled={index === 0}
                aria-label="Move stage up"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveRow(index, 1)}
                disabled={index === rows.length - 1}
                aria-label="Move stage down"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              disabled={rows.length === 1}
              aria-label="Remove stage"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-950"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setRows((current) => [...current, { key: newDraftKey(), id: null, name: "", isWon: false, isLost: false }])}
        className={cn(buttonClasses("secondary", "sm"))}
      >
        <Plus className="h-4 w-4" />
        Add stage
      </button>

      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save stages"}
        </Button>
      </div>
    </form>
  );
}
