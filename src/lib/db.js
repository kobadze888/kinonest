// src/lib/db.js (Final Connection Setup)
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // SSL-ის გაძლიერებული პარამეტრები Vercel/Supabase-სთვის
  ssl: {
    rejectUnauthorized: false, 
  },
  connectionTimeoutMillis: 20000, 
  idleTimeoutMillis: 30000,
});

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = {
  query,
  getClient
};