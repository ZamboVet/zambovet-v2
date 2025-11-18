import { supabase } from './supabaseClient';

export interface SiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  heroLearnMoreText: string;
  servicesTitle: string;
  servicesSubtitle: string;
  aboutTitle: string;
  aboutSubtitle: string;
  contactTitle: string;
  contactSubtitle: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  heroTitle: "Professional Pet Care Made Simple",
  heroSubtitle:
    "Book veterinary appointments online, manage your pet's health records, and connect with experienced veterinarians who care about your furry family members.",
  heroButtonText: "Book Appointment",
  heroLearnMoreText: "Learn More",
  servicesTitle: "Our Services",
  servicesSubtitle:
    "Comprehensive veterinary care tailored to your pet's unique needs",
  aboutTitle: "Why Choose ZamboVet?",
  aboutSubtitle:
    "We combine modern technology with compassionate care to provide the best possible experience for you and your pets. Our platform makes veterinary care accessible, convenient, and stress-free.",
  contactTitle: "Get In Touch",
  contactSubtitle: "Have questions? We're here to help. Reach out to us anytime.",
  contactPhone: "+639123456789",
  contactEmail: "vetzambo@gmail.com",
  contactAddress: "Lorem Ipsum, Zamboanga City",
  companyName: "ZamboVet",
  primaryColor: "#0032A0",
  secondaryColor: "#b3c7e6",
  accentColor: "#fffbde",
};

// Load settings from Supabase or localStorage fallback
export async function loadSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase
      .from('landing_page_settings')
      .select('settings')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }

    if (data && (data as any).settings) {
      return { ...DEFAULT_SETTINGS, ...(data as any).settings };
    }

    return DEFAULT_SETTINGS;
  } catch (err) {
    console.error('Exception loading settings:', err);
    return DEFAULT_SETTINGS;
  }
}

// Save settings to Supabase using direct table upsert
export async function saveSettings(settings: SiteSettings): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser();
    const userId = user?.user?.id;

    if (!userId) {
      console.error('User not authenticated');
      return false;
    }

    const { error } = await supabase
      .from('landing_page_settings')
      .upsert({ id: 1, settings, updated_by: userId });

    if (error) {
      console.error('Error saving settings:', error);
      return false;
    }

    console.log('Settings saved successfully');
    return true;
  } catch (err) {
    console.error('Exception saving settings:', err);
    return false;
  }
}

// Reset settings to defaults
export async function resetSettings(): Promise<boolean> {
  return saveSettings(DEFAULT_SETTINGS);
}
