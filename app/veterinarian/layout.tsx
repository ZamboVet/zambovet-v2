"use client";

import { useState } from "react";
import { Poppins } from "next/font/google";
import Sidebar from "./components/Sidebar";
import HeaderBar from "./components/HeaderBar";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const PRIMARY = "#0B63C7";

export default function VetLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`${poppins.className} min-h-screen relative`}
      style={{
        // Light veterinary palette
        // @ts-ignore
        ['--brand' as any]: PRIMARY,
        ['--brand-50' as any]: '#eff6ff',
        ['--brand-100' as any]: '#dbeafe',
        ['--brand-200' as any]: '#bfdbfe',
        ['--brand-300' as any]: '#a7f3d0',
      }}
    >
      <div className="absolute inset-0 -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_left,rgba(219,234,254,0.9),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(224,242,254,0.9),transparent_50%)]" />
      </div>
      <Sidebar open={open} onClose={() => setOpen(false)} primary={PRIMARY} />
      <div className="lg:pl-72">
        <HeaderBar onMenu={() => setOpen(true)} primary={PRIMARY} />
        <main className="px-4 sm:px-6 lg:px-8 pb-8">{children}</main>
      </div>
    </div>
  );
}
