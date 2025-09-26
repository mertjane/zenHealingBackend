import { Router, Request, Response } from "express";
import dotenv from "dotenv";
import { sendCancelEmail } from "../utils/sendEmail";
import { pool } from "../utils/db";

dotenv.config();

const router = Router();



// ✅ GET booking by email
router.get("/", async (req: Request, res: Response) => {
  const { email } = req.query as { email?: string };
  if (!email) return res.status(400).json({ error: "Email query is required" });

  try {
    const result = await pool.query("SELECT * FROM tBookings WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No booking found for this email" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Failed to fetch booking:", err);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});


// ✅ DELETE booking by email
router.delete("/", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const result = await pool.query("SELECT * FROM tBookings WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No booking found for this email" });
    }

    const booking = result.rows[0];

    await pool.query("DELETE FROM tBookings WHERE email = $1", [email]);

    // Send cancellation emails
    try {
      await sendCancelEmail(
        {
          to_email: booking.email,
          name: booking.fname, // ⚠️ Postgres columns are usually lowercase
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
          name: booking.fname,
          surname: booking.sname,
          email: booking.email,
          session: booking.session,
          date: booking.date,
          time: booking.time,
          subject: "Zen Healing – Booking Cancelled",
        },
        "admin"
      );
    } catch (emailErr) {
      console.error("⚠️ Failed to send cancellation emails:", emailErr);
    }

    res.json({ success: true, message: "Booking cancelled", booking });
  } catch (err) {
    console.error("❌ Failed to cancel booking:", err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

export default router;
