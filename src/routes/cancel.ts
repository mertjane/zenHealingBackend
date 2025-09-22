import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { sendCancelEmail } from "../utils/sendEmail";
import { Booking } from "../types/Booking";

dotenv.config();

const router = Router();
const filePath = path.join(process.cwd(), "db", "bookings.json");

// Load bookings
const loadBookings = (): Booking[] => {
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, "utf-8");
  return data ? JSON.parse(data) : [];
};

// Save bookings
const saveBookings = (bookings: Booking[]) => {
  fs.writeFileSync(filePath, JSON.stringify(bookings, null, 2), "utf-8");
};

// GET booking by email
router.get("/", (req: Request, res: Response) => {
  const { email } = req.query as { email?: string };

  if (!email) {
    return res.status(400).json({ error: "Email query is required" });
  }

  const bookings = loadBookings();
  const userBooking = bookings.find((b) => b.email === email);

  if (!userBooking) {
    return res.status(404).json({ error: "No booking found for this email" });
  }

  res.json(userBooking);
});

// DELETE booking by email
router.delete("/", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const bookings = loadBookings();
  const bookingIndex = bookings.findIndex((b) => b.email === email);

  if (bookingIndex === -1) {
    return res.status(404).json({ error: "No booking found for this email" });
  }

  const [removedBooking] = bookings.splice(bookingIndex, 1);
  saveBookings(bookings);

  // Send cancellation email to user
  try {
    await sendCancelEmail(
      {
        to_email: removedBooking.email,
        name: removedBooking.name,
        session: removedBooking.session,
        date: removedBooking.date,
        time: removedBooking.time,
        subject: "Zen Healing – Booking Cancelled",
      },
      "user"
    );
    console.log("✅ Cancellation email sent to user");
  } catch (err) {
    console.error("❌ Failed to send cancellation email", err);
  }

  // Optionally, notify admin
  try {
    await sendCancelEmail(
      {
        to_email: "info@zenhealing.co.uk",
        name: removedBooking.name,
        surname: removedBooking.surname,
        email: removedBooking.email,
        session: removedBooking.session,
        date: removedBooking.date,
        time: removedBooking.time,
        subject: "Zen Healing – Booking Cancelled",
      },
      "admin"
    );
    console.log("✅ Admin notified of cancellation");
  } catch (err) {
    console.error("❌ Failed to notify admin", err);
  }

  res.json({ success: true, message: "Booking cancelled and emails sent", booking: removedBooking });
});


// Temporary POST endpoint for testing cancellation via Postman
router.post("/test-cancel", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const bookings = loadBookings();
  const bookingIndex = bookings.findIndex((b) => b.email === email);

  if (bookingIndex === -1) {
    return res.status(404).json({ error: "No booking found for this email" });
  }

  const [removedBooking] = bookings.splice(bookingIndex, 1);
  saveBookings(bookings);

  // Send cancellation email to user
  try {
    await sendCancelEmail(
      {
        to_email: removedBooking.email,
        name: removedBooking.name,
        session: removedBooking.session,
        date: removedBooking.date,
        time: removedBooking.time,
        subject: "Zen Healing – Booking Cancelled (Test)",
      },
      "user"
    );
    console.log("✅ Test cancellation email sent to user");
  } catch (err) {
    console.error("❌ Failed to send test cancellation email", err);
  }

  // Notify admin
  try {
    await sendCancelEmail(
      {
        to_email: "info@zenhealing.co.uk",
        name: removedBooking.name,
        surname: removedBooking.surname,
        email: removedBooking.email,
        session: removedBooking.session,
        date: removedBooking.date,
        time: removedBooking.time,
        subject: "Zen Healing – Booking Cancelled (Test)",
      },
      "admin"
    );
    console.log("✅ Admin notified of test cancellation");
  } catch (err) {
    console.error("❌ Failed to notify admin", err);
  }

  res.json({
    success: true,
    message: "Test cancellation executed. Emails sent to user and admin.",
    booking: removedBooking,
  });
});


export default router;
