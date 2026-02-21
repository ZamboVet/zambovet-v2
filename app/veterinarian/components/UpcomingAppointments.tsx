"use client";

import Link from "next/link";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

type Appointment = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason_for_visit: string | null;
};

type Props = {
  appointments: Appointment[];
  loading: boolean;
  range: string;
  setRange: (v: string) => void;
  mounted: boolean;
  primary: string;
};

export default function UpcomingAppointments({ appointments, loading, range, setRange, mounted, primary }: Props) {
  const formatTime = (time: string) => {
    if (!time) return "-";
    const [hourStr, minuteStr] = time.split(":");
    const minutes = (minuteStr ?? "00").slice(0, 2);
    const hourNum = Number(hourStr);
    if (Number.isNaN(hourNum)) return time;
    const period = hourNum >= 12 ? "PM" : "AM";
    const hour12 = ((hourNum + 11) % 12) + 1;
    return `${hour12}:${minutes} ${period}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (dateStr === today.toISOString().slice(0, 10)) return "Today";
      if (dateStr === tomorrow.toISOString().slice(0, 10)) return "Tomorrow";
      
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return "bg-green-50 text-green-700";
      case 'pending': return "bg-amber-50 text-amber-700";
      case 'completed': return "bg-blue-50 text-blue-700";
      default: return "bg-neutral-100 text-neutral-600";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200">
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <h2 className="font-semibold text-neutral-900">Upcoming Appointments</h2>
        {mounted ? (
          <select 
            suppressHydrationWarning 
            value={range} 
            onChange={(e) => setRange(e.target.value)} 
            className="text-sm outline-none bg-neutral-100 rounded-lg px-2 py-1"
          >
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </select>
        ) : (
          <select className="text-sm outline-none bg-neutral-100 rounded-lg px-2 py-1" defaultValue={range}>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </select>
        )}
      </div>
      
      <div className="divide-y divide-neutral-100">
        {loading ? (
          <div className="p-4 text-sm text-neutral-500">Loading...</div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarDaysIcon className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">No upcoming appointments</p>
            <Link href="/veterinarian/appointments" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              View all appointments
            </Link>
          </div>
        ) : (
          appointments.slice(0, 5).map((a) => (
            <Link
              key={a.id}
              href={`/veterinarian/consultations/${a.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
            >
              <div className="w-12 h-12 rounded-lg bg-neutral-100 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-neutral-500">{formatDate(a.appointment_date).split(' ')[0]}</span>
                <span className="text-sm font-semibold text-neutral-900">
                  {formatDate(a.appointment_date) === 'Today' || formatDate(a.appointment_date) === 'Tomorrow' 
                    ? formatDate(a.appointment_date).slice(0, 3)
                    : a.appointment_date.split('-')[2]
                  }
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-neutral-900 truncate">
                  {a.reason_for_visit || "Consultation"}
                </p>
                <p className="text-xs text-neutral-500">{formatTime(a.appointment_time)}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(a.status)}`}>
                {a.status}
              </span>
            </Link>
          ))
        )}
      </div>
      
      {appointments.length > 0 && (
        <div className="px-4 py-3 border-t border-neutral-200">
          <Link href="/veterinarian/appointments" className="text-sm text-blue-600 hover:underline">
            View all appointments
          </Link>
        </div>
      )}
    </div>
  );
}
