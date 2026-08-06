"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { generatePipelineInsights, type PipelineInsights } from "@/app/actions/ai-insights";
import { cn } from "@/lib/utils";

export function AiPipelineDiagnosis() {
  const [result, setResult] = useState<PipelineInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const response = await generatePipelineInsights();
      if (response.status === "error") {
        setError(response.message);
        return;
      }
      setResult(response.data);
    });
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20 disabled:opacity-60",
        )}
      >
        <Sparkles className="h-4 w-4" />
        {pending ? "Diagnosing…" : "AI Pipeline Diagnosis"}
      </button>

      {error && <p className="mt-3 max-w-xl text-sm text-rose-300">{error}</p>}

      {result && (
        <div className="mt-4 max-w-2xl space-y-2 border-t border-white/10 pt-4 text-sm">
          <p className="text-slate-100">{result.summary}</p>
          <p className="text-slate-300">
            <span className="font-medium text-white">Top priority: </span>
            {result.topPriority}
          </p>
        </div>
      )}
    </div>
  );
}
