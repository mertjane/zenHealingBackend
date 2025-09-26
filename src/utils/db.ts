// utils/db.ts
import { Pool } from 'pg';
import dotenv from "dotenv";

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // required for Render
  } : undefined,
  // pg does not support acquireTimeout/timeout/reconnect
  connectionTimeoutMillis: 60000, // equivalent of connectTimeout
};

console.log("🔗 Database config:", {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port,
  ssl: !!dbConfig.ssl
});

// Create a Postgres connection pool
export const pool = new Pool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully");

    // Test with a simple query
    const result = await client.query("SELECT 1 as test");
    console.log("✅ Database query test successful:", result.rows);

    client.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    console.error("Check your database credentials and ensure the database is accessible");
  }
}

// Call test connection on startup
testConnection();
