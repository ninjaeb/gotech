export type SectionZone = "main" | "sidebar";
export type SectionLayout = { main: string[]; sidebar: string[] };
export type PageType = "deal" | "company" | "contact";

// Reconciles a saved layout against the current default (source of truth
// for which section keys exist at all) — any key present in the default
// but missing from what was saved (a section added after the user last
// dragged something) gets appended in its default zone, and any key no
// longer valid (a section since removed from the app) is dropped.
export function normalizeSectionLayout(
  stored: Partial<SectionLayout> | undefined,
  defaultLayout: SectionLayout,
): SectionLayout {
  const validKeys = new Set([...defaultLayout.main, ...defaultLayout.sidebar]);
  const main = (stored?.main ?? []).filter((key) => validKeys.has(key));
  const sidebar = (stored?.sidebar ?? []).filter((key) => validKeys.has(key));
  const present = new Set([...main, ...sidebar]);

  for (const key of defaultLayout.main) {
    if (!present.has(key)) main.push(key);
  }
  for (const key of defaultLayout.sidebar) {
    if (!present.has(key)) sidebar.push(key);
  }
  return { main, sidebar };
}

export function readSectionLayout(
  sectionLayoutJson: string | null,
  pageType: PageType,
  defaultLayout: SectionLayout,
): SectionLayout {
  if (!sectionLayoutJson) return defaultLayout;
  try {
    const parsed: unknown = JSON.parse(sectionLayoutJson);
    if (typeof parsed !== "object" || parsed === null) return defaultLayout;
    const stored = (parsed as Record<string, Partial<SectionLayout>>)[pageType];
    return normalizeSectionLayout(stored, defaultLayout);
  } catch {
    return defaultLayout;
  }
}
