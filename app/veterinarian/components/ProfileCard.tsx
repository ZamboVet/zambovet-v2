"use client";

import { UserCircleIcon } from "@heroicons/react/24/outline";

type Props = {
  name: string;
  specialization: string | null;
  email: string | null;
  verification: string | null;
  primary: string;
};

export default function ProfileCard({ name, specialization, email, verification, primary }: Props) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold" style={{ color: primary }}>Profile</h2>
        <UserCircleIcon className="w-6 h-6 text-gray-500" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl p-3 bg-gray-50"><span className="text-gray-500">Name</span><div className="font-medium" style={{ color: primary }}>{name || "-"}</div></div>
        <div className="rounded-xl p-3 bg-gray-50"><span className="text-gray-500">Specialization</span><div className="font-medium" style={{ color: primary }}>{specialization || "General"}</div></div>
        <div className="rounded-xl p-3 bg-gray-50"><span className="text-gray-500">Email</span><div className="font-medium" style={{ color: primary }}>{email || "-"}</div></div>
        <div className="rounded-xl p-3 bg-gray-50"><span className="text-gray-500">Verification</span><div className="font-medium" style={{ color: primary }}>{verification || "pending"}</div></div>
      </div>
    </div>
  );
}
