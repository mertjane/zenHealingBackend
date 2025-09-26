import { Router } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { sendEmail } from "../utils/sendEmail"; // helper
import { pool } from "../utils/db"; // MySQL pool


dotenv.config();

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Booking sessions mapping
const sessionPrices: Record<string, { name: string; amount: number }> = {
  "15-min": { name: "15 min free consultation", amount: 0 },
  "30-min": { name: "30 min session", amount: 4500 },   // £45
  "45-min": { name: "45 min session", amount: 6750 },   // £67.50
  "60-min": { name: "1 hr session", amount: 9000 },     // £90
};


// --- Temporary POST endpoint for testing in Postman ---
/* router.post("/webhook-test", express.json(), async (req, res) => {
  const event = req.body;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const metadata = session.metadata;

    const email = metadata?.email || "test@example.com"; // ✅ declare here

    console.log("✅ [TEST] Payment success for:", email);

    // 0️⃣ Save booking to bookings.json
    const bookings = loadBookings();

    const exists = bookings.some(
      (b) => b.date === metadata?.date && b.time === metadata?.time
    );

    if (!exists) {
      const newBooking: Booking = {
        name: metadata?.name || "Unknown",
        surname: metadata?.surname || "",
        email: email || "unknown@example.com",
        phone: metadata?.number,
        date: metadata?.date || "",
        time: metadata?.time || "",
        session: metadata?.session || "",
      };

      bookings.push(newBooking);
      saveBookings(bookings);
      console.log("✅ Booking saved to bookings.json");
    } else {
      console.log("⚠ Slot already exists, skipping JSON update");
    }

    // 1️⃣ Send confirmation to user
    await sendEmail(
      {
        to_email: email,
        name: metadata?.name,
        number: metadata?.number,
        date: metadata?.date,
        time: metadata?.time,
        session: metadata?.session,
        subject: "Zen Healing – Booking Confirmation",
        cancel_url: `${process.env.CLIENT_URL}/cancel-booking`, 
      },
      "user"
    );

    // 2️⃣ Send notification to admin
    await sendEmail(
      {
        to_email: "info@zenhealing.co.uk",
        name: metadata?.name,
        surname: metadata?.surname,
        email: email,
        number: metadata?.number,
        date: metadata?.date,
        time: metadata?.time,
        session: metadata?.session,
        subject: "Zen Healing – New Booking Received",
      },
      "admin"
    );

    console.log("✅ Emails sent to user and admin");
  }

  res.json({ received: true });
}); */




// Create checkout session
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { name, surname, email, number, date, time, session } = req.body;

    const selected = sessionPrices[session];
    if (!selected) {
      return res.status(400).json({ error: "Invalid session" });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: selected.name,
              description: `Booking for ${date} at ${time} with ${name} ${surname}`,
            },
            unit_amount: selected.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: email,
      metadata: { name, surname, number, date, time, session },
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    res.json({ id: checkoutSession.id });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Stripe Webhook
router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err: any) {
      console.error("❌ Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email || "unknown@example.com";
      const metadata = session.metadata || {};

      console.log("✅ Payment success for:", email);

      // Save booking to MariaDB (prevent duplicate slot)
      const [rows] = await pool.query(
        "SELECT id FROM tBookings WHERE date = ? AND time = ?",
        [metadata.date, metadata.time]
      );

      if ((rows as any[]).length === 0) {
        await pool.query(
          `INSERT INTO tBookings (fName, sName, email, phone, date, time, session, cancel_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
          [
            metadata.name || "Unknown",
            metadata.surname || "",
            email,
            metadata.number || "",
            metadata.date,
            metadata.time,
            metadata.session,
          ]
        );

        console.log("✅ Booking saved to MariaDB");
      } else {
        console.log("⚠ Slot already exists, skipping DB insert");
      }

      // Send emails
      await sendEmail(
        {
          to_email: email,
          name: metadata.name,
          number: metadata.number,
          date: metadata.date,
          time: metadata.time,
          session: metadata.session,
          subject: "Zen Healing – Booking Confirmation",
          cancel_url: `${process.env.CLIENT_URL}/cancel-booking`,
        },
        "user"
      );

      await sendEmail(
        {
          to_email: "info@zenhealing.co.uk",
          name: metadata.name,
          surname: metadata.surname,
          email: email,
          number: metadata.number,
          date: metadata.date,
          time: metadata.time,
          session: metadata.session,
          subject: "Zen Healing – New Booking Received",
        },
        "admin"
      );
    }

    res.json({ received: true });
  }
);

export default router;
