"use client";

import Link from "next/link";

type Props = {
  name: string;
  specialization: string | null;
  email: string | null;
  verification: string | null;
  primary: string;
  category?: string | null;
  classificationLevel?: string | null;
  licenseType?: string | null;
};

export default function ProfileCard({ name, specialization, email, verification, primary, category, classificationLevel, licenseType }: Props) {
  const items = [
    { label: "Name", value: name || "-" },
    { label: "Specialization", value: specialization || "General Practice" },
    { label: "Email", value: email || "-" },
    { label: "Status", value: verification || "pending" },
  ];
  
  if (category) items.push({ label: "Category", value: category });
  if (classificationLevel) items.push({ label: "Classification", value: classificationLevel });
  if (licenseType) items.push({ label: "License Type", value: licenseType });

  return (
    <div className="bg-white rounded-xl border border-neutral-200">
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <h2 className="font-semibold text-neutral-900">Profile</h2>
        <Link href="/veterinarian/settings" className="text-sm text-blue-600 hover:underline">
          Edit
        </Link>
      </div>
      
      <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, idx) => (
          <div key={idx}>
            <p className="text-xs text-neutral-500 mb-1">{item.label}</p>
            <p className="text-sm font-medium text-neutral-900 truncate" title={item.value}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
