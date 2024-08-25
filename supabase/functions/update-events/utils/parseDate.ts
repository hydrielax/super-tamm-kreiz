import { LogError } from "./logError.ts";

const parisFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  timeZoneName: "short",
});

function normalizeHour(heure: string): string {
  if (!heure || heure.trim() === "") return "00:00";

  let normalized = heure.replace(" ", "").replace(/h|H/g, ":");
  if (normalized.endsWith(":")) {
    normalized += "00";
  } else if (!normalized.includes(":")) {
    normalized += ":00";
  }
  return normalized;
}

function getParisTimezoneOffset(date: Date) {
  // Yes, this is complicated. But it's the only way to get the timezone offset for France, trust me.
  const parts = parisFormatter.formatToParts(date);
  const timeZoneOffset = parts.find(
    (part) => part.type === "timeZoneName"
  )!.value;

  const offsetInHours = timeZoneOffset.includes("+")
    ? parseInt(timeZoneOffset.split("+")[1])
    : parseInt(timeZoneOffset.split("-")[1]) * -1;
  const offsetInMinutes = offsetInHours * 60;

  return offsetInMinutes;
}

export function parseDate(
  dateString: string,
  hourString: string | undefined = undefined
): Date {
  const date = hourString
    ? new Date(`${dateString.split(" ")[0]} ${normalizeHour(hourString)}Z`)
    : new Date(`${dateString}Z`);
  if (isNaN(date.getTime()))
    throw new LogError(`Invalid date: ${dateString} ${hourString}`);

  const offset = getParisTimezoneOffset(date);
  date.setMinutes(date.getMinutes() - offset);
  return date;
}
