import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getNewsletterSender } from "@/lib/newsletter-sender";
import { getNewsletterSubscribeListId } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-url";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/field";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { NewsletterSenderForm } from "@/components/settings/newsletter-sender-form";
import { NewsletterSubscribeListForm } from "@/components/settings/newsletter-subscribe-list-form";

export default async function NewsletterSettingsPage() {
  await requireAdmin();
  const [sender, subscribeListId, staticLists, siteOrigin] = await Promise.all([
    getNewsletterSender(),
    getNewsletterSubscribeListId(),
    db.contactList.findMany({ where: { type: "STATIC" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getSiteOrigin(),
  ]);

  const subscribeUrl = `${siteOrigin}/subscribe`;
  const subscribeIframeEmbed = `<iframe src="${subscribeUrl}" style="width:100%;max-width:24rem;height:26rem;border:0" title="Subscribe"></iframe>`;
  const subscribeWidgetEmbed = `<div data-gotech-newsletter-form></div>\n<script src="${siteOrigin}/embed/newsletter-form.js" async></script>`;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Newsletter" }]}
        title="Newsletter"
        description="The shared mailbox newsletters send from, and the public subscribe form that feeds it"
      />
      <Card>
        <CardHeader>
          <CardTitle>Sending mailbox</CardTitle>
        </CardHeader>
        <CardBody>
          <NewsletterSenderForm sender={sender} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public subscribe form</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            A public form for your marketing site. Each submission finds or creates a Contact and adds
            them to the list below — compose a newsletter to that list (*Newsletters*) to actually reach
            them. Resubmitting also clears a previous unsubscribe, the same as any mailing list&apos;s
            resubscribe.
          </p>

          <NewsletterSubscribeListForm currentListId={subscribeListId} lists={staticLists} />

          {subscribeListId ? (
            <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-neutral-800">
              <div>
                <Label htmlFor="subscribe-link">Direct link</Label>
                <div className="flex items-center gap-2">
                  <Input id="subscribe-link" readOnly value={subscribeUrl} className="font-mono text-xs" />
                  <CopyLinkButton text={subscribeUrl} />
                </div>
              </div>
              <div>
                <Label htmlFor="subscribe-iframe-embed">Embed on your site (iframe)</Label>
                <div className="flex items-center gap-2">
                  <Input id="subscribe-iframe-embed" readOnly value={subscribeIframeEmbed} className="font-mono text-xs" />
                  <CopyLinkButton text={subscribeIframeEmbed} label="Copy embed code" />
                </div>
              </div>
              <div>
                <Label htmlFor="subscribe-widget-embed">Embed that adapts to your site&apos;s own style</Label>
                <p className="mb-1.5 text-xs text-slate-400">
                  Renders directly into your page (not an iframe), so it automatically picks up your
                  site&apos;s fonts, colors, and any input/button styling you already have.
                </p>
                <div className="flex items-start gap-2">
                  <Textarea
                    id="subscribe-widget-embed"
                    readOnly
                    value={subscribeWidgetEmbed}
                    rows={2}
                    className="font-mono text-xs"
                  />
                  <CopyLinkButton text={subscribeWidgetEmbed} label="Copy embed code" />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Pick a list above to turn the public form on — until then, both the direct link and any
              embedded copy of it show an error instead of accepting signups.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
