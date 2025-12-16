import { Pool, types } from 'pg';

// აიძულებს ბაზას ტექსტური ტიპები (VARCHAR, TEXT) სწორად დააბრუნოს
types.setTypeParser(1043, (val) => val); // VARCHAR
types.setTypeParser(25, (val) => val);   // TEXT

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ყოველი კავშირისას ბაზას ვეუბნებით, რომ UTF8 გვინდა
pool.on('connect', async (client) => {
  await client.query('SET CLIENT_ENCODING TO "UTF8"');
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

