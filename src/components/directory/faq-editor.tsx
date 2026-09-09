"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input, Textarea } from "@/components/ui/field";
import { buttonClasses } from "@/components/ui/button";
import type { FaqEntry } from "@/lib/directory";

const EMPTY_FAQ: FaqEntry = { question: "", answer: "" };
const MAX_FAQS = 20;

// A repeatable list of {question, answer} rows — same controlled,
// serialize-to-hidden-JSON pattern as ServicesEditor (see that component
// for the fuller reasoning: a variable-length list doesn't map onto
// individually-named form fields the way OperatingHoursEditor's fixed
// seven days do).
export function FaqEditor({
  name,
  value,
  onChange,
}: {
  name: string;
  value: FaqEntry[];
  onChange: (faqs: FaqEntry[]) => void;
}) {
  const faqs = value.length > 0 ? value : [EMPTY_FAQ];

  function updateFaq(index: number, patch: Partial<FaqEntry>) {
    onChange(faqs.map((faq, i) => (i === index ? { ...faq, ...patch } : faq)));
  }

  function addFaq() {
    if (faqs.length >= MAX_FAQS) return;
    onChange([...faqs, EMPTY_FAQ]);
  }

  function removeFaq(index: number) {
    onChange(faqs.length > 1 ? faqs.filter((_, i) => i !== index) : [EMPTY_FAQ]);
  }

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div key={index} className="rounded-md border border-slate-200 p-3 dark:border-neutral-800">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Input
                value={faq.question}
                onChange={(event) => updateFaq(index, { question: event.target.value })}
                placeholder="Question a customer might ask"
                maxLength={150}
              />
              <Textarea
                value={faq.answer}
                onChange={(event) => updateFaq(index, { answer: event.target.value })}
                rows={2}
                placeholder="Answer"
                maxLength={500}
              />
            </div>
            <button
              type="button"
              onClick={() => removeFaq(index)}
              aria-label="Remove question"
              title="Remove question"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addFaq}
        disabled={faqs.length >= MAX_FAQS}
        className={buttonClasses("ghost", "sm")}
      >
        <Plus className="h-3.5 w-3.5" />
        Add question
      </button>
      <input type="hidden" name={name} value={JSON.stringify(faqs.filter((faq) => faq.question.trim() && faq.answer.trim()))} />
    </div>
  );
}
