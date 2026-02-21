"use client";

import Link from "next/link";
import { 
  CalendarDaysIcon, 
  UserGroupIcon, 
  MapPinIcon,
  StarIcon
} from "@heroicons/react/24/outline";

const actions = [
  {
    href: "/veterinarian/appointments",
    icon: CalendarDaysIcon,
    title: "Appointments",
    desc: "Manage schedule",
  },
  {
    href: "/veterinarian/patients",
    icon: UserGroupIcon,
    title: "Patients",
    desc: "Medical records",
  },
  {
    href: "/veterinarian/clinic/location",
    icon: MapPinIcon,
    title: "Clinic",
    desc: "Location & hours",
  },
  {
    href: "/veterinarian/reviews",
    icon: StarIcon,
    title: "Reviews",
    desc: "Patient feedback",
  },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {actions.map((action) => (
        <Link 
          key={action.href}
          href={action.href} 
          className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <action.icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-neutral-900 text-sm">{action.title}</p>
            <p className="text-xs text-neutral-500 truncate">{action.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
