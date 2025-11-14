"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, resetSettings, type SiteSettings } from "../../lib/settings";

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    setForm(loadSettings());
  }, []);

  const onChange = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((f: SiteSettings) => ({ ...f, [key]: value }));

  const onSave = () => {
    saveSettings(form);
    setSaved("Saved");
    setTimeout(() => setSaved(null), 2000);
  };

  const onReset = () => {
    resetSettings();
    setForm(DEFAULT_SETTINGS);
    setSaved("Reset to defaults");
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
          <p className="text-sm text-gray-500">Customize navbar colors and landing page content</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onReset} className="px-4 py-2 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200">Reset</button>
          <button onClick={onSave} className="px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700">Save</button>
        </div>
      </div>

      {saved && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{saved}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Brand & Colors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Company Name</label>
              <input value={form.companyName} onChange={(e)=>onChange("companyName", e.target.value)} className="w-full px-3 py-2 rounded-lg border outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaryColor} onChange={(e)=>onChange("primaryColor", e.target.value)} className="h-10 w-12 rounded border" />
                <input value={form.primaryColor} onChange={(e)=>onChange("primaryColor", e.target.value)} className="flex-1 px-3 py-2 rounded-lg border outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.secondaryColor} onChange={(e)=>onChange("secondaryColor", e.target.value)} className="h-10 w-12 rounded border" />
                <input value={form.secondaryColor} onChange={(e)=>onChange("secondaryColor", e.target.value)} className="flex-1 px-3 py-2 rounded-lg border outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accentColor} onChange={(e)=>onChange("accentColor", e.target.value)} className="h-10 w-12 rounded border" />
                <input value={form.accentColor} onChange={(e)=>onChange("accentColor", e.target.value)} className="flex-1 px-3 py-2 rounded-lg border outline-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Landing Page</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Hero Title</label>
              <input value={form.heroTitle} onChange={(e)=>onChange("heroTitle", e.target.value)} className="w-full px-3 py-2 rounded-lg border outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Hero Subtitle</label>
              <textarea value={form.heroSubtitle} onChange={(e)=>onChange("heroSubtitle", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Hero Button Text</label>
              <input value={form.heroButtonText} onChange={(e)=>onChange("heroButtonText", e.target.value)} className="w-full px-3 py-2 rounded-lg border outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-4">
        <div className="text-sm text-gray-500">Changes are saved to your browser. Publishing to production would require a backend or CMS.</div>
      </div>
    </div>
  );
}
