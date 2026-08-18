import { db } from "@/lib/db";
import { getBookingSettings } from "@/lib/settings";
import { generateAvailableSlots, formatUtcOffset } from "@/lib/booking";
import { BookingForm } from "@/components/bookings/booking-form";
import { Card, CardBody } from "@/components/ui/card";

// Available slots depend on the current time and on existing Booking rows —
// neither is a signal Next's static/dynamic analysis can see (a plain
// Prisma call isn't a tracked "dynamic API" the way cookies()/headers()/
// searchParams are), so without this the page would get prerendered once at
// build time and serve the same stale slot list to every visitor forever.
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const settings = await getBookingSettings();
  const existingBookings = await db.booking.findMany({
    where: { startAt: { gte: new Date() } },
    select: { startAt: true },
  });
  const slots = generateAvailableSlots({
    weeklyHours: settings.weeklyHours,
    slotMinutes: settings.slotMinutes,
    utcOffsetMinutes: settings.utcOffsetMinutes,
    bookedStarts: existingBookings.map((b) => b.startAt),
  });

  return (
    <div className="min-h-full bg-slate-50 px-4 py-12 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
            G
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">GoTech</span>
        </div>

        <Card>
          <CardBody className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Book a discovery call
            </h1>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Times shown in {formatUtcOffset(settings.utcOffsetMinutes)}.
            </p>
            <BookingForm slots={slots} utcOffsetMinutes={settings.utcOffsetMinutes} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
