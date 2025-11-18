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

  return (
    <div className="lg:col-span-2 rounded-2xl bg-white p-5 shadow ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold" style={{ color: primary }}>Upcoming Appointments</h2>
        {mounted ? (
          <select suppressHydrationWarning value={range} onChange={(e) => setRange(e.target.value)} className="text-sm outline-none bg-white border rounded-lg px-2 py-1">
            <option value="7d">Next 7 days</option>
            <option value="30d">Next 30 days</option>
            <option value="90d">Next 90 days</option>
          </select>
        ) : (
          <select className="text-sm outline-none bg-white border rounded-lg px-2 py-1" defaultValue={range} aria-hidden>
            <option value="7d">Next 7 days</option>
            <option value="30d">Next 30 days</option>
            <option value="90d">Next 90 days</option>
          </select>
        )}
      </div>
      <ul className="divide-y">
        {loading ? (
          <li className="py-6 text-center text-sm text-gray-500">Loading…</li>
        ) : appointments.length === 0 ? (
          <li className="py-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <CalendarDaysIcon className="w-10 h-10 text-blue-400" />
              <div className="text-sm text-gray-600">No upcoming appointments</div>
              <Link href="/veterinarian/appointments" className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 active:scale-[.98]">Create appointment →</Link>
            </div>
          </li>
        ) : (
          appointments.map(a => (
            <li key={a.id} className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarDaysIcon className="w-9 h-9 rounded-xl p-2 bg-blue-50 text-blue-700" />
                <div>
                  <div className="font-medium" style={{ color: primary }}>{a.appointment_date} • {formatTime(a.appointment_time)}</div>
                  <div className="text-sm text-gray-500 truncate">{a.reason_for_visit || "Consultation"}</div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${a.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : a.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{a.status}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
