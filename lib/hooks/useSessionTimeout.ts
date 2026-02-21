"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

// Session timeout configuration (in milliseconds)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const WARNING_BEFORE_TIMEOUT_MS = 5 * 60 * 1000; // Show warning 5 minutes before timeout
const ACTIVITY_THROTTLE_MS = 30 * 1000; // Throttle activity updates to every 30 seconds

interface UseSessionTimeoutOptions {
  timeoutMs?: number;
  warningMs?: number;
  onTimeout?: () => void;
  onWarning?: () => void;
  redirectTo?: string;
}

interface SessionTimeoutState {
  isWarningVisible: boolean;
  remainingTime: number;
  extendSession: () => void;
  logout: () => Promise<void>;
}

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}): SessionTimeoutState {
  const {
    timeoutMs = SESSION_TIMEOUT_MS,
    warningMs = WARNING_BEFORE_TIMEOUT_MS,
    onTimeout,
    onWarning,
    redirectTo = "/login",
  } = options;

  const router = useRouter();
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timeoutMs);
  
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const throttleRef = useRef<number>(0);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Clear all timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      
      // Clear session storage
      try {
        localStorage.removeItem("session_last_activity");
        // Clear auth cookie
        await fetch("/api/auth/clear-cookie", { method: "POST", credentials: "include" });
      } catch {}
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Call custom timeout handler if provided
      if (onTimeout) {
        onTimeout();
      }
      
      // Redirect to login
      router.replace(redirectTo);
    } catch (error) {
      console.error("Session timeout logout error:", error);
      // Force redirect even on error
      window.location.href = redirectTo;
    }
  }, [onTimeout, redirectTo, router]);

  // Extend session (reset timers)
  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsWarningVisible(false);
    setRemainingTime(timeoutMs);
    
    // Persist last activity to localStorage for cross-tab sync
    try {
      localStorage.setItem("session_last_activity", String(Date.now()));
    } catch {}
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    // Set warning timer
    warningRef.current = setTimeout(() => {
      setIsWarningVisible(true);
      if (onWarning) onWarning();
      
      // Start countdown
      let remaining = warningMs;
      setRemainingTime(remaining);
      
      countdownRef.current = setInterval(() => {
        remaining -= 1000;
        setRemainingTime(Math.max(0, remaining));
        
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      }, 1000);
    }, timeoutMs - warningMs);
    
    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeoutMs);
  }, [timeoutMs, warningMs, onWarning, logout]);

  // Track user activity
  const handleActivity = useCallback(() => {
    const now = Date.now();
    
    // Throttle activity updates
    if (now - throttleRef.current < ACTIVITY_THROTTLE_MS) return;
    throttleRef.current = now;
    
    // Only extend if warning is not visible (user must explicitly extend during warning)
    if (!isWarningVisible) {
      extendSession();
    }
  }, [isWarningVisible, extendSession]);

  // Initialize session tracking
  useEffect(() => {
    // Check for existing session activity from localStorage
    try {
      const lastActivity = localStorage.getItem("session_last_activity");
      if (lastActivity) {
        const elapsed = Date.now() - parseInt(lastActivity, 10);
        if (elapsed >= timeoutMs) {
          // Session already expired
          logout();
          return;
        }
      }
    } catch {}

    // Start session timer
    extendSession();

    // Activity event listeners
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Listen for visibility change (tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check if session expired while tab was hidden
        try {
          const lastActivity = localStorage.getItem("session_last_activity");
          if (lastActivity) {
            const elapsed = Date.now() - parseInt(lastActivity, 10);
            if (elapsed >= timeoutMs) {
              logout();
              return;
            }
          }
        } catch {}
        handleActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Listen for storage events (cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "session_last_activity" && e.newValue) {
        const newActivity = parseInt(e.newValue, 10);
        if (newActivity > lastActivityRef.current) {
          lastActivityRef.current = newActivity;
          if (!isWarningVisible) {
            extendSession();
          }
        }
      }
      // Handle logout from another tab
      if (e.key === "session_logout") {
        logout();
      }
    };
    window.addEventListener("storage", handleStorage);

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [timeoutMs, extendSession, handleActivity, logout, isWarningVisible]);

  return {
    isWarningVisible,
    remainingTime,
    extendSession,
    logout,
  };
}

// Format remaining time for display
export function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${seconds}s`;
}
