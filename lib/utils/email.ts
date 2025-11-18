export type EmailParts = {
  local: string;
  domain: string;
};

export function normalizeEmailForUniqueness(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const at = lower.indexOf("@");
  if (at < 0) return lower;
  let local = lower.slice(0, at);
  let domain = lower.slice(at + 1);
  if (!domain) return lower;
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") {
    const plusIdx = local.indexOf("+");
    if (plusIdx !== -1) local = local.slice(0, plusIdx);
    local = local.replace(/\./g, "");
  }
  return `${local}@${domain}`;
}

export function extractEmailParts(email: string): EmailParts | null {
  const normalized = normalizeEmailForUniqueness(email);
  const at = normalized.indexOf("@");
  if (at < 0) return null;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  if (!local || !domain) return null;
  return { local, domain };
}

export function isGmailDomain(domain: string | null | undefined): boolean {
  if (!domain) return false;
  const lower = domain.toLowerCase();
  return lower === "gmail.com" || lower === "googlemail.com";
}
