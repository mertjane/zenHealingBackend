import { Router, Request, Response } from "express";
import { pool } from "../utils/db";
import { Booking } from "../types/Booking";
import { sendEmail } from "../utils/sendEmail";
const { v4: uuidv4 } = require('uuid'); 

const router = Router();

const cancelUrl = `${process.env.CLIENT_URL}/cancel-booking`;

// ✅ GET all bookings (optionally by date)
router.get("/", async (req: Request, res: Response) => {
  const { date } = req.query as { date?: string };

  try {
    let query = "SELECT * FROM tBookings";
    const params: any[] = [];

    if (date) {
      query += " WHERE date = $1";
      params.push(date);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ Failed to fetch bookings:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ✅ POST new booking
router.post("/", async (req: Request, res: Response) => {
  const { name, surname, email, phone, date, time, session } = req.body as Booking;

  if (!name || !surname || !email || !date || !time || !session) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Check if slot already booked
    const existing = await pool.query(
      "SELECT * FROM tBookings WHERE date = $1 AND time = $2",
      [date, time]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Slot already booked" });
    }

    const id = uuidv4();

    const newBooking: Booking = {
      id,
      name,
      surname,
      email,
      phone,
      date,
      time,
      session,
      cancel_url: cancelUrl,
      
    };

    await pool.query(
      `INSERT INTO tBookings (id, fName, sName, email, phone, date, time, session, cancel_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, name, surname, email, phone, date, time, session, cancelUrl]
    );

    // Send confirmation emails only for free sessions (15-min)
    if (session === "15-min") {
      try {
        // Admin email
        await sendEmail(
          {
            to_email: "info@zenhealing.co.uk",
            name,
            surname,
            email,
            phone: phone || "N/A",
            date,
            time,
            session,
            subject: `New booking: ${name} ${surname}`,
            logo_url: `${process.env.SERVER_URL}/logoOriginal.png`
          },
          "admin"
        );

        // User email
        await sendEmail(
          {
            to_email: email,
            name,
            surname,
            phone: phone || "N/A",
            date,
            time,
            session,
            subject: `Your Zen Healing Booking Confirmation`,
            cancel_url: cancelUrl,
            logo_url: `${process.env.SERVER_URL}/logoOriginal.png`
          },
          "user"
        );
      } catch (emailErr) {
        console.error("⚠️ Email sending failed:", emailErr);
      }
    }

    return res.json({ success: true, message: "Booking confirmed", booking: newBooking });
  } catch (err: any) {
    console.error("❌ Failed to save booking:", err);
    res.status(500).json({ error: "Failed to save booking" });
  }
});

export default router;



