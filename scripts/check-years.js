// scripts/check-years.js
import 'dotenv/config';
import { Pool } from 'pg';

async function checkYears() {
  console.log('დაკავშირება ბაზასთან...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('\n📊 --- ფილმების სტატისტიკა წლების მიხედვით (TOP 30) ---');

    const res = await client.query(`
      SELECT release_year, COUNT(*) as count 
      FROM media 
      WHERE type = 'movie' AND release_year IS NOT NULL
      GROUP BY release_year 
      ORDER BY release_year DESC 
      LIMIT 30
    `);

    // ლამაზად გამოვიტანოთ ცხრილის სახით
    console.table(res.rows);

  } catch (e) {
    console.error('შეცდომა:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkYears();