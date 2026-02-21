"use client";

import { CalendarDaysIcon, CheckCircleIcon, ClockIcon, StarIcon } from "@heroicons/react/24/outline";

type Props = {
  today: number;
  pending: number;
  confirmed: number;
  rating: number;
  primary: string;
};

export default function KPIs({ today, pending, confirmed, rating, primary }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        title="Today's Appointments"
        value={today}
        icon={CalendarDaysIcon}
        color="blue"
      />
      <StatCard
        title="Pending"
        value={pending}
        icon={ClockIcon}
        color="amber"
        highlight={pending > 0}
      />
      <StatCard
        title="Completed"
        value={confirmed}
        icon={CheckCircleIcon}
        color="green"
      />
      <StatCard
        title="Rating"
        value={rating.toFixed(1)}
        icon={StarIcon}
        color="amber"
        suffix="/5"
      />
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color,
  highlight,
  suffix
}: { 
  title: string; 
  value: number | string; 
  icon: any; 
  color: "blue" | "amber" | "green";
  highlight?: boolean;
  suffix?: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {highlight && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
            Needs attention
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold text-neutral-900">{value}</span>
          {suffix && <span className="text-sm text-neutral-400">{suffix}</span>}
        </div>
        <p className="text-sm text-neutral-500 mt-0.5">{title}</p>
      </div>
    </div>
  );
}
