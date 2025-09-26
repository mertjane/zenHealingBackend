import { Router, Request, Response } from "express";
import dotenv from "dotenv";
import { sendCancelEmail } from "../utils/sendEmail";
import { pool } from "../utils/db";

dotenv.config();

const router = Router();



// GET booking by email
router.get("/", async (req: Request, res: Response) => {
  const { email } = req.query as { email?: string };
  if (!email) return res.status(400).json({ error: "Email query is required" });

  const [rows] = await pool.query("SELECT * FROM tBookings WHERE email = ?", [email]);
  if ((rows as any[]).length === 0) {
    return res.status(404).json({ error: "No booking found for this email" });
  }

  res.json((rows as any[])[0]);
});


// DELETE booking by email
router.delete("/", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "Email is required" });

  const [rows] = await pool.query("SELECT * FROM tBookings WHERE email = ?", [email]);
  if ((rows as any[]).length === 0) {
    return res.status(404).json({ error: "No booking found for this email" });
  }

  const booking = (rows as any[])[0];

  await pool.query("DELETE FROM tBookings WHERE email = ?", [email]);

  // Send cancellation emails
  try {
    await sendCancelEmail(
      {
        to_email: booking.email,
        name: booking.fName,
        session: booking.session,
        date: booking.date,
        time: booking.time,
        subject: "Zen Healing – Booking Cancelled",
      },
      "user"
    );
    await sendCancelEmail(
      {
        to_email: "info@zenhealing.co.uk",
        name: booking.fName,
        surname: booking.sName,
        email: booking.email,
        session: booking.session,
        date: booking.date,
        time: booking.time,
        subject: "Zen Healing – Booking Cancelled",
      },
      "admin"
    );
  } catch (err) {
    console.error("❌ Failed to send cancellation emails", err);
  }

  res.json({ success: true, message: "Booking cancelled", booking });
});

export default router;
