// Pure — kept apart from numbering.ts (server-only, talks to the DB) so the
// Settings page preview and the tests can use it.
export function formatDocumentNumber(prefix: string, sequence: number, padding: number): string {
  return `${prefix}${String(sequence).padStart(padding, "0")}`;
}
