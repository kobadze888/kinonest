// scripts/sync-tv-us-tr.js
// 🎯 V82 (US/TR): Skip Existing + Scraper Enabled (Safe Mode)

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { slugify } from '../src/lib/utils.js';

const KINOBD_API_URL = 'https://kinobd.net/api/films';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OMDB_API_KEY = 'b0f7e52c'; 

const PROGRESS_FILE = path.join(process.cwd(), 'scripts', 'sync-tv-us-tr-progress.json');

const TARGET_YEARS = [2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004];
const START_PAGE_DEFAULT = 1;  
const TMDB_MAX_PAGES = 20; 

const countryMap = {
  "United States of America": "США", "United Kingdom": "Великобритания", "China": "Китай",
  "France": "Франция", "Germany": "Германия", "Japan": "Япония", "Spain": "Испания",
  "Italy": "Италия", "Canada": "Канада", "India": "Индия", "South Korea": "Южная Корея",
  "Australia": "Австралия", "Russia": "Россия", "Denmark": "Дания", "Qatar": "Катар",
  "Sweden": "Швеция", "Turkey": "Турция"
};

// ბრაუზერების როტაცია სკრეიპერისთვის
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0.0.0 Safari/537.36"
];

if (!TMDB_API_KEY || !process.env.DATABASE_URL) {
  console.error("❌ .env ფაილი არასწორია.");
  process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

function loadProgress() {
    try { if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch (e) {}
    return null; 
}
function saveProgress(year, page) {
    try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ year, page })); } catch (e) {}
}

// 💡 შემოწმება: არსებობს თუ არა ბაზაში
async function checkIfExists(client, tmdbId) {
    const res = await client.query('SELECT 1 FROM media WHERE tmdb_id = $1', [tmdbId]);
    return res.rowCount > 0;
}

// --- API Functions ---

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

// 💡 TMDB: US | TR
async function getTmdbPopularSeries(year, page = 1) {
  try {
    const url = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=ru-RU&sort_by=popularity.desc&first_air_date_year=${year}&page=${page}&with_origin_country=US|TR`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (e) { return []; }
}

async function getTmdbDetails(tmdbId) {
  try {
    if (!tmdbId) return null;
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=external_ids,aggregate_credits,credits,videos,content_ratings`;
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

// KinoBD Dual Search
async function findIdInKinoBD(titleRu, titleOrig, year) {
    let id = await searchKinoBDApi(titleRu, year);
    if (id) return id;

    if (titleOrig && titleOrig !== titleRu) {
        id = await searchKinoBDApi(titleOrig, year);
        if (id) return id;
    }

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
                const yearMatch = !year || Math.abs(itemYear - year) <= 2; 
                return yearMatch;
            });
            if (match && match.kinopoisk_id) return parseInt(match.kinopoisk_id);
        }
    } catch (e) { }
    return null;
}

// 💡 Scraper (Enabled)
async function fetchKpIdViaSearch(title, originalTitle, year) {
    const queries = [];
    // რუსული ძებნა
    queries.push(`site:kinopoisk.ru/series/ ${title} ${year}`);
    
    // ორიგინალი სახელით ძებნა (აშშ/თურქული სერიალებისთვის ეს კარგად მუშაობს)
    if (originalTitle && originalTitle !== title) {
        queries.push(`site:kinopoisk.ru/series/ ${originalTitle} ${year}`);
        queries.push(`${originalTitle} ${year} kinopoisk id`);
    }

    for (const query of queries) {
        try {
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const res = await fetch(url, { headers: { 'User-Agent': getRandomUA() } });
            if (!res.ok) continue;
            const text = await res.text();
            
            let match = text.match(/kinopoisk\.ru\/(?:film|series)\/(\d+)/);
            if (match && match[1]) return parseInt(match[1]);
            
            match = text.match(/(?:kp|id|kinopoisk)[:\s]+(\d{6,8})/i);
            if (match && match[1]) return parseInt(match[1]);
        } catch (e) { continue; }
        await delay(1500); // პაუზა, რომ არ დაგვბლოკონ
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

// --- Save (Series) ---
async function saveSeries(client, kinobdItem, tmdbItem, fallbackTrailer, omdbData, kpIdExternal, xmlRatings) {
    if (!tmdbItem || !tmdbItem.id) throw new Error("TMDB Item Invalid");

    const tmdb_id = tmdbItem.id;
    const title_ru = tmdbItem.name || 'No Title'; 
    const search_slug = slugify(title_ru);
    const release_year = tmdbItem.first_air_date ? parseInt(tmdbItem.first_air_date.split('-')[0]) : 2000;
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

    const premiere_world = tmdbItem.first_air_date || null;
    const premiere_ru = premiere_world; 
    let countries = (tmdbItem.production_countries || []).map(c => countryMap[c.name] || c.name);
    const overview = tmdbItem.overview || '';
    let budget = 0; 
    let runtime = (tmdbItem.episode_run_time && tmdbItem.episode_run_time.length > 0) ? tmdbItem.episode_run_time[0] : null;
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
      ON CONFLICT (tmdb_id) DO NOTHING; -- 🛑 თუ არსებობს, არაფერს ვშვებით!
    `;
  
    const values = [
      tmdb_id, final_kp_id, 'tv', 
      title_ru, tmdbItem.original_name, overview,
      tmdbItem.poster_path, tmdbItem.backdrop_path, release_year, rating_tmdb, 
      (tmdbItem.genres || []).map(g => g.id), (tmdbItem.genres || []).map(g => g.name),
      finalTrailerUrl, runtime, budget, countries, rating_kp, rating_imdb,
      (kinobdItem && !isNaN(parseInt(kinobdItem.id))) ? parseInt(kinobdItem.id) : null,
      tmdbItem.imdb_id, rating_kp_count, rating_imdb_count, null, tmdbItem.tagline, 
      premiere_ru, premiere_world, popularity, search_slug
    ];
  
    await client.query(queryText, values);

    // მსახიობები
    const cast = (tmdbItem.aggregate_credits?.cast || tmdbItem.credits?.cast || []).slice(0, 15);
    if (cast.length > 0) {
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
                `, [tmdb_id, actor.id, actor.roles ? actor.roles[0].character : actor.character, i]);
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
  console.log(`📺 იწყება US/TR სერიალების სინქრონიზაცია (ახლები, Scraper ჩართულია)...`);
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
      const tmdbList = await getTmdbPopularSeries(year, page);
      if (tmdbList.length === 0) { console.log(`   🏁 წელი ${year} დასრულდა.`); break; }

      const client = await pool.connect();

      for (const tmdbBase of tmdbList) {
        // 1. არსებობს? -> Skip
        const exists = await checkIfExists(client, tmdbBase.id);
        if (exists) continue;

        const tmdbFull = await getTmdbDetails(tmdbBase.id);
        if (!tmdbFull) continue;

        // 2. რუსული სახელი აქვს? (უსაფრთხოებისთვის)
        if (!/[а-яА-ЯёЁ]/.test(tmdbFull.name)) {
            continue;
        }

        const imdbId = tmdbFull.external_ids?.imdb_id || tmdbFull.imdb_id;
        const wikidataId = tmdbFull.external_ids?.wikidata_id; 
        const tmdbTrailer = getTmdbTrailerUrl(tmdbFull);
        const tmdbYear = tmdbFull.first_air_date ? parseInt(tmdbFull.first_air_date.split('-')[0]) : year;

        let kpIdExternal = null;
        let source = "";

        // 3. ძებნა (Wiki -> KinoBD -> Scraper)
        if (!kpIdExternal && wikidataId) { kpIdExternal = await fetchKpIdFromWikidata(wikidataId); if (kpIdExternal) source = "Wikidata"; }
        if (!kpIdExternal) { 
             kpIdExternal = await findIdInKinoBD(tmdbFull.name, tmdbFull.original_name, tmdbYear);
             if (kpIdExternal) source = "KinoBD Search";
        }
        // 💡 Scraper ჩართულია!
        if (!kpIdExternal) { 
            let scrapedId = await fetchKpIdViaSearch(tmdbFull.name, tmdbFull.original_name, tmdbYear); 
            if (scrapedId) { kpIdExternal = scrapedId; source = "Scraper"; } 
        }

        let xmlRatings = null;
        if (kpIdExternal) {
            xmlRatings = await fetchRatingsFromKpXML(kpIdExternal);
        }

        let kinobdItem = null; 
        let omdbData = null;
        if (imdbId && !xmlRatings?.imdb) omdbData = await fetchOmdbData(imdbId);

        try {
            const res = await saveSeries(client, kinobdItem, tmdbFull, tmdbTrailer, omdbData, kpIdExternal, xmlRatings);
            let status = "";
            if (res.kp_id) status = `✅ [NEW: ${source || 'Unknown'}]`;
            else status = "⚠️ [Trailer Only]";
            
            console.log(`     ${status} ${res.title} (KP: ${res.kp_id || 'N/A'})`);

        } catch (e) { console.log(`     ❌ შეცდომა "${tmdbFull.name}": ${e.message}`); } 

        await delay(200); 
      }
      client.release(); 
      saveProgress(year, page + 1);
    }
  }
  try { if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE); } catch(e) {}
  console.log(`\n🎉 დასრულდა!`);
  await pool.end();
}

main();