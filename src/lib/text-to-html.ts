function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Composed messages are plain text (typed into a <textarea>) — this gives
// them the same paragraph/line-break structure in HTML as they have in the
// plain-text part, without pulling in a markdown/rich-text dependency for
// what's ultimately just a handful of typed lines.
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}
