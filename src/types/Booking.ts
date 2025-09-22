export interface Booking {
  name: string;
  surname: string;
  email: string;
  phone?: string;
  date: string;   // e.g. "2025-09-23"
  time: string;   // e.g. "10:00"
  session: string; // "15-min" | "30-min" etc.
}