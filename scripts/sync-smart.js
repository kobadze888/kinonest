import 'dotenv/config';
import { Pool } from 'pg';
import { slugify } from '../src/lib/utils.js';

const KINOBD_API_URL = 'https://kinobd.net/api/films';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// ლიმიტი: მხოლოდ 10 გვერდი თითო გაშვებაზე (დაახლ. 100-200 ფილმი)
const BATCH_PAGES_LIMIT = 10; 
const TARGET_YEARS = [2024, 2025]; // მხოლოდ ახალი წლები

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 5000 
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTmdbDetails(tmdbId) {
  if (!tmdbId) return null;
  const endpoints = [`movie/${tmdbId}`, `tv/${tmdbId}`];
  for (const type of endpoints) {
    try {
      const res = await fetch(`${TMDB_BASE_URL}/${type}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=credits`);
      if (res.ok) {
        const data = await res.json();
        data.media_type = type.includes('movie') ? 'movie' : 'tv';
        return data;
      }
    } catch (e) {}
  }
  return null;
}

async function upsertMediaToDB(kinobdItem, tmdbItem) {
  const tmdb_id = parseInt(kinobdItem.tmdb_id);
  const title_ru = kinobdItem.name_russian || tmdbItem.title || 'Без названия';
  const search_slug = slugify(title_ru);
  const release_year = parseInt(kinobdItem.year) || parseInt((tmdbItem.release_date || '').split('-')[0]) || 0;

  // UPSERT ლოგიკა: თუ არსებობს, მხოლოდ განაახლებს
  const queryText = `
    INSERT INTO media (
      tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
      poster_path, backdrop_path, release_year, rating_tmdb,
      genres_ids, genres_names, updated_at, created_at,
      trailer_url, rating_kp, rating_imdb,
      popularity, search_slug
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(),
      $13, $14, $15, $16, $17
    )
    ON CONFLICT (tmdb_id) DO UPDATE SET
      updated_at = NOW(), 
      popularity = EXCLUDED.popularity, 
      rating_kp = EXCLUDED.rating_kp,
      rating_imdb = EXCLUDED.rating_imdb;
  `;

  const values = [
    tmdb_id, kinobdItem.kinopoisk_id ? parseInt(kinobdItem.kinopoisk_id) : null, tmdbItem.media_type,
    title_ru, tmdbItem.original_title, tmdbItem.overview,
    tmdbItem.poster_path, tmdbItem.backdrop_path, release_year,
    tmdbItem.vote_average || 0,
    (tmdbItem.genres || []).map(g => g.id), (tmdbItem.genres || []).map(g => g.name), kinobdItem.trailer,
    kinobdItem.rating_kp || 0, kinobdItem.rating_imdb || 0,
    kinobdItem.popular_rate || 0, search_slug
  ];

  try {
    await pool.query(queryText, values);
    process.stdout.write('✅');
  } catch (err) {
    process.stdout.write('❌');
  }
}

async function main() {
  console.log(`🚀 დაწყება: ბოლო ${BATCH_PAGES_LIMIT} გვერდის სინქრონიზაცია...`);
  
  for (let page = 1; page <= BATCH_PAGES_LIMIT; page++) {
    try {
      const response = await fetch(`${KINOBD_API_URL}?page=${page}`);
      if (!response.ok) break;
      
      const data = await response.json();
      const items = (data.data || []).filter(item => TARGET_YEARS.includes(parseInt(item.year)));

      if (items.length > 0) {
        console.log(`\n📄 გვერდი ${page}: ${items.length} ფილმი`);
        for (const item of items) {
            const tmdb = await fetchTmdbDetails(item.tmdb_id);
            if (tmdb) await upsertMediaToDB(item, tmdb);
            await delay(200); // 200მს პაუზა თითო ფილმზე
        }
      }
      await delay(1000); // 1 წამი პაუზა გვერდებს შორის
    } catch (e) {
      console.error(e);
    }
  }
  
  console.log("\n🏁 დასრულდა.");
  await pool.end();
}

main();