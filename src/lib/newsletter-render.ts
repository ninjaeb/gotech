// A <style> block in <head> renders fine in the large majority of clients
// (Gmail, Apple Mail, Outlook web/mobile) — not the fully inlined-per-tag
// HTML a production email-marketing tool would generate, but a reasonable
// v1 given nothing in this app builds HTML email today beyond a signature
// appended to plain text (see textToHtml in src/lib/email.ts).
export function wrapNewsletterHtml(options: { bodyHtml: string; unsubscribeUrl: string }): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; padding: 0; background: #f8fafc; }
  .glf-content { color: #0f172a; font-size: 15px; line-height: 1.65; }
  .glf-content p { margin: 0 0 1em; }
  .glf-content a { color: #4f46e5; }
  .glf-content h1, .glf-content h2, .glf-content h3 { color: #0f172a; line-height: 1.3; margin: 1.4em 0 0.5em; }
  .glf-content h1 { font-size: 1.4em; }
  .glf-content h2 { font-size: 1.2em; }
  .glf-content h3 { font-size: 1.05em; }
  .glf-content ul, .glf-content ol { margin: 0 0 1em; padding-left: 1.4em; }
  .glf-content li { margin: 0.25em 0; }
  .glf-content img { max-width: 100%; height: auto; border-radius: 4px; }
  .glf-content blockquote { margin: 0 0 1em; padding-left: 1em; border-left: 3px solid #e2e8f0; color: #475569; }
</style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;">
          <tr>
            <td class="glf-content" style="padding:32px;">
              ${options.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;line-height:1.5;">
              You're receiving this because you're a contact of ours.
              <a href="${options.unsubscribeUrl}" style="color:#64748b;">Unsubscribe</a> at any time.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// The editor stores image src as a relative /api/newsletter-images/<id>
// path (see newsletter-editor.tsx) — meaningless inside an email client,
// which has no page to resolve a relative URL against. Only needed at
// actual send time; the admin's own in-app preview already sits on the
// right origin, so a relative path resolves there with no rewriting.
export function absolutizeImageUrls(html: string, origin: string): string {
  return html.replaceAll('src="/api/newsletter-images/', `src="${origin}/api/newsletter-images/`);
}

// Plain-text fallback for the email's other body part — derived from the
// editor's HTML rather than authored separately, same trade-off the
// Markdown version made before it. Only needs to handle what the editor's
// own toolbar can actually produce (paragraphs, headings, lists, links,
// bold/italic, blockquotes, images), not arbitrary HTML.
export function htmlToText(html: string): string {
  return html
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
