import { ShareButton } from "@/components/directory/share-button";

// The "Recommend the Business" pill pinned to the foot of a listing page
// for a signed-in business owner: one floating button that opens the same
// share menu as the header's Recommend button, with the same referral-
// tracking link. It's the always-in-reach version of that button — a
// partner reading down a long listing shouldn't have to scroll back up to
// pass it on. Rendered only when there's a partner to credit (see the
// listing page), so anonymous visitors never see it.
//
// On phones the page already has its own fixed bottom jump bar (Services /
// Get in touch — see the listing page), so the pill floats just above that
// rather than covering it; from sm up that jump bar is gone and the pill
// gets a proper strip of its own along the bottom edge.
export function RecommendBar({
  title,
  url,
  message,
  label,
}: {
  title: string;
  url: string;
  message: string;
  label: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 sm:bottom-0 sm:border-t sm:border-slate-200 sm:bg-white/95 sm:py-3 sm:backdrop-blur dark:sm:border-neutral-800 dark:sm:bg-neutral-900/95">
      <div className="pointer-events-auto">
        <ShareButton
          title={title}
          url={url}
          message={message}
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
