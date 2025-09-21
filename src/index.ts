import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import stripeRoutes from "./routes/stripe";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Handle both www and non-www versions
const baseUrl = process.env.CLIENT_URL?.replace(/\/$/, ""); // remove trailing slash
const allowedOrigins = [
  baseUrl,
  baseUrl?.replace('https://www.', 'https://'), // non-www version
  baseUrl?.replace('https://', 'https://www.'), // www version
  "https://zenhealing.co.uk",
  "https://www.zenhealing.co.uk", 
  "https://2073dd6e.zenhealingweb.pages.dev"
].filter(Boolean); // Remove any undefined values

// Remove duplicates
const uniqueOrigins = [...new Set(allowedOrigins)];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Stripe webhooks, curl, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    const cleanOrigin = origin.replace(/\/$/, ""); // remove trailing slash
    
    // Check if origin is in allowed list
    if (uniqueOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }
    
    // Allow Stripe domains for mobile redirects
    if (cleanOrigin.includes('stripe.com') || cleanOrigin.includes('js.stripe.com')) {
      return callback(null, true);
    }
    
    // Allow mobile app schemes and capacitor/cordova
    if (cleanOrigin.startsWith('capacitor://') ||
        cleanOrigin.startsWith('ionic://') ||
        cleanOrigin.startsWith('file://') ||
        cleanOrigin.startsWith('http://localhost') ||
        cleanOrigin.includes('capacitor') ||
        cleanOrigin === 'null') {
      return callback(null, true);
    }
    
    // For development: allow localhost on any port
    if (process.env.NODE_ENV !== 'production' && cleanOrigin.includes('localhost')) {
      return callback(null, true);
    }
    
    console.log("Blocked CORS request from origin:", origin);
    console.log("Allowed origins:", uniqueOrigins);
    
    // Instead of throwing an error, return false to reject the request gracefully
    return callback(null, false);
  },
  methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Handle preflight requests manually (safer than app.options('*'))
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/stripe", stripeRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});



// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed origins:`, uniqueOrigins);
});