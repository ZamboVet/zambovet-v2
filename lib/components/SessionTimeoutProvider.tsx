"use client";

import { useSessionTimeout } from "../hooks/useSessionTimeout";
import SessionTimeoutWarning from "./SessionTimeoutWarning";

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function SessionTimeoutProvider({ 
  children, 
  redirectTo = "/login" 
}: SessionTimeoutProviderProps) {
  const { isWarningVisible, remainingTime, extendSession, logout } = useSessionTimeout({
    redirectTo,
  });

  return (
    <>
      {children}
      <SessionTimeoutWarning
        isVisible={isWarningVisible}
        remainingTime={remainingTime}
        onExtend={extendSession}
        onLogout={logout}
      />
    </>
  );
}
