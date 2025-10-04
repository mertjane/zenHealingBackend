import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import stripeRoutes from "./routes/stripe";
import bookingsRouter from "./routes/bookings";
import cancelRouter from "./routes/cancel";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Fixed
const allowedOrigins = [
  "https://zen-healing.co.uk",
  "https://www.zen-healing.co.uk",
  "https://zenhealing.co.uk", 
  "https://www.zenhealing.co.uk",
  "https://95ee3ff0.zenhealingweb.pages.dev"
];

// For development
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173');
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Stripe webhooks, curl, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
   
    const cleanOrigin = origin.replace(/\/$/, ""); // remove trailing slash
   
    console.log("🔍 CORS Check - Origin:", cleanOrigin);
    console.log("🔍 Allowed origins:", allowedOrigins);
   
    // Check if origin is in allowed list
    if (allowedOrigins.includes(cleanOrigin)) {
      console.log("✅ CORS allowed for:", cleanOrigin);
      return callback(null, true);
    }
   
    // Allow Stripe domains
    if (cleanOrigin.includes('stripe.com') || cleanOrigin.includes('js.stripe.com')) {
      return callback(null, true);
    }
   
    // For development: allow localhost on any port
    if (process.env.NODE_ENV !== 'production' && (
        cleanOrigin.includes('localhost') || 
        cleanOrigin.includes('127.0.0.1') ||
        cleanOrigin.startsWith('http://localhost')
    )) {
      console.log("✅ CORS allowed for development:", cleanOrigin);
      return callback(null, true);
    }
   
    console.log("❌ Blocked CORS request from origin:", origin);
    return callback(new Error(`CORS policy violation. Origin ${origin} not allowed`), false);
  },
  methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Additional middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log("Headers:", req.headers.origin);
  next();
});

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Zen Healing API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin
  });
});

// Routes
app.use("/api/stripe", stripeRoutes);
app.use("/api/bookings", bookingsRouter);
app.use("/api/cancel-booking", cancelRouter);

// 404 handler
app.use((req, res) => {
  console.log("404 - Route not found:", req.method, req.originalUrl);
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Allowed origins:`, allowedOrigins);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});