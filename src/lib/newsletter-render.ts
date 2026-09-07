import { marked } from "marked";

// `breaks: true` turns a single newline into <br> — friendlier for staff
// typing a newsletter in a plain <textarea> without knowing Markdown
// normally needs a blank line between paragraphs.
marked.setOptions({ breaks: true, gfm: true });

export function renderNewsletterBodyHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

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
  .glf-content img { max-width: 100%; }
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
