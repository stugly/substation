"use client";

import { Sun } from "lucide-react";

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground px-4 py-5 text-center rounded-b-[20px] shadow-md sticky top-0 z-50">
      <div className="flex items-center justify-center gap-2">
        <Sun className="h-6 w-6" />
        <h1 className="text-xl font-semibold tracking-tight">Helios</h1>
      </div>
      <p className="text-sm opacity-90 mt-1">Smart Reporting System</p>
    </header>
  );
}
