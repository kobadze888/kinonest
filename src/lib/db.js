import { Pool } from 'pg';

const globalForPool = globalThis;

// ვქმნით პულს მხოლოდ თუ არ არსებობს
if (!globalForPool.pgPool) {
  globalForPool.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5, // 5 კავშირი სავსებით საკმარისია ISR-ისთვის
    connectionTimeoutMillis: 10000, // 10 წამი ლოდინი
    idleTimeoutMillis: 10000, // 10 წამში გათიშოს უქმად მყოფი
  });
}

const pool = globalForPool.pgPool;

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();