import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toUpperCase() ?? "")
    .join("");
}

/** Suggests a key from the name: initials for several words, else the first letters. */
export function suggestKey(name: string) {
  const words = name.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const raw = words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] ?? "").slice(0, 4);
  const key = raw.replace(/^[0-9]+/, "").slice(0, 10);
  return key.length >= 2 ? key : "";
}
