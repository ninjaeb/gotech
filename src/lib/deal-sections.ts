// Personal display preference, not CRM data — stored in localStorage like
// the theme toggle (src/components/ui/theme-toggle.tsx), not the database.
export const DEAL_SECTION_KEYS = ["tasks", "quotes", "resources", "activity"] as const;
export type DealSectionKey = (typeof DEAL_SECTION_KEYS)[number];

const STORAGE_KEY = "dealSectionOrder";
const DEFAULT_ORDER: DealSectionKey[] = [...DEAL_SECTION_KEYS];

function isDealSectionKey(value: unknown): value is DealSectionKey {
  return typeof value === "string" && (DEAL_SECTION_KEYS as readonly string[]).includes(value);
}

function readFromStorage(): DealSectionKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORDER;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ORDER;
    const valid = parsed.filter(isDealSectionKey);
    // Any key missing from a saved order (e.g. added after the user last
    // saved one) is appended at the end rather than dropped.
    const missing = DEAL_SECTION_KEYS.filter((key) => !valid.includes(key));
    return [...new Set([...valid, ...missing])];
  } catch {
    return DEFAULT_ORDER;
  }
}

// A minimal external store over localStorage, read via useSyncExternalStore
// in ReorderableDealSections — the value differs between server (no
// localStorage) and client, and this is React's sanctioned way to hydrate
// that in without a manual useEffect+setState (which trips
// react-hooks/set-state-in-effect and risks a hydration mismatch besides).
let cachedOrder: DealSectionKey[] | null = null;
const listeners = new Set<() => void>();

export function subscribeDealSectionOrder(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDealSectionOrderSnapshot(): DealSectionKey[] {
  if (cachedOrder === null) cachedOrder = readFromStorage();
  return cachedOrder;
}

export function getDefaultDealSectionOrder(): DealSectionKey[] {
  return DEFAULT_ORDER;
}

export function saveDealSectionOrder(order: DealSectionKey[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  cachedOrder = order;
  listeners.forEach((listener) => listener());
}
