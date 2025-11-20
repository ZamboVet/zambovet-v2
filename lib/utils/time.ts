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
