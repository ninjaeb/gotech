// Shared between the Tasks page (a Server Component, for the initial
// query and building `where`) and TasksFilterPanel (a Client Component,
// for the live tab hrefs) — kept in a plain module because a Server
// Component can't import plain data out of a "use client" file (every
// export of one becomes an opaque client reference from that side).
export const FILTERS = [
  { key: "open", label: "Open" },
  { key: "due", label: "Overdue & today" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Due today" },
  { key: "completed", label: "Completed" },
] as const;

export type FilterKey = (typeof FILTERS)[number]["key"];

// `assigneeParam` is `undefined` to omit the URL param entirely (the
// implicit "defaults to me" state) and any string, including "", to set it
// explicitly (an explicit "All assignees" is `assignee=`, not an absent
// param, so it doesn't quietly revert to the default when navigating).
export function tabHref(key: FilterKey, query: string, assigneeParam?: string) {
  const params = new URLSearchParams();
  if (key !== "open") params.set("filter", key);
  if (query) params.set("q", query);
  if (assigneeParam !== undefined) params.set("assignee", assigneeParam);
  const qs = params.toString();
  return qs ? `/tasks?${qs}` : "/tasks";
}
