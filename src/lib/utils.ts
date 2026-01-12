import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  const dd = pad(date.getDate());
  const MM = pad(date.getMonth() + 1); // months are 0-based
  const yyyy = date.getFullYear();

  return `${dd}/${MM}/${yyyy} ${hh}:${mm}:${ss} `;
}

export function generateReferralCode(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}
