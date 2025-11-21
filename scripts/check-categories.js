// scripts/check-categories.js
import 'dotenv/config';
import { Pool } from 'pg';

async function checkCategories() {
  console.log('დაკავშირება ბაზასთან (Neon)...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('\n📊 --- მონაცემების შემოწმება კატეგორიების მიხედვით ---');

    // 1. სულ ჩანაწერები
    const total = await client.query(`SELECT COUNT(*) FROM media`);
    console.log(`📦 სულ მედია ბაზაში: ${total.rows[0].count}`);

    // 2. Hero Slider (მოთხოვნა: რეიტინგი > 7 და აქვს ფონი)
    const hero = await client.query(`
      SELECT COUNT(*) FROM media 
      WHERE type = 'movie' AND backdrop_path IS NOT NULL AND rating_tmdb > 7.0
    `);
    console.log(`🌟 Hero Slider (Rating > 7.0): ${hero.rows[0].count}`);

    // 3. Now Playing (მოთხოვნა: 2024 წელი და ზევით)
    const nowPlaying = await client.query(`
      SELECT COUNT(*) FROM media 
      WHERE type = 'movie' AND release_year >= 2024
    `);
    console.log(`🎬 Now Playing (2024+): ${nowPlaying.rows[0].count}`);

    // 4. ახალი ფილმები (ზოგადი)
    const newMovies = await client.query(`
      SELECT COUNT(*) FROM media WHERE type = 'movie'
    `);
    console.log(`🆕 New Movies (All): ${newMovies.rows[0].count}`);

    // 5. სერიალები
    const tv = await client.query(`SELECT COUNT(*) FROM media WHERE type = 'tv'`);
    console.log(`📺 TV Shows: ${tv.rows[0].count}`);

    // 6. საშინელებათა (Horror)
    const horror = await client.query(`
      SELECT COUNT(*) FROM media 
      WHERE type = 'movie' AND genres_names && ARRAY['ужасы', 'Horror']
    `);
    console.log(`👻 Horror Movies: ${horror.rows[0].count}`);

    // 7. კომედიები
    const comedy = await client.query(`
      SELECT COUNT(*) FROM media 
      WHERE type = 'movie' AND genres_names && ARRAY['комедия', 'Comedy']
    `);
    console.log(`😂 Comedy Movies: ${comedy.rows[0].count}`);

    // 8. მსახიობები
    const actors = await client.query(`SELECT COUNT(*) FROM actors`);
    console.log(`🎭 Actors: ${actors.rows[0].count}`);

    console.log('-------------------------------------------');

  } catch (e) {
    console.error('❌ შეცდომა:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCategories();