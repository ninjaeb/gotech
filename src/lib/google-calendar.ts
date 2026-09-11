import "server-only";

import { db } from "@/lib/db";
import { refreshGoogleAccessToken } from "@/lib/auth/google";
import { decryptSecret } from "@/lib/google-calendar-crypto";

const CALENDAR_ID = "primary";
const EVENTS_URL = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`;
// A fresh token is only asked for once the cached one is within this long
// of expiring — cheap insurance against a request landing right as it
// turns over mid-flight, not a real deadline of its own.
const EXPIRY_BUFFER_MS = 60_000;

// Google's all-day events use an *exclusive* end date — a one-day event
// spanning just `date` needs `end.date` to be the day after it, not `date`
// itself (which would render as zero-length).
function addOneDay(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

// Returns a currently-valid access token for this account, refreshing it
// first if the cached one is missing or close to expiring. Throws on
// failure (most commonly a revoked grant, i.e. the user disconnected this
// app from their own Google Account settings) — callers treat that as
// "this account needs to be reconnected", not a transient error to retry.
export async function getValidAccessToken(account: {
  id: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  encryptedRefreshToken: string;
}): Promise<string> {
  if (account.accessToken && account.accessTokenExpiresAt && account.accessTokenExpiresAt.getTime() - EXPIRY_BUFFER_MS > Date.now()) {
    return account.accessToken;
  }
  const refreshToken = decryptSecret(account.encryptedRefreshToken);
  const { access_token, expires_in } = await refreshGoogleAccessToken(refreshToken);
  await db.googleCalendarAccount.update({
    where: { id: account.id },
    data: { accessToken: access_token, accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000) },
  });
  return access_token;
}

// Creates a new all-day event (eventId omitted/null) or updates an existing
// one in place, returning the event's id either way — the caller persists
// that id (see src/lib/task-calendar-sync.ts) to know which call to make
// next time this same task/assignee pair is synced.
export async function upsertCalendarEvent(params: {
  accessToken: string;
  eventId?: string | null;
  taskId: string;
  summary: string;
  description?: string | null;
  date: string; // YYYY-MM-DD
}): Promise<string> {
  const body = {
    summary: params.summary,
    description: params.description || undefined,
    start: { date: params.date },
    end: { date: addOneDay(params.date) },
    // Not load-bearing (the TaskCalendarEvent row is what this app itself
    // reads back), but makes the event's origin legible from Google's own
    // UI/API if anyone goes looking.
    extendedProperties: { private: { gotechTaskId: params.taskId } },
  };
  const url = params.eventId ? `${EVENTS_URL}/${params.eventId}` : EVENTS_URL;
  const response = await fetch(url, {
    method: params.eventId ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // The event this row pointed to is gone on Google's side (deleted
    // directly in Calendar, say) — fall back to creating a fresh one
    // rather than failing the sync outright.
    if (params.eventId && response.status === 404) {
      return upsertCalendarEvent({ ...params, eventId: null });
    }
    throw new Error(`Google Calendar event ${params.eventId ? "update" : "create"} failed: ${response.status} ${await response.text()}`);
  }
  const json: { id: string } = await response.json();
  return json.id;
}

export async function deleteCalendarEvent(params: { accessToken: string; eventId: string }): Promise<void> {
  const response = await fetch(`${EVENTS_URL}/${params.eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  // 404/410 = already gone (deleted directly on Google's side, or a stale
  // id) — the goal ("no event there") is already met, not a failure.
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error(`Google Calendar event delete failed: ${response.status} ${await response.text()}`);
  }
}
