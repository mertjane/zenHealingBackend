export interface Booking {
  id: string; // UUID
  name: string;
  surname: string;
  email: string;
  phone?: string;
  date: string;   // e.g. "2025-09-23"
  time: string;   // e.g. "10:00"
  session: "15-min" | "30-min" | "45-min" | "60-min";
  cancel_url?: string | null;
}
