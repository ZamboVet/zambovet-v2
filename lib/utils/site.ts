export function getSiteUrl(): string {
  const env = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SITE_URL) ? process.env.NEXT_PUBLIC_SITE_URL : undefined;
  if (env && typeof env === 'string' && env.trim() !== '') {
    return env.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://zambovet-v2.vercel.app';
}
