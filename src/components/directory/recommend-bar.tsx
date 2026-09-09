import { ShareButton } from "@/components/directory/share-button";

// The bar pinned to the bottom of a listing page for a signed-in business
// owner: one floating "Recommend the Business" pill that opens the same
// share menu as the header's Recommend button, with the same referral-
// tracking link. It's the always-in-reach version of that button — a
// partner reading down a long listing shouldn't have to scroll back up to
// pass it on. Rendered only when there's a partner to credit (see the
// listing page), so anonymous visitors never see it.
export function RecommendBar({ title, url, label }: { title: string; url: string; label: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
      <div className="flex justify-center">
        <ShareButton
          title={title}
          url={url}
          label={label}
          icon="recommend"
          variant="primary"
          size="md"
          menuPlacement="above"
          menuAlign="center"
          className="rounded-full bg-led px-6 text-base text-led-ink shadow-lg hover:bg-led-hover active:bg-led-active focus-visible:ring-led"
        />
      </div>
    </div>
  );
}
