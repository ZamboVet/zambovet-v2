"use client";

type Props = {
  today: number;
  pending: number;
  confirmed: number;
  rating: number;
  primary: string;
};

import { CalendarDaysIcon, CheckCircleIcon, ClockIcon, StarIcon } from "@heroicons/react/24/outline";

export default function KPIs({ today, pending, confirmed, rating, primary }: Props) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        title="Total Appointments"
        value={today}
        icon={<CalendarDaysIcon className="w-6 h-6" />}
        dotClass="bg-blue-500"
        iconClass="bg-blue-50 text-blue-700"
        subLeft="All time"
        subRight="+12% vs last month"
        primary={primary}
      />
      <Card
        title="Pending Reviews"
        value={pending}
        icon={<ClockIcon className="w-6 h-6" />}
        dotClass="bg-amber-500"
        iconClass="bg-amber-50 text-amber-700"
        subLeft="Needs attention"
        subRight=""
        primary={primary}
      />
      <Card
        title="Completed Today"
        value={confirmed}
        icon={<CheckCircleIcon className="w-6 h-6" />}
        dotClass="bg-emerald-500"
        iconClass="bg-emerald-50 text-emerald-700"
        subLeft="Consultations"
        subRight="Great progress!"
        primary={primary}
      />
      <Card
        title="Patient Rating"
        value={Number(rating.toFixed(1))}
        icon={<StarIcon className="w-6 h-6" />}
        dotClass="bg-yellow-500"
        iconClass="bg-yellow-50 text-yellow-600"
        subLeft={<span><span className="underline">0 reviews</span></span>}
        subRight="Excellent!"
        primary={primary}
      />
    </div>
  );
}

function Card({ title, value, icon, dotClass, iconClass, subLeft, subRight, primary }: { title: string; value: number; icon: React.ReactNode; dotClass: string; iconClass: string; subLeft: React.ReactNode; subRight: React.ReactNode; primary: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-100 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className={`w-2 h-2 rounded-full ${dotClass}`} />
            <span>{title}</span>
          </div>
          <div className="mt-2 text-3xl font-bold" style={{ color: primary }}>{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-xl grid place-items-center ${iconClass}`}>{icon}</div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="text-emerald-600/90">{subLeft}</div>
        <div className="text-gray-400">{subRight}</div>
      </div>
    </div>
  );
}
