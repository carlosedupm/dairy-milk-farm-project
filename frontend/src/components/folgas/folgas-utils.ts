import { format } from "date-fns";

export function toYMD(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function parseApiDate(s: string): string {
  return s.length >= 10 ? s.slice(0, 10) : s;
}
