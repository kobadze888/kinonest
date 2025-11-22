// scripts/sync-deep-smart.js
// 🎯 V74 (Movies Fixed): Fixed missing Kodik function + Strict Russian Filter

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { slugify } from '../src/lib/utils.js';

const KINOBD_API_URL = 'https://kinobd.net/api/films';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OMDB_API_KEY = 'b0f7e52c'; 
const KODIK_TOKEN = 'b95c138cc28a8377412303d604251230';

const PROGRESS_FILE = path.join(process.cwd(), 'scripts', 'sync-deep-progress.json');

const TARGET_YEARS = [2025, 2024, 2023, 2022, 2021, 2020];
const START_PAGE_DEFAULT = 1;  
const TMDB_MAX_PAGES = 500;    
const SEARCH_MAX_PAGES = 3; 

const countryMap = {
  "United States of America": "США", "United Kingdom": "Великобритания", "China": "Китай",
  "France": "Франция", "Germany": "Германия", "Japan": "Япония", "Spain": "Испания",
  "Italy": "Италия", "Canada": "Канада", "India": "Индия", "South Korea": "Южная Корея",
  "Australia": "Австралия", "Russia": "Россия", "Denmark": "Дания", "Qatar": "Катар",
  "Sweden": "Швеция", "Turkey": "Турция"
};

if (!TMDB_API_KEY || !process.env.DATABASE_URL) {
  console.error("❌ .env ფაილი არასწორია.");
  process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function loadProgress() {
    try { if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch (e) {}
    return null; 
}
function saveProgress(year, page) {
    try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ year, page })); } catch (e) {}
}

// --- Helper Functions ---

async function fetchRatingsFromKpXML(kpId) {
    if (!kpId) return null;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`https://rating.kinopoisk.ru/${kpId}.xml`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const text = await res.text();
        const kpMatch = text.match(/<kp_rating[^>]*>([\d.]+)<\/kp_rating>/);
        const imdbMatch = text.match(/<imdb_rating[^>]*>([\d.]+)<\/imdb_rating>/);
        return {
            kp: kpMatch ? parseFloat(kpMatch[1]) : 0,
            imdb: imdbMatch ? parseFloat(imdbMatch[1]) : 0
        };
    } catch (e) { return null; }
}

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
    if (!tmdbId) return null;
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=external_ids,credits,videos,release_dates`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

function getTmdbTrailerUrl(tmdbData) {
    if (!tmdbData || !tmdbData.videos || !tmdbData.videos.results) return null;
    const videos = tmdbData.videos.results;
    let video = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    if (!video) video = videos.find(v => v.site === 'YouTube' && v.type === 'Teaser');
    return video ? `https://www.youtube.com/embed/${video.key}` : null;
}

// 💡 Kodik (ეს გამომრჩა წინა ჯერზე)
async function fetchKpIdFromKodik(imdbId, title, year) {
    try {
        if (imdbId) {
            const url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&imdb_id=${imdbId}&types=film,movie`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const match = data.results[0];
                if (match.kinopoisk_id && match.kinopoisk_id !== 'null') return parseInt(match.kinopoisk_id);
            }
        }
        if (title) {
            const url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&title=${encodeURIComponent(title)}&types=film,movie`;
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

// 💡 KinoBD Direct Search (Smart Split)
async function findIdInKinoBD(titleRu, year) {
    let id = await searchKinoBDApi(titleRu, year);
    if (id) return id;

    if (titleRu.includes(':')) {
        const shortTitle = titleRu.split(':')[0].trim();
        if (shortTitle.length > 2) {
            id = await searchKinoBDApi(shortTitle, year);
            if (id) return id;
        }
    }
    return null;
}

async function searchKinoBDApi(query, year) {
    try {
        const params = new URLSearchParams({ title: query });
        const url = `${KINOBD_API_URL}?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            const match = data.data.find(item => {
                const itemYear = parseInt(item.year);
                const yearMatch = !year || Math.abs(itemYear - year) <= 1; 
                return yearMatch;
            });
            if (match && match.kinopoisk_id) return parseInt(match.kinopoisk_id);
        }
    } catch (e) { }
    return null;
}

// 💡 Scraper (Only if Russian)
async function fetchKpIdViaSearch(title, originalTitle, year) {
    if (!title || !/[а-яА-ЯёЁ]/.test(title)) return null;

    const queries = [];
    queries.push(`site:kinopoisk.ru/film/ ${title} ${year}`);
    queries.push(`${title} ${year} фильм kinopoisk id`);

    for (const query of queries) {
        try {
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!res.ok) continue;
            const text = await res.text();
            
            let match = text.match(/kinopoisk\.ru\/film\/(\d+)/);
            if (match && match[1]) return parseInt(match[1]);
            
            match = text.match(/(?:kp|id|kinopoisk)[:\s]+(\d{6,8})/i);
            if (match && match[1]) return parseInt(match[1]);
        } catch (e) { continue; }
        await delay(1500);
    }
    return null;
}

async function fetchKpIdFromWikidata(wikidataId) {
    if (!wikidataId) return null;
    try {
        const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const entity = data.entities[wikidataId];
        if (entity.claims && entity.claims.P2603) return parseInt(entity.claims.P2603[0].mainsnak.datavalue.value);
    } catch (e) { return null; }
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

// --- Save (Movie) ---
async function saveMovie(client, kinobdItem, tmdbItem, fallbackTrailer, omdbData, kpIdExternal, xmlRatings) {
    if (!tmdbItem || !tmdbItem.id) throw new Error("TMDB Item Invalid");

    const tmdb_id = tmdbItem.id;
    const title_ru = tmdbItem.title || 'No Title'; 
    const search_slug = slugify(title_ru);
    const release_year = tmdbItem.release_date ? parseInt(tmdbItem.release_date.split('-')[0]) : 2000;
    const rating_tmdb = tmdbItem.vote_average || 0;

    let rating_imdb = xmlRatings?.imdb || omdbData?.rating || (kinobdItem && parseFloat(kinobdItem.rating_imdb)) || 0;
    let rating_imdb_count = xmlRatings?.imdb_count || omdbData?.votes || (kinobdItem && parseInt(kinobdItem.rating_imdb_count)) || 0;
    let rating_kp = xmlRatings?.kp || (kinobdItem && parseFloat(kinobdItem.rating_kp)) || 0;
    let rating_kp_count = xmlRatings?.kp_count || (kinobdItem && parseInt(kinobdItem.rating_kp_count)) || 0;

    let final_kp_id = null;
    if (kinobdItem && kinobdItem.kinopoisk_id) {
        const parsed = parseInt(kinobdItem.kinopoisk_id);
        if (!isNaN(parsed)) final_kp_id = parsed;
    }
    if (!final_kp_id && kpIdExternal) final_kp_id = kpIdExternal;

    const premiere_world = tmdbItem.release_date || null;
    const premiere_ru = premiere_world; 
    let countries = (tmdbItem.production_countries || []).map(c => countryMap[c.name] || c.name);
    const overview = tmdbItem.overview || '';
    let budget = tmdbItem.budget || 0; 
    let runtime = tmdbItem.runtime || null;
    const popularity = Math.round(tmdbItem.popularity || 0);

    let finalTrailerUrl = fallbackTrailer;
    if (!finalTrailerUrl && kinobdItem && kinobdItem.trailer) {
        if (kinobdItem.trailer.startsWith('http')) finalTrailerUrl = kinobdItem.trailer;
    }

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
        kinopoisk_id = COALESCE(EXCLUDED.kinopoisk_id, media.kinopoisk_id),
        type = 'movie',
        rating_imdb = EXCLUDED.rating_imdb, rating_imdb_count = EXCLUDED.rating_imdb_count,
        rating_kp = EXCLUDED.rating_kp, rating_kp_count = EXCLUDED.rating_kp_count,
        title_ru = EXCLUDED.title_ru, budget = EXCLUDED.budget, countries = EXCLUDED.countries,
        overview = EXCLUDED.overview, trailer_url = EXCLUDED.trailer_url,
        updated_at = NOW(), poster_path = EXCLUDED.poster_path, backdrop_path = EXCLUDED.backdrop_path,
        rating_tmdb = EXCLUDED.rating_tmdb, popularity = EXCLUDED.popularity;
    `;
  
    const values = [
      tmdb_id, final_kp_id, 'movie', 
      title_ru, tmdbItem.original_title, overview,
      tmdbItem.poster_path, tmdbItem.backdrop_path, release_year, rating_tmdb, 
      (tmdbItem.genres || []).map(g => g.id), (tmdbItem.genres || []).map(g => g.name),
      finalTrailerUrl, runtime, budget, countries, rating_kp, rating_imdb,
      (kinobdItem && !isNaN(parseInt(kinobdItem.id))) ? parseInt(kinobdItem.id) : null,
      tmdbItem.imdb_id, rating_kp_count, rating_imdb_count, null, tmdbItem.tagline, 
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
    return { title: title_ru, kp_id: final_kp_id, rating_kp, rating_imdb };
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--reset')) {
      try { if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE); console.log("🔄 Reset!"); } catch(e) {}
  }
  let savedState = loadProgress();
  console.log(`🎬 იწყება "ფილმების სინქრონიზაცია" (V74: Movies Only)...`);
  console.log(`🎯 წლები: ${TARGET_YEARS.join(', ')}`);
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let startYearIndex = 0;
  if (savedState) {
      startYearIndex = TARGET_YEARS.indexOf(savedState.year);
      if (startYearIndex === -1) startYearIndex = 0;
      console.log(`⏩ ვაგრძელებთ: ${savedState.year}, გვერდი ${savedState.page}`);
  }

  for (let i = startYearIndex; i < TARGET_YEARS.length; i++) {
    const year = TARGET_YEARS[i];
    let startPage = START_PAGE_DEFAULT; 
    if (savedState && savedState.year === year) { startPage = savedState.page; savedState = null; }
    console.log(`\n📅 წელი: ${year}`);
    
    for (let page = startPage; page <= TMDB_MAX_PAGES; page++) {
      console.log(`   📄 გვერდი ${page}...`);
      const tmdbList = await getTmdbPopularMovies(year, page);
      if (tmdbList.length === 0) { console.log(`   🏁 წელი ${year} დასრულდა.`); break; }

      for (const tmdbBase of tmdbList) {
        const tmdbFull = await getTmdbDetails(tmdbBase.id);
        if (!tmdbFull) { console.log(`      ❌ ვერ წამოვიღეთ TMDB დეტალები ID ${tmdbBase.id}`); continue; }

        // 🛑 Strict Russian Filter
        if (!/[а-яА-ЯёЁ]/.test(tmdbFull.title)) {
            continue;
        }

        const imdbId = tmdbFull.external_ids?.imdb_id || tmdbFull.imdb_id;
        const wikidataId = tmdbFull.external_ids?.wikidata_id; 
        const tmdbTrailer = getTmdbTrailerUrl(tmdbFull);
        const tmdbYear = tmdbFull.release_date ? parseInt(tmdbFull.release_date.split('-')[0]) : year;

        let kpIdExternal = null;
        let source = "";

        if (!kpIdExternal && wikidataId) { kpIdExternal = await fetchKpIdFromWikidata(wikidataId); if (kpIdExternal) source = "Wikidata"; }
        if (!kpIdExternal) { kpIdExternal = await fetchKpIdFromKodik(imdbId, tmdbFull.title, tmdbYear); if (kpIdExternal) source = "Kodik"; }
        if (!kpIdExternal) { kpIdExternal = await findIdInKinoBD(tmdbFull.title, tmdbYear); if (kpIdExternal) source = "KinoBD Search"; }
        if (!kpIdExternal && tmdbFull.original_title) { kpIdExternal = await fetchKpIdFromKodik(imdbId, tmdbFull.original_title, tmdbYear); if (kpIdExternal) source = "Kodik (EN)"; }
        
        if (!kpIdExternal) { 
            let scrapedId = await fetchKpIdViaSearch(tmdbFull.title, tmdbFull.original_title, tmdbYear); 
            if (scrapedId) { kpIdExternal = scrapedId; source = "Scraper"; } 
        }

        let xmlRatings = null;
        if (kpIdExternal) {
            xmlRatings = await fetchRatingsFromKpXML(kpIdExternal);
        }

        let kinobdItem = null;

        let omdbData = null;
        if (imdbId && !xmlRatings?.imdb) omdbData = await fetchOmdbData(imdbId);

        const client = await pool.connect();
        try {
            const res = await saveMovie(client, kinobdItem, tmdbFull, tmdbTrailer, omdbData, kpIdExternal, xmlRatings);
            let status = "";
            if (res.kp_id) status = `✅ [ID: ${source || 'Unknown'}]`;
            else status = "⚠️ [Trailer Only]";
            
            const ratingLog = `(KP: ${res.rating_kp || 0}, IMDb: ${res.rating_imdb || 0})`;
            console.log(`     ${status} ${res.title} ${ratingLog}`);

        } catch (e) { console.log(`     ❌ შეცდომა "${tmdbFull.title}": ${e.message}`); } 
        finally { client.release(); }
        await delay(200); 
      }
      saveProgress(year, page + 1);
    }
  }
  try { if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE); } catch(e) {}
  console.log(`\n🎉 დასრულდა!`);
  await pool.end();
}

main();