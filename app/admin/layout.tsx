"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HomeIcon, UsersIcon, BuildingOfficeIcon, UserCircleIcon, ClockIcon, Cog6ToothIcon, BellIcon } from "@heroicons/react/24/outline";
import AdminSidebar from "./components/Sidebar";
import AdminTopbar from "./components/Topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = [
    { href: "/admin", label: "Dashboard", icon: HomeIcon, desc: "Dashboard overview" },
    { href: "/admin/users", label: "User Management", icon: UsersIcon, desc: "Manage accounts" },
    { href: "/admin/clinics", label: "Clinic Management", icon: BuildingOfficeIcon, desc: "Clinic listings" },
    { href: "/admin/veterinarians", label: "Veterinarian Registry", icon: UserCircleIcon, desc: "Medical professionals" },
    { href: "/admin/activity", label: "Recent Activity", icon: ClockIcon, desc: "Activity logs" },
    { href: "/admin/notifications", label: "Approval Requests", icon: BellIcon, desc: "Pending approvals" },
    { href: "/admin/settings", label: "Settings", icon: Cog6ToothIcon, desc: "Settings & Configuration" },
  ];
  useEffect(() => {
    const handler = () => setOpen((v) => !v);
    window.addEventListener("toggle-admin-sidebar", handler as EventListener);
    return () => window.removeEventListener("toggle-admin-sidebar", handler as EventListener);
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white bg-[radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.08),transparent_60%)] text-gray-900">
      {/* Mobile overlay when sidebar is open */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-screen">
        <AdminSidebar items={items} pathname={pathname} open={open} onClose={() => setOpen(false)} />

        <div className="flex flex-col lg:ml-0">
          <AdminTopbar />

          <main className="p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
