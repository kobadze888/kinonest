// src/lib/db.js (CommonJS ფორმატი)
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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