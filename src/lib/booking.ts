// A confirmed slot is a fixed-duration block generated purely from weekly
// business hours (see the Booking model). No IANA timezone/DST handling —
// the org's availability is stored as a fixed UTC offset (see schema.prisma)
// and every calculation here does its "local time" math via UTC getters
// shifted by that offset, never the host process's own timezone.

export type DaySchedule = { enabled: boolean; start: string; end: string };
export type WeeklyHours = DaySchedule[]; // length 7, index 0 = Sunday..6 = Saturday

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = [
  { enabled: false, start: "09:00", end: "17:00" }, // Sun
  { enabled: true, start: "09:00", end: "17:00" }, // Mon
  { enabled: true, start: "09:00", end: "17:00" }, // Tue
  { enabled: true, start: "09:00", end: "17:00" }, // Wed
  { enabled: true, start: "09:00", end: "17:00" }, // Thu
  { enabled: true, start: "09:00", end: "17:00" }, // Fri
  { enabled: false, start: "09:00", end: "17:00" }, // Sat
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function parseWeeklyHours(json: string): WeeklyHours {
  try {
    const parsed: unknown = JSON.parse(json);
    if (
      Array.isArray(parsed) &&
      parsed.length === 7 &&
      parsed.every(
        (d): d is DaySchedule =>
          typeof d === "object" &&
          d !== null &&
          typeof (d as DaySchedule).enabled === "boolean" &&
          typeof (d as DaySchedule).start === "string" &&
          typeof (d as DaySchedule).end === "string",
      )
    ) {
      return parsed;
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_WEEKLY_HOURS;
}

export function formatUtcOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

function parseHm(hm: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

const MIN_LEAD_MINUTES = 60;

export type AvailableSlot = { startAt: Date; endAt: Date };

// Generates every open, unbooked, sufficiently-in-the-future slot over the
// next `daysAhead` calendar days (as reckoned in the org's fixed offset).
export function generateAvailableSlots({
  weeklyHours,
  slotMinutes,
  utcOffsetMinutes,
  bookedStarts,
  daysAhead = 14,
  now = new Date(),
}: {
  weeklyHours: WeeklyHours;
  slotMinutes: number;
  utcOffsetMinutes: number;
  bookedStarts: Date[];
  daysAhead?: number;
  now?: Date;
}): AvailableSlot[] {
  const bookedTimes = new Set(bookedStarts.map((d) => d.getTime()));
  const earliestStart = now.getTime() + MIN_LEAD_MINUTES * 60_000;
  const offsetMs = utcOffsetMinutes * 60_000;

  // Shift "now" into the org's local wall-clock time so its UTC getters read
  // as if they were local getters — the standard fixed-offset trick.
  const localNow = new Date(now.getTime() + offsetMs);
  const localYear = localNow.getUTCFullYear();
  const localMonth = localNow.getUTCMonth();
  const localDate = localNow.getUTCDate();
  const localWeekday = localNow.getUTCDay();

  const slots: AvailableSlot[] = [];

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const weekday = (localWeekday + dayOffset) % 7;
    const day = weeklyHours[weekday];
    if (!day?.enabled) continue;

    const start = parseHm(day.start);
    const end = parseHm(day.end);
    if (!start || !end) continue;

    const dayStartLocalMs = Date.UTC(localYear, localMonth, localDate + dayOffset, start.hour, start.minute);
    const dayEndLocalMs = Date.UTC(localYear, localMonth, localDate + dayOffset, end.hour, end.minute);

    for (
      let slotLocalMs = dayStartLocalMs;
      slotLocalMs + slotMinutes * 60_000 <= dayEndLocalMs;
      slotLocalMs += slotMinutes * 60_000
    ) {
      const startAtMs = slotLocalMs - offsetMs; // local-labeled -> real UTC instant
      if (startAtMs < earliestStart) continue;
      if (bookedTimes.has(startAtMs)) continue;
      slots.push({ startAt: new Date(startAtMs), endAt: new Date(startAtMs + slotMinutes * 60_000) });
    }
  }

  return slots;
}

// A stable, timezone-independent label for a <select> option — always
// describes the slot in the org's own fixed offset, regardless of the
// visitor's browser locale/timezone, since that's the only zone the org's
// weekly-hours configuration is meaningful in.
export function formatSlotLabel(startAt: Date, utcOffsetMinutes: number) {
  const local = new Date(startAt.getTime() + utcOffsetMinutes * 60_000);
  const weekday = WEEKDAY_LABELS[local.getUTCDay()];
  const month = local.getUTCMonth() + 1;
  const date = local.getUTCDate();
  let hour = local.getUTCHours();
  const minute = String(local.getUTCMinutes()).padStart(2, "0");
  const meridiem = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${weekday}, ${month}/${date} · ${hour}:${minute} ${meridiem}`;
}
