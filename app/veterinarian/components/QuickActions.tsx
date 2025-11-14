"use client";

import Link from "next/link";
import { CalendarDaysIcon, UserGroupIcon, Cog6ToothIcon, StarIcon } from "@heroicons/react/24/outline";

export default function QuickActions() {
  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur p-5 sm:p-6 shadow ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold text-gray-800">Quick Actions</div>
          <div className="text-sm text-gray-500">Access your most important tools</div>
        </div>
        <div className="text-xs text-emerald-600">All systems operational</div>
      </div>
      <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard href="/veterinarian/appointments" icon={CalendarDaysIcon} title="Appointments" desc="Manage patient appointments and schedule" color="from-blue-50 to-blue-100" />
        <ActionCard href="/veterinarian/patients" icon={UserGroupIcon} title="Patient Records" desc="Access comprehensive medical records" color="from-green-50 to-green-100" />
        <ActionCard href="/veterinarian/settings" icon={Cog6ToothIcon} title="Profile" desc="Update professional credentials" color="from-purple-50 to-purple-100" />
        <ActionCard href="/veterinarian/earnings" icon={StarIcon} title="Reviews" desc="View patient feedback and ratings" color="from-amber-50 to-amber-100" />
      </div>
    </div>
  );
}

function ActionCard({ href, icon: Icon, title, desc, color }: { href: string; icon: any; title: string; desc: string; color: string }) {
  return (
    <Link href={href} className={`relative block rounded-2xl p-4 bg-gradient-to-br ${color} ring-1 ring-black/5 hover:shadow-md transition active:scale-[.99]`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl grid place-items-center bg-white text-blue-700">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-800">{title}</div>
          <div className="text-xs text-gray-500">{desc}</div>
          <div className="mt-3 text-sm text-blue-700">Open →</div>
        </div>
      </div>
      <div className="absolute right-3 top-3 w-10 h-10 rounded-full bg-white/50" />
    </Link>
  );
}
