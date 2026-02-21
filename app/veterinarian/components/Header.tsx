"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  name: string;
  online: boolean;
  verification: string;
  specialization?: string | null;
  onToggle: () => void;
  primary: string;
};

export default function Header({ name, online, verification, specialization, onToggle, primary }: Props) {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  useEffect(() => { 
    setMounted(true);
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);
  
  const greeting = useMemo(() => {
    if (!currentTime) return "Hello";
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, [currentTime]);
  
  const dateStr = currentTime ? currentTime.toLocaleDateString(undefined, { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  }) : "";

  const firstName = name.split(' ')[0];

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left section */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">
            {greeting}, {firstName}
          </h1>
          <p suppressHydrationWarning className="text-sm text-neutral-500 mt-1">
            {mounted ? dateStr : ""}
            {specialization && <span className="mx-2">·</span>}
            {specialization}
          </p>
          
          <div className="flex items-center gap-2 mt-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
              verification === "approved" 
                ? "bg-green-50 text-green-700" 
                : "bg-amber-50 text-amber-700"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${verification === "approved" ? "bg-green-500" : "bg-amber-500"}`} />
              {verification === "approved" ? "Verified" : "Pending verification"}
            </span>
          </div>
        </div>
        
        {/* Right section - Status */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            online ? "bg-green-50" : "bg-neutral-100"
          }`}>
            <span className={`w-2 h-2 rounded-full ${online ? "bg-green-500" : "bg-neutral-400"}`} />
            <span className={`text-sm font-medium ${online ? "text-green-700" : "text-neutral-600"}`}>
              {online ? "Online" : "Offline"}
            </span>
          </div>
          
          <button 
            onClick={onToggle} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              online 
                ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200" 
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {online ? "Go Offline" : "Go Online"}
          </button>
        </div>
      </div>
    </div>
  );
}
