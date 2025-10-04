/* // utils/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 60000,
});

export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL connected");
    const result = await client.query("SELECT 1 as test");
    console.log("✅ Query result:", result.rows);
    client.release();
  } catch (err) {
    console.error("❌ DB connection failed:", err);
  }
}

testConnection();
 */


// utils/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const isRender = process.env.DATABASE_URL?.includes("render.com");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRender ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 60000,
});

export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL connected");
    const result = await client.query("SELECT 1 as test");
    console.log("✅ Query result:", result.rows);
    client.release();
  } catch (err) {
    console.error("❌ DB connection failed:", err);
  }
}

testConnection();
