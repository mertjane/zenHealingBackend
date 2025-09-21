import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import stripeRoutes from "./routes/stripe";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,       // must exactly match your Cloudflare URL
  methods: ["GET", "POST"],
  credentials: true           // if you send cookies, optional otherwise
}));
app.use(express.json());

// Routes
app.use("/api/stripe", stripeRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
