import "server-only";
import { DAYS_OF_WEEK, isValidTimeString, type DayOfWeek, type OperatingHours } from "@/lib/operating-hours";

// Google's Places API (New) — https://developers.google.com/maps/documentation/places/web-service/op-overview
// Only ever called from partner-gated server actions (see
// searchBusinessOnGoogleMaps / autoCreateListingDetails in
// src/app/actions/directory.ts): the key stays on the server, and each call
// is one explicit click by a signed-in partner, never a per-keystroke
// autocomplete — Text Search and Place Details are both billed per request.
const PLACES_ENDPOINT = "https://places.googleapis.com/v1";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_SEARCH_RESULTS = 8;
const MAX_REVIEWS = 5;
const MAX_REVIEW_CHARS = 300;

// Place IDs are opaque but always URL-safe (letters, digits, "-", "_") —
// checked before one is spliced into a request path.
const PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{5,400}$/;

// Google's own catch-all types, present on nearly every place — noise for
// the AI compared to the specific ones ("print_shop", "web_designer").
const GENERIC_PLACE_TYPES = new Set(["point_of_interest", "establishment"]);

export function isGooglePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

export function isValidPlaceId(value: string): boolean {
  return PLACE_ID_PATTERN.test(value);
}

export type PlaceSearchResult = {
  id: string;
  name: string;
  address: string;
  website: string | null;
};

export type PlaceDetails = {
  id: string;
  name: string;
  address: string | null;
  website: string | null;
  phone: string | null;
  googleMapsUrl: string | null;
  primaryType: string | null;
  types: string[];
  summary: string | null;
  rating: number | null;
  ratingCount: number | null;
  hoursDescriptions: string[];
  operatingHours: OperatingHours | null;
  reviews: string[];
};

type LocalizedText = { text?: string; languageCode?: string };
type RawPeriodPoint = { day?: number; hour?: number; minute?: number };
export type RawOpeningPeriod = { open?: RawPeriodPoint; close?: RawPeriodPoint };

type RawPlace = {
  id?: string;
  displayName?: LocalizedText;
  formattedAddress?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  primaryTypeDisplayName?: LocalizedText;
  types?: string[];
  editorialSummary?: LocalizedText;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { periods?: RawOpeningPeriod[]; weekdayDescriptions?: string[] };
  reviews?: { text?: LocalizedText }[];
};

async function placesRequest<T>(
  path: string,
  init: { method: "GET" | "POST"; fieldMask: string; body?: unknown },
): Promise<T> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  const response = await fetch(`${PLACES_ENDPOINT}${path}`, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": init.fieldMask,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Google Maps request failed (HTTP ${response.status}).`;
    try {
      const data = (await response.json()) as { error?: { message?: string } };
      if (data.error?.message) message = `Google Maps: ${data.error.message}`;
    } catch {
      // Non-JSON error body — the status-only message above is all there is.
    }
    // A key restricted by HTTP referrer ("Websites" in Google Cloud
    // Console) only ever works for requests made directly by a browser
    // (e.g. the Maps JavaScript API) — this call runs server-side (a
    // Next.js Server Action) and so carries no Referer header at all,
    // which Google reports back as a blocked "referer <empty>". Left as
    // Google's own wording alone, that reads like a bug in this app rather
    // than a key-configuration mismatch, so it's spelled out here instead.
    if (/referer/i.test(message)) {
      message +=
        " This key is restricted by website (HTTP referrer) in Google Cloud Console, but these requests run on the server, which sends no referrer — change the key's Application restriction to IP addresses (or None) instead.";
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const data = await placesRequest<{ places?: RawPlace[] }>("/places:searchText", {
    method: "POST",
    fieldMask: "places.id,places.displayName,places.formattedAddress,places.websiteUri",
    body: { textQuery: query, pageSize: MAX_SEARCH_RESULTS, languageCode: "en" },
  });
  return (data.places ?? [])
    .filter((place): place is RawPlace & { id: string } => typeof place.id === "string" && isValidPlaceId(place.id))
    .map((place) => ({
      id: place.id,
      name: place.displayName?.text?.trim() || "Unnamed place",
      address: place.formattedAddress?.trim() ?? "",
      website: place.websiteUri?.trim() || null,
    }));
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  if (!isValidPlaceId(placeId)) throw new Error("Invalid Google Maps place.");
  const raw = await placesRequest<RawPlace>(`/places/${placeId}?languageCode=en`, {
    method: "GET",
    fieldMask: [
      "id",
      "displayName",
      "formattedAddress",
      "websiteUri",
      "internationalPhoneNumber",
      "googleMapsUri",
      "primaryTypeDisplayName",
      "types",
      "editorialSummary",
      "rating",
      "userRatingCount",
      "regularOpeningHours",
      "reviews",
    ].join(","),
  });

  const reviews = (raw.reviews ?? [])
    .map((review) => review.text?.text?.replace(/\s+/g, " ").trim() ?? "")
    .filter(Boolean)
    .slice(0, MAX_REVIEWS)
    .map((text) => (text.length > MAX_REVIEW_CHARS ? `${text.slice(0, MAX_REVIEW_CHARS)}…` : text));

  return {
    id: raw.id ?? placeId,
    name: raw.displayName?.text?.trim() || "Unnamed place",
    address: raw.formattedAddress?.trim() || null,
    website: raw.websiteUri?.trim() || null,
    phone: raw.internationalPhoneNumber?.trim() || null,
    googleMapsUrl: raw.googleMapsUri?.trim() || null,
    primaryType: raw.primaryTypeDisplayName?.text?.trim() || null,
    types: (raw.types ?? []).filter((type) => !GENERIC_PLACE_TYPES.has(type)),
    summary: raw.editorialSummary?.text?.trim() || null,
    rating: typeof raw.rating === "number" ? raw.rating : null,
    ratingCount: typeof raw.userRatingCount === "number" ? raw.userRatingCount : null,
    hoursDescriptions: raw.regularOpeningHours?.weekdayDescriptions ?? [],
    operatingHours: operatingHoursFromGooglePeriods(raw.regularOpeningHours?.periods ?? []),
    reviews,
  };
}

// Google numbers days Sunday-first (0 = Sunday); DAYS_OF_WEEK is Monday-first.
const GOOGLE_DAY_ORDER: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const LAST_MINUTE_OF_DAY = "23:59";

function formatTime(point: RawPeriodPoint): string | null {
  const hour = point.hour ?? 0;
  const minute = point.minute ?? 0;
  const formatted = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return isValidTimeString(formatted) ? formatted : null;
}

// Google's per-day periods → this app's one-open/close-range-per-day model
// (see OperatingHours). Lossy where the two disagree, deliberately in the
// direction of "open a bit longer" rather than dropping a day: a day with
// split hours (a lunch break) becomes one range from its first opening to
// its last closing, and a range that runs past midnight is cut off at
// 23:59 since a same-day range can't say "02:00 the next morning". A place
// Google marks as always open comes back as a single open point with no
// close at all — that's every day 00:00–23:59 here.
export function operatingHoursFromGooglePeriods(periods: RawOpeningPeriod[]): OperatingHours | null {
  const result = {} as OperatingHours;
  for (const day of DAYS_OF_WEEK) result[day] = null;

  if (periods.some((period) => period.open && !period.close)) {
    for (const day of DAYS_OF_WEEK) result[day] = { open: "00:00", close: LAST_MINUTE_OF_DAY };
    return result;
  }

  let hasOpenDay = false;
  for (const period of periods) {
    const openDay = period.open?.day;
    if (!period.open || !period.close || openDay === undefined || !GOOGLE_DAY_ORDER[openDay]) continue;
    const day = GOOGLE_DAY_ORDER[openDay];
    const open = formatTime(period.open);
    const close = period.close.day === openDay ? formatTime(period.close) : LAST_MINUTE_OF_DAY;
    if (!open || !close || close <= open) continue;

    const existing = result[day];
    result[day] = existing
      ? { open: open < existing.open ? open : existing.open, close: close > existing.close ? close : existing.close }
      : { open, close };
    hasOpenDay = true;
  }
  return hasOpenDay ? result : null;
}
