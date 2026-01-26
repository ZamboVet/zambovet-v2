"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { supabase } from "../../../../lib/supabaseClient";
import { swalConfirmColor } from "../../../../lib/ui/tokens";
import { ArrowLeftIcon, UserCircleIcon, PhoneIcon, MapPinIcon, CalendarIcon, PawPrintIcon } from "@heroicons/react/24/outline";

type Profile = {
  id: number;
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  profile_picture_url: string | null;
  created_at: string;
};

type Patient = {
  id: number;
  name: string;
  species: string | null;
  breed: string | null;
  date_of_birth: string | null;
  gender: string | null;
  profile_picture_url: string | null;
};

type Post = {
  id: number;
  content: string | null;
  media_count: number;
  created_at: string;
  reactions_count: number;
  comments_count: number;
};

type ProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const unwrappedParams = use(params);
  const profileId = parseInt(unwrappedParams.id);
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pets, setPets] = useState<Patient[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Get current user
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) {
          window.location.href = `/login?redirect=${encodeURIComponent(`/pet_owner/profile/${profileId}`)}`;
          return;
        }
        setCurrentUserId(uid);

        // Check if viewing own profile
        const { data: currentOwner } = await supabase
          .from("pet_owner_profiles")
          .select("id")
          .eq("user_id", uid)
          .maybeSingle();

        const isOwn = currentOwner && (currentOwner as any).id === profileId;
        setIsOwnProfile(isOwn);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("pet_owner_profiles")
          .select("id,user_id,full_name,phone,address,profile_picture_url,created_at")
          .eq("id", profileId)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData) {
          await Swal.fire({ 
            icon: "error", 
            title: "Profile not found", 
            text: "This profile does not exist.",
            confirmButtonColor: swalConfirmColor 
          });
          router.push("/pet_owner/moments");
          return;
        }

        setProfile(profileData as Profile);

        // Fetch pets (only active pets, and only public info)
        const { data: petsData } = await supabase
          .from("patients")
          .select("id,name,species,breed,date_of_birth,gender,profile_picture_url")
          .eq("owner_id", profileId)
          .eq("is_active", true)
          .order("name");

        setPets((petsData || []) as Patient[]);

        // Fetch recent posts (only public posts if not own profile)
        let postsQuery = supabase
          .from("pet_posts")
          .select("id,content,media_count,created_at")
          .eq("pet_owner_id", profileId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!isOwn) {
          postsQuery = postsQuery.eq("visibility", "public");
        }

        const { data: postsData } = await postsQuery;

        // Get reaction and comment counts
        if (postsData && postsData.length > 0) {
          const postIds = postsData.map(p => p.id);
          const [{ data: reactions }, { data: comments }] = await Promise.all([
            supabase.from("pet_post_reactions").select("post_id").in("post_id", postIds),
            supabase.from("pet_post_comments").select("post_id").in("post_id", postIds),
          ]);

          const rxCount = new Map<number, number>();
          (reactions || []).forEach((r: any) => {
            rxCount.set(r.post_id, (rxCount.get(r.post_id) || 0) + 1);
          });

          const cmCount = new Map<number, number>();
          (comments || []).forEach((c: any) => {
            cmCount.set(c.post_id, (cmCount.get(c.post_id) || 0) + 1);
          });

          const postsWithCounts = (postsData || []).map((p: any) => ({
            ...p,
            reactions_count: rxCount.get(p.id) || 0,
            comments_count: cmCount.get(p.id) || 0,
          }));

          setPosts(postsWithCounts);
        } else {
          setPosts([]);
        }
      } catch (e: any) {
        console.error("Profile load error:", e);
        await Swal.fire({ 
          icon: "error", 
          title: "Failed to load profile", 
          text: e?.message,
          confirmButtonColor: swalConfirmColor 
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profileId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <div className="mt-4 text-neutral-600">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-neutral-600">Profile not found</div>
        </div>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", { 
    month: "long", 
    year: "numeric" 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-neutral-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">{profile.full_name}</h1>
            <p className="text-sm text-neutral-500">Pet Owner Profile</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 overflow-hidden">
          {/* Cover/Header */}
          <div className="h-32 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-16 mb-4">
              <div className="h-32 w-32 rounded-full overflow-hidden bg-white ring-4 ring-white shadow-lg">
                {profile.profile_picture_url ? (
                  <img 
                    src={profile.profile_picture_url} 
                    alt={profile.full_name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <UserCircleIcon className="w-20 h-20 text-white" />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <Link
                  href="/pet_owner/settings"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Edit Profile
                </Link>
              )}
            </div>

            {/* Name and Info */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">{profile.full_name}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-neutral-500">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Member since {memberSince}</span>
                </div>
              </div>

              {/* Contact Info (only show on own profile or if public) */}
              {isOwnProfile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <PhoneIcon className="w-4 h-4 text-neutral-400" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  {profile.address && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <MapPinIcon className="w-4 h-4 text-neutral-400" />
                      <span>{profile.address}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 pt-4 border-t border-neutral-100">
                <div className="text-center">
                  <div className="text-2xl font-bold text-neutral-900">{pets.length}</div>
                  <div className="text-xs text-neutral-500">Pets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-neutral-900">{posts.length}</div>
                  <div className="text-xs text-neutral-500">Posts</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pets Section */}
        {pets.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <PawPrintIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-neutral-900">Pets</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 flex-shrink-0">
                    {pet.profile_picture_url ? (
                      <img 
                        src={pet.profile_picture_url} 
                        alt={pet.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
                        {pet.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-900 truncate">{pet.name}</div>
                    <div className="text-xs text-neutral-500">
                      {pet.species || "Pet"}
                      {pet.breed && ` • ${pet.breed}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Posts Section */}
        {posts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Recent Posts</h3>
              <Link
                href="/pet_owner/moments"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href="/pet_owner/moments"
                  className="block p-4 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
                >
                  {post.content && (
                    <p className="text-sm text-neutral-700 line-clamp-2 mb-2">
                      {post.content}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    <span>❤️ {post.reactions_count}</span>
                    <span>💬 {post.comments_count}</span>
                    {post.media_count > 0 && <span>📷 {post.media_count}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {posts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-12 text-center">
            <div className="text-neutral-400 mb-2">
              <UserCircleIcon className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-neutral-600">
              {isOwnProfile ? "You haven't posted anything yet" : "No public posts yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
