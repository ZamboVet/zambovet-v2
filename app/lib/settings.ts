export type SiteSettings = {
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  companyName: "ZamboVet",
  primaryColor: "#0032A0",
  secondaryColor: "#b3c7e6",
  accentColor: "#fffbde",
  heroTitle: "Professional Pet Care Made Simple",
  heroSubtitle:
    "Book veterinary appointments online, manage your pet's health records, and connect with experienced veterinarians who care about your furry family members.",
  heroButtonText: "Book Appointment",
};

const STORAGE_KEY = "site_settings";

export function loadSettings(): SiteSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SiteSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: SiteSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function resetSettings() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
