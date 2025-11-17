export default function AdminAppointmentsPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Appointment System</h1>
        <button className="px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto">New Slot</button>
      </div>
      <div className="rounded-2xl bg-white shadow-md ring-1 ring-black/5 p-5">
        <div className="text-sm text-gray-500">Calendar/table placeholder</div>
      </div>
    </div>
  );
}
