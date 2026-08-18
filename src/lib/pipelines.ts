import { cache } from "react";
import { db } from "@/lib/db";

// Every install always has exactly one default pipeline (seeded by the
// add_pipelines migration, enforced by deletePipeline/setDefaultPipeline
// never leaving zero or two defaults behind) — the fallback to the first
// pipeline by sortOrder only matters for a data state that shouldn't occur.
// Stages are included unconditionally: every caller either needs them (the
// dashboard's stage breakdown, a fresh Deal's starting stage) or won't
// notice the small extra include (a pipeline has a handful of stages, not
// thousands of rows).
export const getDefaultPipeline = cache(async () => {
  const defaultPipeline = await db.pipeline.findFirst({
    where: { isDefault: true },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
  if (defaultPipeline) return defaultPipeline;
  return db.pipeline.findFirstOrThrow({
    orderBy: { sortOrder: "asc" },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
});

export const getPipelinesWithStages = cache(async () => {
  return db.pipeline.findMany({
    orderBy: { sortOrder: "asc" },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
});
