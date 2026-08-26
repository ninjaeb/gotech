"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { findOrCreateContactByEmail } from "@/lib/contact-matching";
import { generateAvailableSlots } from "@/lib/booking";
import { getBookingSettings } from "@/lib/settings";
import { normalizePhone } from "@/lib/phone";

const bookingSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  startAt: z.string().trim().min(1, "Pick a time slot"),
});

export type BookingFormState = { status: "error"; message: string } | { status: "success" } | undefined;

// Public, unauthenticated — submitted from the public booking page. Never
// trusts the submitted slot outright: re-derives today's real availability
// server-side and confirms the requested instant is still in it, then
// leans on the Booking.startAt unique constraint as a last-resort guard
// against two people racing for the same slot.
export async function submitBooking(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  if (String(formData.get("website") || "").trim()) {
    return { status: "success" };
  }

  const parsed = bookingSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
    startAt: formData.get("startAt"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }
  const data = parsed.data;
  const requestedStart = new Date(data.startAt);
  if (Number.isNaN(requestedStart.getTime())) {
    return { status: "error", message: "Pick a time slot" };
  }

  const [settings, existingBookings] = await Promise.all([
    getBookingSettings(),
    db.booking.findMany({ where: { startAt: { gte: new Date() } }, select: { startAt: true } }),
  ]);
  const available = generateAvailableSlots({
    weeklyHours: settings.weeklyHours,
    slotMinutes: settings.slotMinutes,
    utcOffsetMinutes: settings.utcOffsetMinutes,
    bookedStarts: existingBookings.map((b) => b.startAt),
  });
  const slot = available.find((s) => s.startAt.getTime() === requestedStart.getTime());
  if (!slot) {
    return { status: "error", message: "That slot isn't available anymore — pick another." };
  }

  const phone = data.phone ? normalizePhone(data.phone) : null;
  const contact = await findOrCreateContactByEmail({
    name: data.name,
    email: data.email,
    phone,
  });

  try {
    await db.booking.create({
      data: {
        startAt: slot.startAt,
        endAt: slot.endAt,
        name: data.name,
        email: data.email,
        phone,
        notes: data.notes || null,
        contactId: contact.id,
      },
    });
  } catch (error) {
    // P2002 = unique constraint violation on startAt — someone else took
    // this exact slot between our check above and this insert.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "That slot was just taken — pick another." };
    }
    throw error;
  }

  await db.task.create({
    data: {
      title: `Discovery call with ${data.name}`,
      description: data.notes || null,
      type: "MEETING",
      dueDate: slot.startAt,
      contactId: contact.id,
    },
  });
  await db.activity.create({
    data: {
      type: "MEETING",
      content: `${data.name} (${data.email}) booked a call via the booking page.`,
      contactId: contact.id,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/contacts");
  revalidatePath("/");
  revalidatePath("/book");

  return { status: "success" };
}
