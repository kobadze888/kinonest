// src/lib/db.js (Reverted to ES Module + SSL fix)
import { Pool } from 'pg'; // <-- დავაბრუნეთ import-ზე

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, 
  },
  connectionTimeoutMillis: 20000, 
  idleTimeoutMillis: 30000,
});

// დავაბრუნეთ export-ზე
export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();