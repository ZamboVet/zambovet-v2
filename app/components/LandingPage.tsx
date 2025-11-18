"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "../../lib/supabaseClient";
import {
  HeartIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";

const DEFAULT_SETTINGS = {
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

type Service = { id: number; name: string; description: string | null };
type ReviewItem = { id: number; rating: number; title: string | null; comment: string | null };
type ClinicContact = { phone: string | null; email: string | null; address: string | null };

export default function StaticLandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalType, setLegalType] = useState<"privacy"|"terms"|"cookies">("privacy");
  const [services, setServices] = useState<Service[]>([]);
  const [testimonials, setTestimonials] = useState<ReviewItem[]>([]);
  const [contact, setContact] = useState<ClinicContact>({ phone: null, email: null, address: null });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('landing_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'landing_page_settings', filter: 'id=eq.1' }, (payload: any) => {
        const newSettings = payload.new?.settings || payload.record?.settings;
        if (newSettings) {
          const merged = { ...DEFAULT_SETTINGS, ...newSettings };
          setSettings(merged);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load dynamic landing content
  useEffect(() => {
    (async () => {
      try {
        // Settings JSON
        const { data: s } = await supabase
          .from('landing_page_settings')
          .select('settings')
          .eq('id', 1)
          .maybeSingle();
        if ((s as any)?.settings) {
          const merged = { ...DEFAULT_SETTINGS, ...(s as any).settings };
          setSettings(merged);
        }
      } catch {}
      try {
        // Active services
        const { data } = await supabase
          .from('services')
          .select('id,name,description,is_active')
          .eq('is_active', true)
          .limit(8);
        setServices(((data||[]) as any[]).map(r=>({ id: r.id, name: r.name, description: r.description || null })));
      } catch {}
      try {
        // Approved reviews
        const { data } = await supabase
          .from('reviews')
          .select('id,rating,title,comment,is_approved')
          .eq('is_approved', true)
          .order('id', { ascending: false })
          .limit(6);
        setTestimonials(((data||[]) as any[]).map(r=>({ id: r.id, rating: r.rating, title: r.title || null, comment: r.comment || null })));
      } catch {}
      try {
        // Primary clinic contact
        const { data } = await supabase
          .from('clinics')
          .select('phone,email,address,is_active')
          .eq('is_active', true)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) setContact({ phone: (data as any).phone || null, email: (data as any).email || null, address: (data as any).address || null });
      } catch {}
    })();
  }, []);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? "backdrop-blur-md shadow-lg" : "bg-transparent"
        } ios-safe-area-nav`}
        style={{
          backgroundColor: isScrolled ? `${settings.primaryColor}F2` : "transparent",
          WebkitBackdropFilter: isScrolled ? "blur(8px)" : undefined,
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <div className="flex items-center space-x-2">
              <div
                className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center overflow-hidden bg-white"
                style={{
                  boxShadow: isScrolled ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <Image src="/vetlogo.png" alt="ZamboVet" width={40} height={40} className="w-6 h-6 md:w-8 md:h-8 object-contain" />
              </div>
              <span
                className={`text-xl md:text-2xl font-bold ${isScrolled ? "text-white" : ""}`}
                style={{ color: isScrolled ? "white" : settings.primaryColor }}
              >
                {settings.companyName}
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              {[
                { label: "Home", id: "home" },
                { label: "Services", id: "services" },
                { label: "About", id: "about" },
                { label: "Contact", id: "contact" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="font-medium transition-colors"
                  style={{ color: isScrolled ? "white" : settings.primaryColor }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = isScrolled
                      ? settings.secondaryColor
                      : settings.primaryColor + "DD";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = isScrolled
                      ? "white"
                      : settings.primaryColor;
                  }}
                >
                  {item.label}
                </button>
              ))}

              <a
                href="/login"
                className="px-6 py-2 rounded-full font-medium transform hover:scale-105 transition-all duration-200"
                style={{
                  backgroundColor: isScrolled ? "white" : settings.primaryColor,
                  color: isScrolled ? settings.primaryColor : "white",
                }}
              >
                Sign In
              </a>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0032A0] focus:ring-offset-2 hover:bg-[#b3c7e6]/20 transition-colors"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? (
                <XMarkIcon className="w-7 h-7 text-[#0032A0]" />
              ) : (
                <Bars3Icon className="w-7 h-7 text-[#0032A0]" />
              )}
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden bg-[#0032A0] border-t border-[#b3c7e6] py-4 space-y-4 rounded-b-xl shadow-xl animate-fade-in">
              {[
                { label: "Home", id: "home" },
                { label: "Services", id: "services" },
                { label: "About", id: "about" },
                { label: "Contact", id: "contact" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left px-4 py-3 text-white hover:text-[#b3c7e6] transition-colors font-medium text-lg"
                >
                  {item.label}
                </button>
              ))}
              <div className="px-4">
                <a
                  href="/login"
                  className="w-full inline-flex items-center justify-center bg-white text-[#0032A0] px-6 py-3 rounded-full hover:bg-[#b3c7e6] hover:text-[#0032A0] transition-all duration-200 font-medium text-lg shadow"
                >
                  {settings.heroButtonText}
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      <style jsx global>{`
        .ios-safe-area-nav { padding-top: env(safe-area-inset-top); }
        @media (max-width: 768px) { nav { min-height: 56px; } }
        @media (max-width: 640px) { nav { min-height: 48px; } }
        @media (hover: none) and (pointer: coarse) { nav button, nav a { min-height: 48px; min-width: 44px; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px);} to { opacity: 1; transform: translateY(0);} }
        .animate-float { animation: float 4s ease-in-out infinite; }
        @keyframes float { 0% { transform: translateY(0);} 50% { transform: translateY(-8px);} 100% { transform: translateY(0);} }
        /* Flip card styles */
        .flip { perspective: 1000px; position: relative; overflow: hidden; }
        .flip-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform .6s ease; }
        @media (hover: hover) and (pointer: fine) { .flip:hover .flip-inner { transform: rotateY(180deg); } }
        .flip-front, .flip-back { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 1rem; }
        .flip-back { transform: rotateY(180deg); }
      `}</style>

      {legalOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setLegalOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center">
            <div className="w-full sm:w-[680px] max-h-[85vh] sm:max-h-[80vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b">
                <div className="text-lg font-semibold" style={{ color: settings.primaryColor }}>
                  {legalType === 'privacy' ? 'Privacy Policy' : legalType === 'terms' ? 'Terms of Service' : 'Cookie Policy'}
                </div>
                <button onClick={()=>setLegalOpen(false)} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm">Close</button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto text-sm leading-6 text-gray-700 space-y-4">
                {legalType === 'privacy' && (
                  <div className="space-y-3">
                    <p>We collect only the information needed to provide veterinary services, such as account details, appointment information, and messages you send us.</p>
                    <p>Your data is processed for booking, reminders, service improvements, and security. You can request access or deletion subject to legal requirements.</p>
                    <p>We apply reasonable safeguards. For inquiries, contact {settings.contactEmail}.</p>
                  </div>
                )}
                {legalType === 'terms' && (
                  <div className="space-y-3">
                    <p>By using ZamboVet, you agree to use the platform lawfully and to provide accurate information when booking appointments.</p>
                    <p>Services are provided as‑is. Availability and outcomes are not guaranteed. To the extent permitted by law, liability is limited.</p>
                    <p>Misuse of the platform may result in account restrictions. These terms may change with notice.</p>
                  </div>
                )}
                {legalType === 'cookies' && (
                  <div className="space-y-3">
                    <p>We use essential cookies for authentication and session continuity, and optional analytics to understand usage trends.</p>
                    <p>You can control cookies in your browser settings. Disabling some cookies may affect functionality.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <section id="home" className="pt-16 md:pt-20 min-h-screen flex items-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: `linear-gradient(135deg, ${settings.secondaryColor}, white, ${settings.primaryColor})`,
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-left space-y-6 md:space-y-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                <span style={{ color: settings.primaryColor }}>{settings.heroTitle}</span>
              </h1>
              <p className="text-lg md:text-xl text-black max-w-2xl mx-auto lg:mx-0">
                {settings.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href="/login"
                  className="px-8 py-4 rounded-full transition-all duration-200 font-semibold text-lg text-white"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  {settings.heroButtonText}
                </a>
                <button
                  onClick={() => scrollToSection("services")}
                  className="border-2 px-8 py-4 rounded-full transition-all duration-200 font-semibold text-lg"
                  style={{ borderColor: settings.primaryColor, color: settings.primaryColor }}
                >
                  {settings.heroLearnMoreText}
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="animate-float">
                <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8 transform rotate-3">
                  <div className="text-center space-y-4">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                      style={{
                        background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.primaryColor}DD)`,
                      }}
                    >
                      <HeartIcon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold" style={{ color: settings.primaryColor }}>
                      24/7 Pet Care
                    </h3>
                    <p className="text-black">Professional veterinary services available</p>
                    <div className="flex justify-center space-x-2">
                      <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: settings.primaryColor }} />
                      <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: settings.primaryColor + "DD" }} />
                      <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: settings.primaryColor }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDownIcon className="w-8 h-8" style={{ color: settings.primaryColor }} />
        </div>
      </section>

      <section id="services" className="py-16 md:py-24 pb-28" style={{ backgroundColor: settings.secondaryColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ color: settings.primaryColor }}>
              {settings.servicesTitle}
            </h2>
            <p className="text-lg md:text-xl text-black max-w-3xl mx-auto">
              {settings.servicesSubtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 auto-rows-fr items-stretch">
            {(services.length ? services : [
              { id: 1, name: 'Online Booking', description: 'Schedule appointments 24/7 through our platform' },
              { id: 2, name: 'Health Monitoring', description: "Track your pet's health records" },
              { id: 3, name: 'Expert Veterinarians', description: 'Experienced professionals dedicated to your pet' },
              { id: 4, name: 'Preventive Care', description: 'Keep your pets healthy and happy' },
            ]).slice(0,4).map((service, idx) => (
              <div key={idx} className="group h-full">
                <div className="flip h-auto md:h-[320px]">
                  <div className="flip-inner h-full">
                  {/* Front */}
                  <div
                    className="flip-front bg-white p-6 md:p-8 shadow-sm border transition-all duration-300 group-hover:shadow-xl"
                    style={{ borderColor: settings.secondaryColor }}
                  >
                    <div
              className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
              style={{ background: [
                `linear-gradient(135deg, ${settings.primaryColor}, ${settings.primaryColor}DD)`,
                `linear-gradient(135deg, white, ${settings.primaryColor})`,
                `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
                `linear-gradient(135deg, white, ${settings.secondaryColor})`
              ][idx % 4] }}
            >
              {(() => { const Icon = [CalendarDaysIcon, HeartIcon, UserGroupIcon, ShieldCheckIcon][idx % 4] as any; return <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />; })()}
            </div>
                    <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: settings.primaryColor }}>
                      {service.name}
                    </h3>
                    <p className="text-black/80 leading-relaxed line-clamp-3">{service.description || ''}</p>
                  </div>

                  {/* Back */}
                  <div
                    className="flip-back bg-white p-6 md:p-8 shadow-sm border flex flex-col justify-between"
                    style={{ borderColor: settings.secondaryColor }}
                  >
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold mb-3" style={{ color: settings.primaryColor }}>
                        {service.name}
                      </h3>
                      <ul className="space-y-2 text-black/80">
                        <li className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: settings.primaryColor }} />
                          Reliable and convenient
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: settings.primaryColor }} />
                          Professional care
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: settings.primaryColor }} />
                          Real-time updates
                        </li>
                      </ul>
                    </div>
                    <a
                      href="/login"
                      className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 font-semibold text-white"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      Learn more
                    </a>
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="about"
        className="py-16 md:py-24 mt-10"
        style={{ background: `linear-gradient(135deg, ${settings.secondaryColor}, white, ${settings.primaryColor})` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6 md:space-y-8">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold" style={{ color: settings.primaryColor }}>
                {settings.aboutTitle}
              </h2>
              <p className="text-lg md:text-xl text-black leading-relaxed">{settings.aboutSubtitle}</p>
              <div className="space-y-4">
                {[
                  "Licensed and experienced veterinarians",
                  "State-of-the-art medical equipment",
                  "Convenient online appointment booking",
                  "Comprehensive health record management",
                  "Professional veterinary care",
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-[#0032A0] to-[#0053d6] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-[#0053d6] font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-6 shadow-lg transform rotate-2">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-[#0032A0]">500+</div>
                      <div className="text-black">Happy Pets</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-lg transform -rotate-2">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-[#0032A0]">24/7</div>
                      <div className="text-black">Support</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="bg-white rounded-2xl p-6 shadow-lg transform rotate-1">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-[#0032A0]">15+</div>
                      <div className="text-black">Expert Vets</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-lg transform -rotate-1">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-[#0032A0]">98%</div>
                      <div className="text-black">Satisfaction</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#b3c7e6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0032A0] mb-4">
              What Pet Parents Say
            </h2>
            <p className="text-lg md:text-xl text-black max-w-3xl mx-auto">
              Real stories from our satisfied customers and their beloved pets
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {(testimonials.length ? testimonials : [
              { id:1, rating:5, title:'Great Service', comment:'Wonderful experience booking and visiting the clinic.' },
              { id:2, rating:5, title:'Caring Vets', comment:'Very professional and caring staff.' },
              { id:3, rating:5, title:'Highly Recommended', comment:'Easy to book and great care for our pet.' },
            ]).map((t, index) => (
              <div
                key={index}
                className="bg-[#fffbde] rounded-2xl p-6 md:p-8 border border-[#91c8e4] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center mb-4">
                  {Array.from({ length: t.rating || 0 }).map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-black mb-2 font-semibold" style={{ color: settings.primaryColor }}>{t.title || 'Review'}</p>
                <p className="text-black mb-6 leading-relaxed italic">&quot;{t.comment || ''}&quot;</p>
                <div className="border-t border-[#91c8e4] pt-4">
                  <div className="font-semibold text-[#0032A0]">Verified Owner</div>
                  <div className="text-sm text-black">Reviewed via appointment</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-r from-[#0032A0] via-[#b3c7e6] to-[#0032A0] relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0032A0]/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center space-y-6 md:space-y-8">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              Ready to Give Your Pet
              <span className="block">The Best Care?</span>
            </h2>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
              Join thousands of pet parents who trust ZamboVet for their furry family members. Book your first appointment today and experience the difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/login"
                className="bg-[#fffbde] text-[#0032A0] px-8 py-4 rounded-full hover:bg-[#b3c7e6] hover:text-white transition-all duration-200 font-semibold text-lg"
              >
                Book Your First Appointment
              </a>
              <button
                onClick={() => scrollToSection("contact")}
                className="border-2 border-[#fffbde] text-[#fffbde] px-8 py-4 rounded-full hover:bg-[#fffbde] hover:text-[#0032A0] transition-all duration-200 font-semibold text-lg"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
        <div className="absolute top-10 left-10 w-20 h-20 bg-[#fffbde]/10 rounded-full animate-float" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-[#b3c7e6]/5 rounded-full animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-[#fffbde]/10 rounded-full animate-float" style={{ animationDelay: "2s" }} />
      </section>

      <section id="contact" className="py-16 md:py-24" style={{ backgroundColor: settings.accentColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ color: settings.primaryColor }}>
              {settings.contactTitle}
            </h2>
            <p className="text-lg md:text-xl text-black max-w-3xl mx-auto">{settings.contactSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:gap-16">
            <div className="space-y-8">
              <div className="space-y-6">
                {[
                  {
                    icon: EnvelopeIcon,
                    title: "Email",
                    info: contact.email || settings.contactEmail,
                    subInfo: "We'll respond within 24 hours",
                  },
                ].map((c, i) => (
                  <div key={i} className="flex items-start space-x-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.primaryColor}DD)` }}
                    >
                      <c.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1" style={{ color: settings.primaryColor }}>
                        {c.title}
                      </h3>
                      <p className="font-medium" style={{ color: settings.primaryColor + "DD" }}>
                        {c.info}
                      </p>
                      <p className="text-black text-sm">{c.subInfo}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            
          </div>
        </div>
      </section>

      <footer className="text-white py-12 md:py-16" style={{ backgroundColor: settings.primaryColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-white">
                  <Image src="/vetlogo.png" alt="ZamboVet" width={40} height={40} className="w-8 h-8 object-contain" />
                </div>
                <span className="text-2xl font-bold text-white">{settings.companyName}</span>
              </div>
              <p className="text-white mb-6 max-w-md">
                Professional veterinary care made simple. We&apos;re dedicated to keeping your pets healthy and happy with modern technology and compassionate service.
              </p>
              <div className="flex space-x-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <button
                    key={i}
                    className="w-10 h-10 bg-[#0053d6] hover:bg-[#0032A0] rounded-lg flex items-center justify-center transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {[
                  { label: "Home", id: "home" },
                  { label: "Services", id: "services" },
                  { label: "About Us", id: "about" },
                  { label: "Contact", id: "contact" },
                ].map((l) => (
                  <li key={l.id}>
                    <button
                      onClick={() => scrollToSection(l.id)}
                      className="text-[#b3c7e6] hover:text-white transition-colors duration-200"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
                <li>
                  <a href="/login" className="text-[#b3c7e6] hover:text-white transition-colors duration-200">
                    Book Appointment
                  </a>
                </li>
              </ul>
            </div>

          </div>

          <div className="border-t border-[#91c8e4] mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-sm" style={{ color: settings.secondaryColor }}>
                © 2025 {settings.companyName}. All rights reserved.
              </div>
              <div className="flex space-x-6 text-sm">
                <button onClick={()=>{ setLegalType('privacy'); setLegalOpen(true); }} className="text-[#91c8e4] hover:text-[#fffbde] transition-colors duration-200">Privacy Policy</button>
                <button onClick={()=>{ setLegalType('terms'); setLegalOpen(true); }} className="text-[#91c8e4] hover:text-[#fffbde] transition-colors duration-200">Terms of Service</button>
                <button onClick={()=>{ setLegalType('cookies'); setLegalOpen(true); }} className="text-[#91c8e4] hover:text-[#fffbde] transition-colors duration-200">Cookie Policy</button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
