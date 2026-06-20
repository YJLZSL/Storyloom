import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse a JSON string into an array.
 * - Accepts `string | null | undefined` (or any `unknown`).
 * - If `raw` is a string, attempts `JSON.parse` inside try/catch.
 * - Returns the parsed value only when `Array.isArray(parsed)` is true.
 * - Otherwise returns the provided fallback (default: `[]`).
 */
export function safeJsonArray<T>(raw: unknown, fallback: T[] = []): T[] {
  if (typeof raw !== 'string') return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}
