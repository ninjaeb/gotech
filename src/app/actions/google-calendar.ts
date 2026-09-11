"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffAction } from "@/lib/auth/dal";

export type GoogleCalendarFormState = { error: string } | { success: true } | undefined;

// Only drops the connection this app keeps — doesn't touch anything on the
// user's actual Google Calendar (events already synced there are simply
// left unmanaged from here on). Revoking this app's access itself is done
// from the user's own Google Account settings, same as any other "Sign in
// with Google"-style integration.
export async function disconnectGoogleCalendar(
  _prevState: GoogleCalendarFormState,
  formData: FormData,
): Promise<GoogleCalendarFormState> {
  void formData;
  const user = await requireStaffAction();
  await db.googleCalendarAccount.deleteMany({ where: { userId: user.id } });
  // Orphaned otherwise — every sync already no-ops for a user with no
  // connected account, but there's no reason to keep these rows around.
  await db.taskCalendarEvent.deleteMany({ where: { userId: user.id } });
  revalidatePath("/system/settings");
  return { success: true };
}
