// scripts/sync.js
// ვერსია 15: პრიორიტეტები გასწორებულია (Manual Flag > DB Memory)

import 'dotenv/config';
import { Pool } from 'pg';
import { slugify } from '../src/lib/utils.js';

const KINOBD_API_URL = 'https://kinobd.net/api/films';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

if (!TMDB_API_KEY || !process.env.DATABASE_URL) {
  console.error("❌ შეცდომა: შეამოწმეთ .env ფაილი.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// --- DB Functions ---

async function getStoredPage(client) {
  try {
    const res = await client.query("SELECT value FROM sync_settings WHERE key = 'last_processed_page'");
    if (res.rows.length > 0) return parseInt(res.rows[0].value);
    return null;
  } catch (error) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    return null;
  }
}

async function saveProcessedPage(client, page) {
  await client.query(`
    INSERT INTO sync_settings (key, value, updated_at)
    VALUES ('last_processed_page', $1, NOW())
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = NOW();
  `, [page.toString()]);
}

// --- API Functions ---

async function getTotalPagesAuto() {
  console.log("🔍 ვამოწმებთ API-ს გვერდების რაოდენობას...");
  try {
    const response = await fetch(`${KINOBD_API_URL}?page=1`);
    const data = await response.json();
    
    let total = 0;
    if (data.last_page) total = data.last_page;
    else if (data.meta && data.meta.last_page) total = data.meta.last_page;
    else if (data.pagination && data.pagination.total_pages) total = data.pagination.total_pages;
    else if (data.total_pages) total = data.total_pages;

    if (total > 0) return total;
    
    console.warn("⚠️ API-მ არ დააბრუნა რაოდენობა. საჭიროა ხელით მითითება (--total=XXXX).");
    process.exit(1);
  } catch (error) {
    console.error("❌ შეცდომა:", error.message);
    process.exit(1);
  }
}

async function fetchKinobdPage(page) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${KINOBD_API_URL}?page=${page}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.data || []; 
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`  ❌ ვერ ჩამოიტვირთა გვერდი ${page}:`, error.message);
    return null;
  }
}

async function fetchTmdbDetails(tmdbId) {
  if (!tmdbId) return null;
  const appendToResponse = 'append_to_response=credits';
  const urls = [
    `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&${appendToResponse}`,
    `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&${appendToResponse}`
  ];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); 
  try {
    for (const url of urls) {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        clearTimeout(timeoutId);
        const data = await res.json();
        data.media_type = url.includes('/movie/') ? 'movie' : 'tv';
        return data;
      }
    }
    clearTimeout(timeoutId);
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    return null;
  }
}

async function upsertMediaToDB(client, kinobdItem, tmdbItem) {
  const tmdb_id = parseInt(kinobdItem.tmdb_id);
  const title_ru = kinobdItem.name_russian || tmdbItem.title || tmdbItem.name || 'Без названия';
  const search_slug = slugify(title_ru); 

  const release_date = tmdbItem.release_date || tmdbItem.first_air_date || kinobdItem.premiere_world;
  const release_year = release_date ? parseInt(release_date.split('-')[0]) : (kinobdItem.year ? parseInt(kinobdItem.year) : null);
  const runtime = tmdbItem.runtime || (tmdbItem.episode_run_time && tmdbItem.episode_run_time[0]) || kinobdItem.time_minutes || null;
  const countries = (tmdbItem.production_countries || []).map(c => c.name);

  const mediaQuery = `
    INSERT INTO media (
      tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
      poster_path, backdrop_path, release_year, rating_tmdb,
      genres_ids, genres_names, updated_at,
      trailer_url, runtime, budget, countries, rating_kp, rating_imdb,
      kinobd_item_id, imdb_id, rating_kp_count, rating_imdb_count,
      age_restriction, slogan, premiere_ru, premiere_world, popularity,
      search_slug
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(),
      $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
    )
    ON CONFLICT (tmdb_id) DO UPDATE SET
      kinopoisk_id = EXCLUDED.kinopoisk_id,
      type = EXCLUDED.type,
      title_ru = EXCLUDED.title_ru,
      overview = EXCLUDED.overview,
      poster_path = EXCLUDED.poster_path,
      rating_tmdb = EXCLUDED.rating_tmdb,
      updated_at = NOW(),
      search_slug = EXCLUDED.search_slug,
      kinobd_item_id = EXCLUDED.kinobd_item_id;
  `;

  const mediaValues = [
    tmdb_id, 
    kinobdItem.kinopoisk_id ? parseInt(kinobdItem.kinopoisk_id) : null, 
    tmdbItem.media_type,
    title_ru,
    tmdbItem.original_title || tmdbItem.original_name,
    tmdbItem.overview || kinobdItem.description,
    tmdbItem.poster_path,
    tmdbItem.backdrop_path,
    release_year,
    tmdbItem.vote_average ? parseFloat(tmdbItem.vote_average.toFixed(1)) : 0.0,
    (tmdbItem.genres || []).map(g => g.id),
    (tmdbItem.genres || []).map(g => g.name),
    kinobdItem.trailer,
    runtime,
    tmdbItem.budget > 0 ? tmdbItem.budget : null,
    countries,
    kinobdItem.rating_kp ? parseFloat(kinobdItem.rating_kp.toFixed(1)) : 0.0,
    kinobdItem.rating_imdb ? parseFloat(kinobdItem.rating_imdb.toFixed(1)) : 0.0,
    parseInt(kinobdItem.id),
    kinobdItem.imdb_id,
    kinobdItem.rating_kp_count ? parseInt(kinobdItem.rating_kp_count) : 0,
    kinobdItem.rating_imdb_count ? parseInt(kinobdItem.rating_imdb_count) : 0,
    kinobdItem.age_restriction || null,
    tmdbItem.tagline || kinobdItem.slogan,
    kinobdItem.premiere_ru || null,
    kinobdItem.premiere_world || null,
    kinobdItem.popular_rate ? parseInt(kinobdItem.popular_rate) : 0,
    search_slug 
  ];

  try {
    await client.query(mediaQuery, mediaValues);
    if (tmdbItem.credits && tmdbItem.credits.cast) {
      const cast = tmdbItem.credits.cast.slice(0, 10);
      for (let i = 0; i < cast.length; i++) {
        const actor = cast[i];
        await client.query(`
          INSERT INTO actors (id, name, original_name, profile_path, popularity)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [actor.id, actor.name, actor.original_name, actor.profile_path, actor.popularity]);

        await client.query(`
          INSERT INTO media_actors (media_id, actor_id, character, "order")
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (media_id, actor_id) DO NOTHING
        `, [tmdb_id, actor.id, actor.character, i]);
      }
    }
    return { success: true, title: title_ru };
  } catch (error) {
    console.error(`  - SQL შეცდომა (ID: ${tmdb_id}): ${error.message}`);
    return { success: false };
  }
}

// --- Main Logic (UPDATED) ---

async function main() {
  const client = await pool.connect();
  console.log('✅ დაკავშირებულია ბაზასთან.');

  const args = process.argv.slice(2);
  const manualTotalArg = args.find(arg => arg.startsWith('--total='));

  let startPage;

  // 1. პრიორიტეტი 1: ხელით მითითება (გადააწერს ბაზას)
  if (manualTotalArg) {
    startPage = parseInt(manualTotalArg.split('=')[1]);
    console.log(`🛑 მითითებულია ხელით (--total). ძველი მეხსიერება იშლება.`);
    console.log(`🚀 ვიწყებთ გვერდიდან: ${startPage}`);
    // აუცილებელია ეგრევე შენახვა, რომ თუ გაჩერდა, აქედან გააგრძელოს და არა 39000-დან
    await saveProcessedPage(client, startPage);
  } 
  // 2. პრიორიტეტი 2: ბაზაში შენახული პოზიცია
  else {
    startPage = await getStoredPage(client);
    if (startPage) {
      console.log(`🔄 ვაგრძელებთ შენახული პოზიციიდან: გვერდი ${startPage}`);
    }
    // 3. პრიორიტეტი 3: ავტომატური დათვლა (სუფთა ფურცლიდან)
    else {
      console.log('🆕 შენახული პოზიცია არ ჩანს. ვითვლით ავტომატურად...');
      startPage = await getTotalPagesAuto();
      console.log(`found total pages: ${startPage}`);
    }
  }

  // ციკლი
  for (let currentPage = startPage; currentPage >= 1; currentPage--) {
    console.log(`\n--- მუშავდება გვერდი: ${currentPage} ---`);
    
    const movies = await fetchKinobdPage(currentPage);
    
    if (!movies) {
      console.log('⚠️ კავშირის შეცდომა. თავიდან ვცდით 5 წამში...');
      currentPage++; 
      await delay(5000);
      continue;
    }

    if (movies.length === 0) {
      console.log('⚠️ გვერდი ცარიელია. გადავდივართ შემდეგზე.');
    } else {
        let batchSuccess = 0;
        for (const item of movies) {
          if (!item.tmdb_id) continue;
          const tmdbItem = await fetchTmdbDetails(item.tmdb_id);
          if (!tmdbItem) { await delay(100); continue; }
          const { success, title } = await upsertMediaToDB(client, item, tmdbItem);
          if (success) {
            console.log(`   OK: "${title}"`);
            batchSuccess++;
          }
          await delay(100); 
        }
        console.log(`✅ გვერდი ${currentPage} დასრულდა. (დაემატა: ${batchSuccess})`);
    }
    
    // ვინახავთ შემდეგ გვერდს
    const nextPageToProcess = currentPage - 1;
    if (nextPageToProcess > 0) {
        await saveProcessedPage(client, nextPageToProcess);
    } else {
        console.log("🏁 სინქრონიზაცია დასრულდა!");
        await client.query("DELETE FROM sync_settings WHERE key = 'last_processed_page'");
    }
  }

  client.release();
  await pool.end();
}

main().catch(err => console.error(err));