// utils/db.ts
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Database configuration with better error handling
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "3306"),
  // Add these for better connection handling
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  // SSL configuration for cloud databases
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
};

console.log("🔗 Database config:", {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port,
  ssl: !!dbConfig.ssl
});

export const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connected successfully");
    
    // Test with a simple query
    const [rows] = await connection.execute("SELECT 1 as test");
    console.log("✅ Database query test successful:", rows);
    
    connection.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    console.error("Check your database credentials and ensure the database is accessible");
  }
}

// Call test connection on startup
testConnection();