"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Two modes in one component so the read-only display (staff viewing a
// submitted testimonial) stays visually identical to the input the client
// used to submit it, rather than drifting into two separately-tuned looks.
export function StarRatingInput({
  name,
  defaultValue = 0,
  readOnly = false,
  size = "h-6 w-6",
}: {
  name?: string;
  defaultValue?: number;
  readOnly?: boolean;
  size?: string;
}) {
  const [rating, setRating] = useState(defaultValue);
  const [hovered, setHovered] = useState(0);
  const shown = readOnly ? defaultValue : hovered || rating;

  return (
    <div className="flex items-center gap-0.5" aria-label={readOnly ? `${defaultValue} out of 5 stars` : undefined}>
      {!readOnly && name && <input type="hidden" name={name} value={rating || ""} />}
      {[1, 2, 3, 4, 5].map((n) =>
        readOnly ? (
          <Star
            key={n}
            className={cn(
              size,
              "shrink-0",
              n <= shown ? "fill-amber-400 text-amber-400" : "fill-transparent text-slate-300 dark:text-neutral-700",
            )}
          />
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="rounded p-0.5"
          >
            <Star
              className={cn(
                size,
                "shrink-0 transition-colors",
                n <= shown ? "fill-amber-400 text-amber-400" : "fill-transparent text-slate-300 dark:text-neutral-700",
              )}
            />
          </button>
        ),
      )}
    </div>
  );
}
