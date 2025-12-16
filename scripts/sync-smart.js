// scripts/sync-smart.js
// საბოლოო ვერსია: Auto-Reconnect + Anti-Ban + Smart Save

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { slugify } from '../src/lib/utils.js';

const KINOBD_API_URL = 'https://kinobd.net/api/films';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const PROGRESS_FILE = path.join(process.cwd(), 'scripts', 'sync-progress.json');

// ლიმიტი გაზრდილია, რომ არ გაჩერდეს
const BATCH_PAGES_LIMIT = 20000; 
const TARGET_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

if (!TMDB_API_KEY || !process.env.DATABASE_URL) {
  console.error("❌ შეცდომა: .env ფაილი არასწორია.");
  process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- პროგრესის მართვა ---
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data).lastPage || 1;
    }
  } catch (e) {}
  return 1;
}

function saveProgress(page) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastPage: page }));
  } catch (e) { console.error("პროგრესის შენახვის შეცდომა:", e.message); }
}

// --- მონაცემების მოძიება ---
async function fetchTmdbDetails(tmdbId) {
  if (!tmdbId) return null;
  const endpoints = [`movie/${tmdbId}`, `tv/${tmdbId}`];
  for (const type of endpoints) {
    try {
      const url = `${TMDB_BASE_URL}/${type}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=credits`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        data.media_type = type.includes('movie') ? 'movie' : 'tv';
        return data;
      }
    } catch (e) {}
  }
  return null;
}

// --- ბაზაში ჩაწერა (უსაფრთხო კავშირით) ---
// 💡 ცვლილება: ვიღებთ არა client-ს, არამედ pool-ს და ვქმნით დროებით კავშირს
async function upsertMediaToDB(pool, kinobdItem, tmdbItem) {
  const tmdb_id = parseInt(kinobdItem.tmdb_id);
  const title_ru = kinobdItem.name_russian || tmdbItem.title || tmdbItem.name || 'Без названия';
  const search_slug = slugify(title_ru);
  const release_date = tmdbItem.release_date || tmdbItem.first_air_date || kinobdItem.premiere_world;
  const release_year = release_date ? parseInt(release_date.split('-')[0]) : parseInt(kinobdItem.year);

  const queryText = `
    INSERT INTO media (
      tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
      poster_path, backdrop_path, release_year, rating_tmdb,
      genres_ids, genres_names, updated_at, created_at,
      trailer_url, runtime, budget, countries, rating_kp, rating_imdb,
      kinobd_item_id, imdb_id, rating_kp_count, rating_imdb_count,
      age_restriction, slogan, premiere_ru, premiere_world, popularity, search_slug
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(),
      $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
    )
    ON CONFLICT (tmdb_id) DO UPDATE SET
      updated_at = NOW(), rating_tmdb = EXCLUDED.rating_tmdb, rating_kp = EXCLUDED.rating_kp,
      rating_imdb = EXCLUDED.rating_imdb, popularity = EXCLUDED.popularity;
  `;

  const values = [
    tmdb_id, kinobdItem.kinopoisk_id ? parseInt(kinobdItem.kinopoisk_id) : null, tmdbItem.media_type,
    title_ru, tmdbItem.original_title || tmdbItem.original_name, tmdbItem.overview || kinobdItem.description,
    tmdbItem.poster_path, tmdbItem.backdrop_path, release_year,
    tmdbItem.vote_average ? parseFloat(tmdbItem.vote_average.toFixed(1)) : 0.0,
    (tmdbItem.genres || []).map(g => g.id), (tmdbItem.genres || []).map(g => g.name), kinobdItem.trailer,
    tmdbItem.runtime || (tmdbItem.episode_run_time && tmdbItem.episode_run_time[0]), tmdbItem.budget || 0,
    (tmdbItem.production_countries || []).map(c => c.name), kinobdItem.rating_kp || 0, kinobdItem.rating_imdb || 0,
    parseInt(kinobdItem.id), kinobdItem.imdb_id, kinobdItem.rating_kp_count || 0, kinobdItem.rating_imdb_count || 0,
    kinobdItem.age_restriction, tmdbItem.tagline || kinobdItem.slogan, kinobdItem.premiere_ru,
    kinobdItem.premiere_world, kinobdItem.popular_rate || 0, search_slug
  ];

  // 💡 ვიღებთ კლიენტს მხოლოდ ამ ოპერაციისთვის და მერე ვუშვებთ
  const client = await pool.connect();
  try {
    await client.query(queryText, values);
    
    if (tmdbItem.credits && tmdbItem.credits.cast) {
        const cast = tmdbItem.credits.cast.slice(0, 5); 
        for (let i = 0; i < cast.length; i++) {
          const actor = cast[i];
          await client.query(`
            INSERT INTO actors (id, name, original_name, profile_path, popularity) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO NOTHING
          `, [actor.id, actor.name, actor.original_name, actor.profile_path, actor.popularity]);
  
          await client.query(`
            INSERT INTO media_actors (media_id, actor_id, character, "order") VALUES ($1, $2, $3, $4)
            ON CONFLICT (media_id, actor_id) DO NOTHING
          `, [tmdb_id, actor.id, actor.character, i]);
        }
    }
    return { success: true, title: title_ru, year: release_year };
  } catch (err) {
    console.error(`SQL Error:`, err.message);
    return { success: false };
  } finally {
    client.release(); // აუცილებელია კავშირის გაშვება!
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--reset')) {
    saveProgress(1);
    console.log("🔄 პროგრესი განულდა. ვიწყებთ გვერდი 1-დან.");
  }

  let startPage = loadProgress();
  const endPageLimit = startPage + BATCH_PAGES_LIMIT; 

  console.log(`🚀 იწყება სინქრონიზაცია (Anti-Crash რეჟიმი)...`);
  console.log(`📖 დაწყება: გვერდი ${startPage}`);

  // 💡 ვქმნით Pool-ს, მაგრამ არ ვიღებთ connect()-ს აქ.
  // Pool ავტომატურად მართავს კავშირებს.
  const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000, // 5 წამი კავშირისთვის
      idleTimeoutMillis: 10000 // 10 წამში გათიშოს უქმად მყოფი კავშირი
  });
  
  // Pool-ის შეცდომების დაჭერა, რომ პროცესი არ მოკვდეს
  pool.on('error', (err) => {
    console.error('⚠️ Unexpected error on idle client', err);
  });

  let currentPage = startPage;
  let totalAdded = 0;
  let hasMore = true;

  while (hasMore && currentPage < endPageLimit) {
    try {
      const response = await fetch(`${KINOBD_API_URL}?page=${currentPage}`);
      
      // 🛑 429 დაცვა
      if (response.status === 429) {
        console.log(`\n✋ ლიმიტი (429). ვისვენებთ 60 წამი...`);
        await delay(60000);
        continue; // თავიდან ვცადოთ იგივე გვერდი
      }

      if (!response.ok) {
        console.error(`\n❌ API Error on page ${currentPage}: ${response.status}`);
        currentPage++; continue;
      }
      
      const data = await response.json();
      const items = data.data || [];

      const freshMovies = items.filter(item => {
        const year = parseInt(item.year);
        return item.tmdb_id && TARGET_YEARS.includes(year);
      });

      if (freshMovies.length > 0) {
        console.log(`\n📄 გვერდი ${currentPage}: მუშავდება ${freshMovies.length} ფილმი...`);
        for (const item of freshMovies) {
          const tmdbItem = await fetchTmdbDetails(item.tmdb_id);
          if (tmdbItem) {
            // 💡 გადავცემთ pool-ს და არა client-ს
            const res = await upsertMediaToDB(pool, item, tmdbItem);
            if (res.success) {
               process.stdout.write(`✅`);
               totalAdded++;
            } else process.stdout.write(`❌`);
          }
          await delay(100); // პატარა პაუზა TMDB-სთვის
        }
      } else {
         process.stdout.write('.');
      }

      saveProgress(currentPage + 1);

      if (currentPage >= data.last_page) hasMore = false;
      currentPage++;
      await delay(500); // პაუზა გვერდებს შორის

    } catch (error) {
      console.error(`\n⚠️ შეცდომა:`, error.message);
      console.log(`  -> ველოდებით 5 წამს და ვაგრძელებთ...`);
      await delay(5000);
      // არ ვწყვეტთ მუშაობას, ვაგრძელებთ ციკლს
    }
  }

  console.log(`\n\n🏁 დასრულდა! სულ დაემატა: ${totalAdded} ახალი ფილმი.`);
  await pool.end();
}

main();