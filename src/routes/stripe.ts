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
  "30-min": { name: "30 min session", amount: 4500 },   // £45 for 4500, test for 1 
  "45-min": { name: "45 min session", amount: 6750 },   // £67.50
  "60-min": { name: "1 hr session", amount: 9000 },     // £90
};



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
      metadata: { name, surname, phone: number, date, time, session },
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    res.json({ id: checkoutSession.id });
  } catch (err: any) {
    console.error("❌ Error creating checkout session:", err);
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

    console.log("✅ Stripe event received:", event.id, event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email || "unknown@example.com";
      const metadata = session.metadata || {};

      console.log("🔍 Webhook Debug - Session data:", {
        email,
        metadata,
        payment_status: session.payment_status,
        amount_total: session.amount_total
      });

      // Map phone field from 'number' to 'phone' for consistency
      if (metadata.number && !metadata.phone) {
        metadata.phone = metadata.number;
      }

      // Validate required metadata
      if (!metadata.date || !metadata.time || !metadata.name || !metadata.session) {
        console.warn("⚠ Missing metadata in Stripe webhook, skipping DB insert");
        console.warn("⚠ Missing fields:", {
          date: !metadata.date,
          time: !metadata.time,
          name: !metadata.name,
          session: !metadata.session
        });
        return res.status(400).send("Missing booking metadata");
      }

      try {
        // Check for existing slot
        const result = await pool.query(
          "SELECT id FROM tBookings WHERE date = $1 AND time = $2",
          [metadata.date, metadata.time]
        );

        if ((result as any).rows.length === 0) {
          await pool.query(
            `INSERT INTO tBookings (fName, sName, email, phone, date, time, session, cancel_url)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              metadata.name,
              metadata.surname || "",
              email,
              metadata.phone || "",
              metadata.date,
              metadata.time,
              metadata.session,
              `${process.env.CLIENT_URL}/cancel-booking`
            ]
          );
          console.log("✅ Booking saved to MariaDB");
        } else {
          console.log("⚠ Slot already exists, skipping DB insert");
        }


        // Skip email sending in development (localhost) - let frontend handle it
        if (process.env.NODE_ENV === 'development' || process.env.CLIENT_URL?.includes('localhost')) {
          console.log("📧 Development mode: Skipping webhook email sending, frontend will handle it");
          return res.json({ received: true });
        }

        // Send emails in parallel
        console.log("📧 Starting to send confirmation emails...");
        const emailResults = await Promise.all([
          sendEmail(
            {
              to_email: email,
              name: metadata.name,
              surname: metadata.surname || "",
              phone: metadata.phone || "N/A",
              date: metadata.date,
              time: metadata.time,
              session: metadata.session,
              subject: "Zen Healing – Booking Confirmation",
              cancel_url: `${process.env.CLIENT_URL}/cancel-booking`,
            },
            "user"
          ),
          sendEmail(
            {
              to_email: "info@zenhealing.co.uk",
              name: metadata.name,
              surname: metadata.surname || "",
              email: email,
              phone: metadata.phone || "N/A",
              date: metadata.date,
              time: metadata.time,
              session: metadata.session,
              subject: "Zen Healing – New Booking Received",
            },
            "admin"
          ),
        ]);
        
        console.log("📧 Email sending results:", emailResults);
      } catch (dbErr: any) {
        console.error("❌ Error saving booking or sending emails:", dbErr);
        return res.status(500).send("Internal server error");
      }
    }

    res.json({ received: true });
  }
);

// Test email endpoint
router.post("/test-email", async (req, res) => {
  try {
    console.log("🧪 Testing email sending to both user and admin...");
    
    const testResults = await Promise.all([
      // Send to user
      sendEmail(
        {
          to_email: "mck0391@gmail.com",
          name: "Test User",
          surname: "Test Surname",
          phone: "1234567890",
          date: "2025-10-22",
          time: "10:00",
          session: "30-min",
          subject: "Zen Healing – Booking Confirmation",
          cancel_url: "https://example.com/cancel",
        },
        "user"
      ),
      // Send to admin
      sendEmail(
        {
          to_email: "info@zenhealing.co.uk",
          name: "Test User",
          surname: "Test Surname",
          email: "mck0391@gmail.com",
          phone: "1234567890",
          date: "2025-10-22",
          time: "10:00",
          session: "30-min",
          subject: "Zen Healing – New Booking Received",
        },
        "admin"
      ),
    ]);

    const allSuccessful = testResults.every(result => result === true);

    res.json({ 
      success: allSuccessful, 
      message: allSuccessful ? "Test emails sent successfully to both user and admin" : "Some test emails failed",
      results: {
        user_email: testResults[0],
        admin_email: testResults[1]
      }
    });
  } catch (err: any) {
    console.error("❌ Test email error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Trigger confirmation email for successful payment (for localhost development)
router.post("/trigger-confirmation-email", async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    console.log("🔄 Triggering confirmation email for session:", sessionId);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const email = session.customer_email || "unknown@example.com";
    const metadata = session.metadata || {};

    console.log("🔍 Retrieved session data:", {
      email,
      metadata,
      payment_status: session.payment_status
    });

    // Map phone field from 'number' to 'phone' for consistency
    if (metadata.number && !metadata.phone) {
      metadata.phone = metadata.number;
    }

    // Validate required metadata
    if (!metadata.date || !metadata.time || !metadata.name || !metadata.session) {
      console.warn("⚠ Missing metadata, cannot send email");
      return res.status(400).json({ error: "Missing booking metadata" });
    }


    // Send emails in parallel
    console.log("📧 Starting to send confirmation emails...");
    const emailResults = await Promise.all([
      sendEmail(
        {
          to_email: email,
          name: metadata.name,
          surname: metadata.surname || "",
          phone: metadata.phone || "N/A",
          date: metadata.date,
          time: metadata.time,
          session: metadata.session,
          subject: "Zen Healing – Booking Confirmation",
          cancel_url: `${process.env.CLIENT_URL}/cancel-booking`,
        },
        "user"
      ),
      sendEmail(
        {
          to_email: "info@zenhealing.co.uk",
          name: metadata.name,
          surname: metadata.surname || "",
          email: email,
          phone: metadata.phone || "N/A",
          date: metadata.date,
          time: metadata.time,
          session: metadata.session,
          subject: "Zen Healing – New Booking Received",
        },
        "admin"
      ),
    ]);
    
    console.log("📧 Email sending results:", emailResults);

    res.json({ 
      success: true, 
      message: "Confirmation emails sent successfully",
      results: {
        user_email: emailResults[0],
        admin_email: emailResults[1]
      }
    });
  } catch (err: any) {
    console.error("❌ Error triggering confirmation email:", err);
    res.status(500).json({ error: err.message });
  }
});

// Test webhook endpoint (for debugging)
router.get("/webhook-test", (req, res) => {
  res.json({ 
    message: "Webhook endpoint is accessible",
    timestamp: new Date().toISOString(),
    environment: {
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      GMAIL_APP_PASS: !!process.env.GMAIL_APP_PASS,
      GMAIL_USER: !!process.env.GMAIL_USER,
      CLIENT_URL: process.env.CLIENT_URL
    }
  });
});

export default router;
