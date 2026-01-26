"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabaseClient";
import { BuildingOffice2Icon, MapPinIcon, PhoneIcon, ArrowLeftIcon, ArrowTopRightOnSquareIcon, UserIcon, StarIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";

type Clinic = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  services?: string[] | null;
  specializations?: string[] | null;
  established_year?: number | null;
  website_url?: string | null;
};

type Vet = { id: number; full_name: string };

type Review = {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  service_rating: number | null;
  created_at: string;
  pet_owner_id: number;
};

export default function ClinicDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const clinicId = Number(id);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [vets, setVets] = useState<Vet[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: c } = await supabase
          .from("clinics")
          .select("id,name,address,phone,email,latitude,longitude,description,profile_image_url,cover_image_url,services,specializations,established_year,website_url")
          .eq("id", clinicId)
          .maybeSingle();
        setClinic((c as any) || null);
      } catch (e: any) {
        await Swal.fire({ icon: 'error', title: 'Failed to load clinic', text: e?.message || 'Please try again.' });
        setClinic(null);
      } finally {
        setLoading(false);
      }
      try {
        const today = new Date().toISOString().slice(0,10);
        const { data: appts } = await supabase
          .from("appointments")
          .select("veterinarian_id")
          .eq("clinic_id", clinicId)
          .gte("appointment_date", today);
        const vetIds = Array.from(new Set(((appts || []) as any[]).map(a => a.veterinarian_id).filter(Boolean)));
        if (vetIds.length) {
          const { data: vRows } = await supabase
            .from("veterinarians")
            .select("id,full_name")
            .in("id", vetIds);
          setVets((vRows || []) as any);
        } else {
          setVets([]);
        }
      } finally {
        setLoadingRoster(false);
      }
      // Fetch reviews
      try {
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('id,rating,title,comment,service_rating,created_at,pet_owner_id')
          .eq('clinic_id', clinicId)
          .eq('is_approved', true)
          .order('created_at', { ascending: false });
        if (reviewsError) throw reviewsError;
        setReviews((reviewsData || []) as Review[]);
      } catch (e: any) {
        console.error('Failed to load reviews:', e);
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };
    load();
  }, [clinicId]);

  const MapBlock = () => {
    if (!clinic?.latitude || !clinic?.longitude) return null;
    const lat = Number(clinic.latitude);
    const lon = Number(clinic.longitude);
    const d = 0.005;
    const bbox = `${(lon - d).toFixed(6)},${(lat - d).toFixed(6)},${(lon + d).toFixed(6)},${(lat + d).toFixed(6)}`;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
    const link = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat.toFixed(6))}&mlon=${encodeURIComponent(lon.toFixed(6))}#map=17/${encodeURIComponent(lat.toFixed(6))}/${encodeURIComponent(lon.toFixed(6))}`;
    return (
      <div className="rounded-2xl overflow-hidden ring-1 ring-neutral-200">
        <iframe title="Clinic location" className="w-full h-80" src={src} />
        <div className="px-3 py-2 bg-white flex items-center justify-between text-sm text-neutral-600">
          <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4" /> {clinic?.address || 'Coordinates'}</div>
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">Open in OSM <ArrowTopRightOnSquareIcon className="w-4 h-4" /></a>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/pet_owner/clinics" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 text-sm">
            <ArrowLeftIcon className="w-4 h-4" /> Back
          </Link>
        </div>
      </div>

      {/* Cover Image */}
      {!loading && clinic?.cover_image_url && (
        <div className="rounded-3xl overflow-hidden shadow-lg ring-1 ring-black/5">
          <img
            src={clinic.cover_image_url}
            alt={`${clinic.name} cover`}
            className="w-full h-64 object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      )}

      <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow ring-1 ring-black/5 p-5">
        {loading ? (
          <div className="h-24 rounded-xl bg-neutral-100 animate-pulse" />
        ) : clinic ? (
          <div className="space-y-5">
            {/* Main Info Grid */}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  {clinic.profile_image_url ? (
                    <img
                      src={clinic.profile_image_url}
                      alt={`${clinic.name} logo`}
                      className="h-16 w-16 rounded-xl object-cover ring-2 ring-emerald-600"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'grid';
                      }}
                    />
                  ) : null}
                  <div className="h-16 w-16 rounded-xl bg-emerald-600 text-white grid place-items-center" style={{ display: clinic.profile_image_url ? 'none' : 'grid' }}>
                    <BuildingOffice2Icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xl font-semibold text-neutral-900">{clinic.name}</div>
                    {clinic.established_year && (
                      <div className="text-xs text-neutral-500 mb-1">Established {clinic.established_year}</div>
                    )}
                    <div className="mt-1 flex items-start gap-2 text-sm text-neutral-600">
                      <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{clinic.address || 'No address'}</span>
                    </div>
                    {clinic.phone && (
                      <div className="mt-1 flex items-start gap-2 text-sm text-neutral-600">
                        <PhoneIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{clinic.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <MapBlock />
              </div>
            <div className="space-y-4">
              {/* Veterinarian Roster */}
              <div className="rounded-2xl bg-white ring-1 ring-neutral-200 p-4">
                <div className="text-sm font-semibold text-neutral-800 mb-2">Veterinarian roster</div>
                {loadingRoster ? (
                  <div className="text-sm text-neutral-500">Loading roster…</div>
                ) : vets.length === 0 ? (
                  <div className="text-sm text-neutral-500">No upcoming veterinarians found.</div>
                ) : (
                  <ul className="space-y-2">
                    {vets.map(v => (
                      <li key={v.id} className="rounded-xl bg-neutral-50 p-3 flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-neutral-600" />
                        <div className="font-medium text-neutral-800">{v.full_name}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Reviews Section */}
              <div className="rounded-2xl bg-white ring-1 ring-neutral-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-neutral-800">Reviews & Ratings</div>
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 ring-1 ring-amber-200">
                      <StarIcon className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold text-amber-700">
                        {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                      </span>
                      <span className="text-xs text-amber-600">({reviews.length})</span>
                    </div>
                  )}
                </div>
                
                {loadingReviews ? (
                  <div className="text-sm text-neutral-500">Loading reviews…</div>
                ) : reviews.length === 0 ? (
                  <div className="rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100 p-6 text-center">
                    <StarIcon className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <div className="text-sm font-medium text-neutral-600 mb-1">No reviews yet</div>
                    <div className="text-xs text-neutral-500">Be the first to review this clinic</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => (
                      <div key={review.id} className="rounded-xl bg-gradient-to-br from-white to-neutral-50 p-4 ring-1 ring-neutral-200 hover:ring-neutral-300 transition-all">
                        {/* Rating Stars */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <StarIcon
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-neutral-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-neutral-500">
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        
                        {/* Review Title */}
                        {review.title && (
                          <h4 className="text-sm font-semibold text-neutral-900 mb-1.5">
                            {review.title}
                          </h4>
                        )}
                        
                        {/* Review Comment */}
                        {review.comment && (
                          <p className="text-sm text-neutral-700 leading-relaxed mb-2">
                            {review.comment}
                          </p>
                        )}
                        
                        {/* Service Rating Badge */}
                        {review.service_rating && (
                          <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-200">
                            <span className="text-xs text-neutral-600">Service Quality:</span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <StarIcon
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < review.service_rating!
                                      ? 'fill-emerald-400 text-emerald-400'
                                      : 'text-neutral-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Show More/Less Button */}
                    {reviews.length > 3 && (
                      <button
                        onClick={() => setShowAllReviews(!showAllReviews)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-neutral-50 to-neutral-100 hover:from-neutral-100 hover:to-neutral-200 ring-1 ring-neutral-200 hover:ring-neutral-300 text-sm font-medium text-neutral-700 transition-all active:scale-98"
                      >
                        {showAllReviews ? (
                          <span>Show Less</span>
                        ) : (
                          <span>Show All {reviews.length} Reviews</span>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
              </div>
            </div>

            {/* About Section */}
            {clinic.description && (
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 ring-1 ring-blue-200 p-5">
                <h3 className="text-base font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <BuildingOffice2Icon className="w-5 h-5 text-blue-600" />
                  About {clinic.name}
                </h3>
                <p className="text-sm text-neutral-700 leading-relaxed">{clinic.description}</p>
              </div>
            )}

            {/* Services & Specializations */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Services */}
              {clinic.services && clinic.services.length > 0 && (
                <div className="rounded-2xl bg-white ring-1 ring-neutral-200 p-4">
                  <h3 className="text-sm font-semibold text-neutral-800 mb-3">Services Offered</h3>
                  <div className="flex flex-wrap gap-2">
                    {clinic.services.map((service, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 ring-1 ring-emerald-200 text-xs font-medium text-emerald-700"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Specializations */}
              {clinic.specializations && clinic.specializations.length > 0 && (
                <div className="rounded-2xl bg-white ring-1 ring-neutral-200 p-4">
                  <h3 className="text-sm font-semibold text-neutral-800 mb-3">Specializations</h3>
                  <div className="flex flex-wrap gap-2">
                    {clinic.specializations.map((spec, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 ring-1 ring-purple-200 text-xs font-medium text-purple-700"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Clinic not found or access restricted.</div>
        )}
      </div>
    </div>
  );
}
