"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { SparklesIcon } from "@heroicons/react/24/outline";

export default function WelcomeDisplay() {
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserName = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) {
          setLoading(false);
          return;
        }

        const { data: ownerProfile } = await supabase
          .from("pet_owner_profiles")
          .select("full_name")
          .eq("user_id", userId)
          .maybeSingle();

        if (ownerProfile?.full_name) {
          setUserName(ownerProfile.full_name);
        } else {
          // Fallback to email if name not available
          setUserName(auth.user?.email?.split("@")[0] || "Pet Owner");
        }
      } catch (error) {
        console.error("Failed to load user name:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserName();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="mb-4 sm:mb-5 md:mb-6 rounded-lg sm:rounded-xl border border-neutral-200 bg-white shadow-sm p-4 sm:p-5 md:p-6 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 rounded mb-2" />
        <div className="h-4 w-64 bg-neutral-200 rounded" />
      </div>
    );
  }

  return (
    <div className="mb-4 sm:mb-5 md:mb-6 rounded-lg sm:rounded-xl border border-neutral-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm p-4 sm:p-5 md:p-6 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-blue-200 rounded-full opacity-10 -mr-8 -mt-8" />
      <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-28 sm:h-28 bg-indigo-200 rounded-full opacity-10 -ml-6 -mb-6" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
          <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            {getGreeting()}, {userName}! 👋
          </h2>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          Welcome to your pet care dashboard. Everything is ready for you to manage your pets and appointments.
        </p>
      </div>
    </div>
  );
}
