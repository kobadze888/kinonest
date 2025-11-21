// scripts/sync-daily.js
// 🎯 Daily Update: მხოლოდ ახალი და არარსებული ფილმების დამატება.
// იყენებს V45-ის ძლიერ ლოგიკას (Wikidata, Scraper, Kodik) ID-ების საპოვნელად.

import 'dotenv/config';
import { Pool } from 'pg';
import { slugify } from '../src/lib/utils.js';

const KINOBD_API_URL = 'https://kinobd.net/api/films';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OMDB_API_KEY = 'a2b07930'; 
const KODIK_TOKEN = 'b95c138cc28a8377412303d604251230';

// 📅 მხოლოდ ახალი წლები
const TARGET_YEARS = [2026, 2025, 2024]; 
// 📄 მხოლოდ პირველი 5 გვერდი (სადაც სიახლეებია)
const PAGES_TO_CHECK = 5; 

const countryMap = {
  "United States of America": "США", "United Kingdom": "Великобритания", "China": "Китай",
  "France": "Франция", "Germany": "Германия", "Japan": "Япония", "Spain": "Испания",
  "Italy": "Италия", "Canada": "Канада", "India": "Индия", "South Korea": "Южная Корея",
  "Australia": "Австралия", "Russia": "Россия", "Denmark": "Дания", "Qatar": "Катар",
  "Sweden": "Швеция"
};

if (!TMDB_API_KEY || !process.env.DATABASE_URL) {
  console.error("❌ .env ფაილი არასწორია.");
  process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Helper: Check if Exists ---
async function checkIfExists(client, tmdbId) {
    const res = await client.query('SELECT 1 FROM media WHERE tmdb_id = $1', [tmdbId]);
    return res.rowCount > 0;
}

// --- TMDB ---
async function getTmdbPopularMovies(year, page = 1) {
  try {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=ru-RU&sort_by=popularity.desc&primary_release_year=${year}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (e) { return []; }
}

async function getTmdbDetails(tmdbId) {
  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=external_ids,credits,videos,release_dates`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

function getTmdbRuRelease(tmdbData) {
    if (!tmdbData?.release_dates?.results) return null;
    const ruRelease = tmdbData.release_dates.results.find(r => r.iso_3166_1 === 'RU');
    if (ruRelease && ruRelease.release_dates.length > 0) {
        const date = ruRelease.release_dates.find(d => d.type === 3) || ruRelease.release_dates[0];
        return date.release_date ? date.release_date.split('T')[0] : null;
    }
    return null;
}

function getTmdbTrailerUrl(tmdbData) {
    if (!tmdbData || !tmdbData.videos || !tmdbData.videos.results) return null;
    const videos = tmdbData.videos.results;
    const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.iso_639_1 === 'ru')
                 || videos.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    return trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;
}

// --- Kodik API ---
async function fetchKpIdFromKodik(imdbId, title, year) {
    try {
        if (imdbId) {
            const url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&imdb_id=${imdbId}&types=film,serial`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const match = data.results[0];
                if (match.kinopoisk_id && match.kinopoisk_id !== 'null') return parseInt(match.kinopoisk_id);
            }
        }
        if (title) {
            const url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&title=${encodeURIComponent(title)}&types=film,serial`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const match = data.results.find(item => Math.abs(item.year - year) <= 1);
                if (match && match.kinopoisk_id && match.kinopoisk_id !== 'null') return parseInt(match.kinopoisk_id);
            }
        }
    } catch (e) { return null; }
    return null;
}

// --- Aggressive Scraper ---
async function fetchKpIdViaSearch(title, originalTitle, year) {
    const queries = [];
    if (title) {
        queries.push(`site:kinopoisk.ru/film/ ${title} ${year}`);
        queries.push(`${title} ${year} kinopoisk id`);
    }
    if (originalTitle && originalTitle !== title) {
        queries.push(`${originalTitle} ${year} kinopoisk id`);
    }

    for (const query of queries) {
        try {
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!res.ok) continue;
            const text = await res.text();
            let match = text.match(/kinopoisk\.ru\/film\/(\d+)/);
            if (match && match[1]) {
                const id = parseInt(match[1]);
                if (id !== 430) return id;
            }
            match = text.match(/(?:kp|id|kinopoisk)[:\s]+(\d{6,8})/i);
            if (match && match[1]) {
                const id = parseInt(match[1]);
                if (id !== 430) return id;
            }
        } catch (e) { continue; }
        await delay(1000);
    }
    return null;
}

// --- Wikidata ---
async function fetchKpIdFromWikidata(wikidataId) {
    if (!wikidataId) return null;
    try {
        const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const entity = data.entities[wikidataId];
        if (entity.claims && entity.claims.P2603) {
            return parseInt(entity.claims.P2603[0].mainsnak.datavalue.value);
        }
    } catch (e) { return null; }
    return null;
}

// --- Kinobd Search ---
async function findBestMatchInKinobd(imdbId, kpId, tmdbYear, titleRu, titleOriginal) {
    // Kinobd-ს ძებნა გაფუჭებულია, ამიტომ მხოლოდ ID-ს გადამოწმება შეგვიძლია
    // აქ უბრალოდ ვაბრუნებთ null-ს, რადგან მთავარ ლოგიკაში ID-ები უკვე გვაქვს
    return null; 
}

async function fetchOmdbData(imdbId) {
    if (!imdbId || !OMDB_API_KEY) return null;
    try {
        const res = await fetch(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}`);
        const data = await res.json();
        if (data.imdbRating && data.imdbRating !== "N/A") {
            return { rating: parseFloat(data.imdbRating), votes: parseInt((data.imdbVotes || "0").replace(/,/g, '')) };
        }
    } catch (e) { return null; }
    return null;
}

// --- Save ---
async function saveMovie(client, kinobdItem, tmdbItem, fallbackTrailer, omdbData, kpIdExternal) {
    const tmdb_id = tmdbItem.id;
    const title_ru = tmdbItem.title || 'No Title'; 
    const search_slug = slugify(title_ru);
    const release_year = tmdbItem.release_date ? parseInt(tmdbItem.release_date.split('-')[0]) : 2000;
    const rating_tmdb = tmdbItem.vote_average || 0;

    let rating_imdb = omdbData?.rating || 0;
    let rating_imdb_count = omdbData?.votes || 0;
    let rating_kp = 0; 
    let rating_kp_count = 0;

    let final_kp_id = kpIdExternal || null;

    const premiere_world = tmdbItem.release_date || null;
    const premiere_ru = getTmdbRuRelease(tmdbItem) || null;
    let countries = (tmdbItem.production_countries || []).map(c => countryMap[c.name] || c.name);
    const overview = tmdbItem.overview || '';
    
    let budget = tmdbItem.budget || 0;
    if (budget === 0 && tmdbItem.revenue > 0) budget = tmdbItem.revenue;

    const popularity = Math.round(tmdbItem.popularity || 0);
    const finalTrailerUrl = fallbackTrailer || null;

    const queryText = `
      INSERT INTO media (
        tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
        poster_path, backdrop_path, release_year, rating_tmdb,
        genres_ids, genres_names, updated_at, created_at,
        trailer_url, runtime, budget, countries, rating_kp, rating_imdb,
        imdb_id, rating_kp_count, rating_imdb_count,
        age_restriction, slogan, premiere_ru, premiere_world, popularity, search_slug
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(),
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
      ON CONFLICT (tmdb_id) DO NOTHING; 
    `;
    // 💡 DO NOTHING - რადგან მხოლოდ ახლები გვინდა, არსებულს არ ვანახლებთ

    const values = [
      tmdb_id, final_kp_id, 'movie', title_ru, tmdbItem.original_title, overview,
      tmdbItem.poster_path, tmdbItem.backdrop_path, release_year, rating_tmdb, 
      (tmdbItem.genres || []).map(g => g.id), (tmdbItem.genres || []).map(g => g.name),
      finalTrailerUrl, tmdbItem.runtime, budget, countries, rating_kp, rating_imdb,
      tmdbItem.imdb_id, 
      rating_kp_count, rating_imdb_count, null, tmdbItem.tagline, 
      premiere_ru, premiere_world, popularity, search_slug
    ];
  
    await client.query(queryText, values);

    if (tmdbItem.credits && tmdbItem.credits.cast) {
        const cast = tmdbItem.credits.cast.slice(0, 5);
        for (let i = 0; i < cast.length; i++) {
            const actor = cast[i];
            if (actor && actor.id) {
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
    }
    
    return { title: title_ru, kp_id: final_kp_id };
}

// --- Main ---
async function main() {
  console.log(`🚀 იწყება დღიური განახლება (მხოლოდ ახალი ფილმები)...`);
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  let addedCount = 0;
  let skippedCount = 0;

  for (const year of TARGET_YEARS) {
    console.log(`\n📅 წელი: ${year}`);
    
    for (let page = 1; page <= PAGES_TO_CHECK; page++) {
      console.log(`   📄 გვერდი ${page}...`);
      const tmdbList = await getTmdbPopularMovies(year, page);
      if (tmdbList.length === 0) break;

      for (const tmdbBase of tmdbList) {
        
        // 💡 1. SKIP: თუ უკვე არის, ვტოვებთ
        const exists = await checkIfExists(client, tmdbBase.id);
        if (exists) {
            skippedCount++;
            // console.log(`      Skipped: ${tmdbBase.title}`);
            continue; 
        }

        const tmdbFull = await getTmdbDetails(tmdbBase.id);
        if (!tmdbFull) continue;

        const imdbId = tmdbFull.external_ids?.imdb_id || tmdbFull.imdb_id;
        const wikidataId = tmdbFull.external_ids?.wikidata_id; 
        const tmdbTrailer = getTmdbTrailerUrl(tmdbFull);
        const tmdbYear = tmdbFull.release_date ? parseInt(tmdbFull.release_date.split('-')[0]) : year;

        let kpIdExternal = null;
        let source = "";

        // 1. Wikidata
        if (!kpIdExternal && wikidataId) {
             kpIdExternal = await fetchKpIdFromWikidata(wikidataId);
             if (kpIdExternal) source = "Wikidata";
        }

        // 2. Kodik API
        if (!kpIdExternal) {
            kpIdExternal = await fetchKpIdFromKodik(imdbId, tmdbFull.title, tmdbYear);
            if (kpIdExternal) source = "Kodik";
            if (!kpIdExternal && tmdbFull.original_title) {
                kpIdExternal = await fetchKpIdFromKodik(imdbId, tmdbFull.original_title, tmdbYear);
                if (kpIdExternal) source = "Kodik (EN)";
            }
        }

        // 3. Scraper
        if (!kpIdExternal) {
             let scrapedId = await fetchKpIdViaSearch(tmdbFull.title, tmdbFull.original_title, tmdbYear);
             if (scrapedId) {
                 kpIdExternal = scrapedId;
                 source = "Scraper";
             }
        }

        // OMDb
        let omdbData = null;
        if (imdbId) omdbData = await fetchOmdbData(imdbId);

        try {
            const res = await saveMovie(client, null, tmdbFull, tmdbTrailer, omdbData, kpIdExternal);
            
            let status = "";
            if (res.kp_id) status = `✅ [NEW: ${source}]`;
            else status = "⚠️ [Trailer Only]";

            console.log(`     ${status} ${res.title} (KP: ${res.kp_id || 'N/A'})`);
            addedCount++;

        } catch (e) { console.log(`     ❌ Error: ${e.message}`); }

        await delay(200); 
      }
    }
  }
  
  console.log(`\n🎉 დასრულდა!`);
  console.log(`   დაემატა ახალი: ${addedCount}`);
  console.log(`   გამოტოვა (უკვე იყო): ${skippedCount}`);
  
  client.release();
  await pool.end();
}

main();