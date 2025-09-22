import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { Booking } from "../types/Booking";

const router = Router();
const filePath = path.join(process.cwd(), "src", "db", "bookings.json");

// Load bookings from file
const loadBookings = (): Booking[] => {
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, "utf8");
  return data ? JSON.parse(data) : [];
};

// Save bookings to file
const saveBookings = (bookings: Booking[]) => {
  fs.writeFileSync(filePath, JSON.stringify(bookings, null, 2), "utf8");
};

// ✅ GET all bookings
router.get("/", (req: Request, res: Response) => {
  const { date } = req.query as { date?: string };
  let bookings = loadBookings();

  if (date) {
    bookings = bookings.filter((b) => b.date === date);
  }

  res.json(bookings);
});

// ✅ POST new booking
router.post("/", (req: Request, res: Response) => {
  const { name, surname, email, phone, date, time, session } =
    req.body as Booking;

  if (!name || !surname || !email || !date || !time || !session) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const bookings = loadBookings();

  // check if this slot already taken
  const exists = bookings.some((b) => b.date === date && b.time === time);
  if (exists) {
    return res.status(400).json({ error: "Slot already booked" });
  }

  const newBooking: Booking = { name, surname, email, phone, date, time, session };
  bookings.push(newBooking);
  saveBookings(bookings);

  return res.json({ success: true, message: "Booking confirmed", booking: newBooking });
});

export default router;
