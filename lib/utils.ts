import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrentThaiYear(): number {
  return new Date().getFullYear() + 543;
}

export function formatThaiDate(date: Date): string {
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getCurrentDateTimeString(): { date: string; time: string } {
  const now = new Date();
  return {
    date: now.toISOString().split("T")[0],
    time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
  };
}
