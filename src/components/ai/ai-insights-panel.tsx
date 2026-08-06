"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Mail, Sparkles } from "lucide-react";
import {
  draftFollowUp,
  generateInsights,
  type FollowUpDraft,
  type Insights,
} from "@/app/actions/ai-insights";
import type { EntityRef } from "@/lib/ai/context";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export function AiInsightsPanel({ entity }: { entity: EntityRef }) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [draft, setDraft] = useState<FollowUpDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingInsights, startInsightsTransition] = useTransition();
  const [pendingDraft, startDraftTransition] = useTransition();

  function handleInsights() {
    setInsightsError(null);
    startInsightsTransition(async () => {
      const result = await generateInsights(entity);
      if (result.status === "error") {
        setInsightsError(result.message);
        return;
      }
      setInsights(result.data);
    });
  }

  function handleDraft() {
    setDraftError(null);
    startDraftTransition(async () => {
      const result = await draftFollowUp(entity);
      if (result.status === "error") {
        setDraftError(result.message);
        return;
      }
      setDraft(result.data);
    });
  }

  async function copyDraft() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft.draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Assistant</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="space-y-2">
          {!insights && (
            <Button size="sm" variant="secondary" onClick={handleInsights} disabled={pendingInsights}>
              <Sparkles className="h-4 w-4" />
              {pendingInsights ? "Thinking…" : "Generate insights"}
            </Button>
          )}
          {insightsError && (
            <>
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {insightsError}
              </p>
              <Button size="sm" variant="secondary" onClick={handleInsights} disabled={pendingInsights}>
                {pendingInsights ? "Thinking…" : "Try again"}
              </Button>
            </>
          )}
          {insights && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Summary
                </p>
                <p className="mt-1 text-slate-700 dark:text-slate-300">{insights.summary}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Suggested next action
                </p>
                <p className="mt-1 text-slate-700 dark:text-slate-300">{insights.nextAction}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-neutral-800">
          {!draft && (
            <Button size="sm" variant="secondary" onClick={handleDraft} disabled={pendingDraft}>
              <Mail className="h-4 w-4" />
              {pendingDraft ? "Drafting…" : "Draft follow-up"}
            </Button>
          )}
          {draftError && (
            <>
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {draftError}
              </p>
              <Button size="sm" variant="secondary" onClick={handleDraft} disabled={pendingDraft}>
                {pendingDraft ? "Drafting…" : "Try again"}
              </Button>
            </>
          )}
          {draft && (
            <div className="space-y-2 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Subject
              </p>
              <p className="text-slate-700 dark:text-slate-300">{draft.subject}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Draft
              </p>
              <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                {draft.draft}
              </p>
              <Button size="sm" variant="secondary" onClick={copyDraft}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
