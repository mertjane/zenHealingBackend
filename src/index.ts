import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import stripeRoutes from "./routes/stripe";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL?.replace(/\/$/, ""),  // remove trailing slash
  "https://031eb7e4.zenhealingweb.pages.dev"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow Postman / curl
    const cleanOrigin = origin.replace(/\/$/, ""); // remove trailing slash
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    } else {
      console.log("Blocked CORS request from origin:", origin);
      return callback(new Error("CORS not allowed"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));

app.use(express.json());

// Routes
app.use("/api/stripe", stripeRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
