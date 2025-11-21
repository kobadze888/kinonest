// scripts/sync-by-imdb.js
// ვერსია: V50-Modified (ვიზუალიზაცია დაბრუნებულია)

import 'dotenv/config';
import { Pool } from 'pg';
import { slugify } from '../src/lib/utils.js';

const KINOBD_API_URL = 'https://kinobd.net/api/films';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// --- კონფიგურაცია ---
const START_YEAR = 2025;
const END_YEAR = 2020;
const START_PAGE_PER_YEAR = 11; // ვიწყებთ მე-11 გვერდიდან

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

if (!TMDB_API_KEY || !process.env.DATABASE_URL) {
  console.error("❌ შეცდომა: შეამოწმეთ .env ფაილი.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// --- დამხმარე ფუნქციები ---

async function fetchKinobdByYear(year, page) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `${KINOBD_API_URL}?year=${year}&page=${page}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.data || []; 
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`  ❌ შეცდომა (წელი ${year}, გვერდი ${page}):`, error.message);
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

// --- მთავარი ფუნქცია ---

async function main() {
  const client = await pool.connect();
  console.log('✅ დაკავშირებულია ბაზასთან.');
  console.log(`🚀 იწყება სინქრონიზაცია: წლები ${START_YEAR}-${END_YEAR}, გვერდი ${START_PAGE_PER_YEAR}-დან ბოლომდე.`);

  for (let year = START_YEAR; year >= END_YEAR; year--) {
    console.log(`\n📅 მუშავდება წელი: ${year}`);
    
    let page = START_PAGE_PER_YEAR;
    let keepFetching = true;

    while (keepFetching) {
      console.log(`  📄 გვერდი ${page} იტვირთება...`);
      
      const movies = await fetchKinobdByYear(year, page);

      if (!movies) {
        console.log('  ⚠️ კავშირის ხარვეზი. 5 წამი პაუზა და თავიდან ვცდით...');
        await delay(5000);
        continue; 
      }

      if (movies.length === 0) {
        console.log(`  🏁 წელი ${year} დასრულდა (მეტი გვერდი აღარაა).`);
        keepFetching = false; 
      } else {
        let batchSuccess = 0;
        for (let i = 0; i < movies.length; i++) {
          const item = movies[i];
          if (!item.tmdb_id) continue;
          
          const tmdbItem = await fetchTmdbDetails(item.tmdb_id);
          if (!tmdbItem) { await delay(100); continue; }

          const { success, title } = await upsertMediaToDB(client, item, tmdbItem);
          if (success) {
            // 👇 აი აქ დავაბრუნე სათითაო ლოგი
            console.log(`     ✅ (${i + 1}/${movies.length}) დაემატა: "${title}"`);
            batchSuccess++;
          }
          await delay(100);
        }
        console.log(`  ✨ გვერდი ${page} დასრულდა. სულ: ${batchSuccess}`);
        page++; 
      }
    }
  }

  console.log("\n🎉 სრული სინქრონიზაცია დასრულდა!");
  client.release();
  await pool.end();
}

main().catch(err => console.error(err));