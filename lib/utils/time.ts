/**
 * Zamboanga Timezone: PST (Philippine Standard Time) = GMT+8
 * All appointment dates/times should be in this timezone regardless of user's browser timezone
 */
const ZAMBOANGA_TZ = 'Asia/Manila'; // GMT+8
const ZAMBOANGA_OFFSET_HOURS = 8;

/**
 * Get current date in Zamboanga timezone (PST/GMT+8)
 * Returns YYYY-MM-DD format
 */
export function getZamboangaDate(): string {
  try {
    const now = new Date();
    // Convert to Zamboanga timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: ZAMBOANGA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(now); // Returns YYYY-MM-DD
  } catch {
    // Fallback: manual calculation
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const zamboangaTime = new Date(utc + (3600000 * ZAMBOANGA_OFFSET_HOURS));
    const y = zamboangaTime.getFullYear();
    const m = String(zamboangaTime.getMonth() + 1).padStart(2, '0');
    const d = String(zamboangaTime.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Get current time in Zamboanga timezone (PST/GMT+8)
 * Returns HH:MM format (24-hour)
 */
export function getZamboangaTime(): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ZAMBOANGA_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(now); // Returns HH:MM
  } catch {
    // Fallback: manual calculation
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const zamboangaTime = new Date(utc + (3600000 * ZAMBOANGA_OFFSET_HOURS));
    const h = String(zamboangaTime.getHours()).padStart(2, '0');
    const m = String(zamboangaTime.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

/**
 * Build a Date object in Zamboanga timezone from date and time strings
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in HH:MM format
 * @returns Date object representing the specified time in Zamboanga timezone
 */
export function buildZamboangaDate(dateStr: string, timeStr: string): Date {
  const [y, m, d] = (dateStr || "").split("-").map(Number);
  const [hh, mm] = (timeStr || "").split(":").map(Number);
  
  // Create date string in ISO format for Zamboanga timezone
  const isoString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+08:00`;
  return new Date(isoString);
}

/**
 * Check if a Zamboanga timezone date/time is at least X minutes from now
 * @param zamboangaDate - Date object in Zamboanga timezone
 * @param minutes - Minimum minutes from now
 */
export function isAtLeastMinutesFromNowZamboanga(zamboangaDate: Date, minutes: number): boolean {
  const now = new Date();
  return zamboangaDate.getTime() >= now.getTime() + minutes * 60 * 1000;
}

// Legacy functions - kept for backward compatibility but should migrate to Zamboanga versions
export function buildUtc(dateStr: string, timeStr: string) {
  const [y, m, d] = (dateStr || "").split("-").map(Number);
  const [hh, mm] = (timeStr || "").split(":").map(Number);
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0));
}

export function isAtLeastMinutesFromNow(d: Date, minutes: number) {
  const now = Date.now();
  return d.getTime() >= now + minutes * 60 * 1000;
}

export function buildLocal(dateStr: string, timeStr: string) {
  const [y, m, d] = (dateStr || "").split("-").map(Number);
  const [hh, mm] = (timeStr || "").split(":").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
}

export function localISODate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
