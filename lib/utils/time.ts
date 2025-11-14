export function buildUtc(dateStr: string, timeStr: string) {
  const [y, m, d] = (dateStr || "").split("-").map(Number);
  const [hh, mm] = (timeStr || "").split(":").map(Number);
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0));
}

export function isAtLeastMinutesFromNow(d: Date, minutes: number) {
  const now = Date.now();
  return d.getTime() >= now + minutes * 60 * 1000;
}
