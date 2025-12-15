// scripts/sync-tv-us-tr-pro.js
// 💎 Ultimate US/TR TV Sync V4: Full FlixCDN Title Search + Safe DB

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { slugify } from '../src/lib/utils.js';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const KINOBD_API_URL = 'https://kinobd.net/api/films';

// 🔑 API Token-ები
const KODIK_TOKEN = 'b95c138cc28a8377412303d604251230'; 
const FLIX_TOKEN = '248da8cab617df272ec39ac68fa2bd09'; 
const VIDEOSEED_TOKEN = '1ccc47a54ed933114fe53245ec93f6c5'; 

const PROGRESS_FILE = path.join(process.cwd(), 'scripts', 'sync-tv-us-tr-progress.json');

// 📅 წლები: 2019-დან 2004-მდე
const TARGET_YEARS = [
    2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 
    2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004
];

const TMDB_MAX_PAGES = 50; 

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
];

if (!TMDB_API_KEY || !process.env.DATABASE_URL) {
  console.error("❌ .env ფაილი არასწორია.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

function loadProgress() {
    try { if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch (e) {}
    return null; 
}
function saveProgress(year, page) {
    try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ year, page })); } catch (e) {}
}

// --- TMDB ფუნქციები ---

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
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=external_ids,credits,videos,translations`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

// --- Smart Title Finder ---
function getRussianTitle(tmdbItem) {
    if (/[а-яА-ЯёЁ]/.test(tmdbItem.name)) return tmdbItem.name;
    if (tmdbItem.translations?.translations) {
        const ruTrans = tmdbItem.translations.translations.find(t => t.iso_639_1 === 'ru');
        if (ruTrans?.data?.name && /[а-яА-ЯёЁ]/.test(ruTrans.data.name)) {
            return ruTrans.data.name;
        }
    }
    return null; 
}

// --- ID FINDERS & PLAYER CHECKERS ---

// 1. Wikidata (მხოლოდ ID)
async function fetchKpIdFromWikidata(wikidataId) {
    if (!wikidataId) return null;
    try {
        const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
        const res = await fetch(url);
        const data = await res.json();
        const entity = data.entities[wikidataId];
        if (entity.claims && entity.claims.P2603) return parseInt(entity.claims.P2603[0].mainsnak.datavalue.value);
    } catch (e) {}
    return null;
}

// 2. Videoseed (ID + Player)
async function checkVideoseed(title, kpId) {
    try {
        let url = `https://api.videoseed.tv/apiv2.php?token=${VIDEOSEED_TOKEN}`;
        if (kpId) url += `&kp_id=${kpId}`;
        else url += `&title=${encodeURIComponent(title)}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.data && data.data.length > 0) {
            const item = data.data[0];
            return { 
                exists: true, 
                kpId: item.kp_id || item.kinopoisk_id ? parseInt(item.kp_id || item.kinopoisk_id) : null 
            };
        }
    } catch (e) { }
    return { exists: false, kpId: null };
}

// 3. Kodik (ID + Player)
async function checkKodik(title, kpId) {
    try {
        let url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&limit=1&types=serial,serial-ru`;
        if (kpId) url += `&kinopoisk_id=${kpId}`;
        else url += `&title=${encodeURIComponent(title)}`;

        const res = await fetch(url);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
            const item = data.results[0];
            return { exists: true, kpId: parseInt(item.kinopoisk_id) || null };
        }
    } catch (e) {}
    return { exists: false, kpId: null };
}

// 4. FlixCDN (ID + Player - ახლა სათაურითაც!)
async function checkFlixCDN(title, kpId, imdbId) {
    try {
        let url = `https://api0.flixcdn.biz/api/search?token=${FLIX_TOKEN}`;
        if (kpId) url += `&kinopoisk_id=${kpId}`;
        else if (imdbId) url += `&imdb_id=${imdbId}`;
        else url += `&title=${encodeURIComponent(title)}`;

        const res = await fetch(url);
        const data = await res.json();
        
        // FlixCDN აბრუნებს 'result' მასივს
        if (data.result && data.result.length > 0) {
            const item = data.result[0];
            return { 
                exists: true, 
                kpId: item.kinopoisk_id ? parseInt(item.kinopoisk_id) : null 
            };
        }
    } catch (e) { }
    return { exists: false, kpId: null };
}

// 5. KinoBD & Scraper (მხოლოდ ID-სთვის)
async function fetchKpIdFromKinoBD(title, year) {
    try {
        const url = `${KINOBD_API_URL}?title=${encodeURIComponent(title)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            const match = data.data.find(item => Math.abs(parseInt(item.year) - year) <= 1);
            if (match && match.kinopoisk_id) return parseInt(match.kinopoisk_id);
        }
    } catch (e) { }
    return null;
}

async function findKpByScraper(title, originalTitle) {
    const queries = [];
    queries.push(`site:kinopoisk.ru сериал ${title}`);
    if (originalTitle) queries.push(`site:kinopoisk.ru series ${originalTitle}`);

    for (const q of queries) {
        try {
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
            const res = await fetch(url, { headers: { 'User-Agent': getRandomUA() } });
            const text = await res.text();
            let match = text.match(/kinopoisk\.ru\/(?:film|series)\/(\d+)/);
            if (match && match[1]) return parseInt(match[1]);
            match = text.match(/(?:kp|id|kinopoisk)[:\s]+(\d{6,8})/i);
            if (match && match[1]) return parseInt(match[1]);
        } catch (e) {}
        await delay(1200);
    }
    return null;
}

// --- Trailer ---
function getTmdbTrailerUrl(tmdbData) {
    if (!tmdbData?.videos?.results) return null;
    const videos = tmdbData.videos.results;
    let video = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    if (!video) video = videos.find(v => v.site === 'YouTube' && v.type === 'Teaser');
    return video ? `https://www.youtube.com/embed/${video.key}` : null;
}

// --- DB Save ---
async function saveSeries(client, tmdbItem, kpId, imdbId, trailerUrl, titleRu) {
    const queryText = `
      INSERT INTO media (
        tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
        poster_path, backdrop_path, release_year, rating_tmdb,
        genres_ids, genres_names, updated_at, created_at,
        trailer_url, runtime, budget, countries, 
        imdb_id, search_slug, rating_kp, rating_imdb
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(),
        $13, $14, $15, $16, $17, $18, $19, $20
      )
      ON CONFLICT (tmdb_id) DO NOTHING RETURNING tmdb_id;
    `;

    const releaseYear = tmdbItem.first_air_date ? parseInt(tmdbItem.first_air_date.split('-')[0]) : 0;
    const runtime = (tmdbItem.episode_run_time && tmdbItem.episode_run_time.length > 0) ? tmdbItem.episode_run_time[0] : 0;
    
    const values = [
      tmdbItem.id, kpId, 'tv', titleRu, tmdbItem.original_name, tmdbItem.overview,
      tmdbItem.poster_path, tmdbItem.backdrop_path, releaseYear, tmdbItem.vote_average, 
      (tmdbItem.genres || []).map(g => g.id), (tmdbItem.genres || []).map(g => g.name),
      trailerUrl, runtime, 0, (tmdbItem.production_countries || []).map(c => c.name),
      imdbId, slugify(titleRu), 0, 0
    ];
  
    const res = await client.query(queryText, values);
    
    if (res.rows.length > 0 && tmdbItem.credits?.cast) {
        const cast = tmdbItem.credits.cast.slice(0, 10);
        for (let i = 0; i < cast.length; i++) {
            const actor = cast[i];
            await client.query(`
                INSERT INTO actors (id, name, original_name, profile_path, popularity) VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO NOTHING`, [actor.id, actor.name, actor.original_name, actor.profile_path, actor.popularity]);
            await client.query(`
                INSERT INTO media_actors (media_id, actor_id, character, "order") VALUES ($1, $2, $3, $4)
                ON CONFLICT (media_id, actor_id) DO NOTHING`, [tmdbItem.id, actor.id, actor.character, i]);
        }
    }
    return res.rows.length > 0;
}

// --- MAIN ---
async function main() {
  const client = await pool.connect();
  let savedState = loadProgress();
  console.log(`📺 US/TR TV SYNC PRO V4 (ALL PLAYERS) გაეშვა...`);
  console.log(`🎯 წლები: ${TARGET_YEARS.join(', ')}`);
  
  let startYearIndex = 0;
  if (savedState) {
      startYearIndex = TARGET_YEARS.indexOf(savedState.year);
      if (startYearIndex === -1) startYearIndex = 0;
      console.log(`⏩ ვაგრძელებთ: ${savedState.year}, გვერდი ${savedState.page}`);
  }

  let totalAdded = 0;

  for (let i = startYearIndex; i < TARGET_YEARS.length; i++) {
    const year = TARGET_YEARS[i];
    let startPage = (savedState && savedState.year === year) ? savedState.page : 1;
    savedState = null; 

    console.log(`\n📅 წელი: ${year}`);
    
    for (let page = startPage; page <= TMDB_MAX_PAGES; page++) {
      const tmdbList = await getTmdbPopularSeries(year, page);
      if (tmdbList.length === 0) { console.log(`   🏁 გვერდები დასრულდა.`); break; }

      for (const baseItem of tmdbList) {
        process.stdout.write(`   🔍 ${baseItem.name.substring(0, 20)}... `);

        // 1. ბაზის შემოწმება (დუბლიკატის თავიდან აცილება)
        const exists = await client.query('SELECT 1 FROM media WHERE tmdb_id = $1', [baseItem.id]);
        if (exists.rowCount > 0) {
            console.log("⏭️  (უკვე არის)");
            continue;
        }

        const fullItem = await getTmdbDetails(baseItem.id);
        if (!fullItem) { console.log("❌ (TMDB Error)"); continue; }

        if (!fullItem.poster_path || !fullItem.backdrop_path) {
            console.log("🗑️ (No Images)"); continue;
        }

        // 2. რუსული სახელი (აუცილებელია)
        let titleRu = getRussianTitle(fullItem);
        const originalTitle = fullItem.original_name;
        const imdbId = fullItem.external_ids?.imdb_id;
        let kpId = fullItem.external_ids?.kinopoisk_id;

        // 3. ID Search & Player Check (ყველა წყარო)
        if (!kpId) kpId = await fetchKpIdFromWikidata(fullItem.external_ids?.wikidata_id);
        
        let hasPlayer = false;

        // A. Videoseed
        const vsRes = await checkVideoseed(titleRu || originalTitle, kpId);
        if (vsRes.exists) {
            hasPlayer = true;
            if (!kpId && vsRes.kpId) kpId = vsRes.kpId;
        }

        // B. Kodik
        if (!hasPlayer || !kpId) {
            const kodikRes = await checkKodik(titleRu || originalTitle, kpId);
            if (kodikRes.exists) {
                hasPlayer = true;
                if (!kpId && kodikRes.kpId) kpId = kodikRes.kpId;
            }
        }

        // C. FlixCDN (ახლა უკვე სათაურსაც ვაწვდით)
        if (!hasPlayer) {
            const flixRes = await checkFlixCDN(titleRu || originalTitle, kpId, imdbId);
            if (flixRes.exists) {
                hasPlayer = true;
                if (!kpId && flixRes.kpId) kpId = flixRes.kpId;
            }
        }

        // თუ არცერთმა არ დაადასტურა -> ვტოვებთ
        if (!hasPlayer) {
            console.log("☁️ (No Player)");
            continue;
        }

        // თუ რუსული სახელი მაინც არ გვაქვს (თუმცა პლეერში ვიპოვეთ, ესეიგი იქ ექნებოდა)
        if (!titleRu || !/[а-яА-ЯёЁ]/.test(titleRu)) {
            // თუ პლეერებმა იპოვეს, შეგვიძლია ჩავთვალოთ რომ სახელი აქვთ, მაგრამ ბაზაში ჩასაწერად გვჭირდება
            // ამიტომ აქ მაინც ვტოვებთ, ან შეგვიძლია დავუშვათ თუ პლეერმა დააბრუნა რუსული სახელი
            console.log("ru (No RU Title found)");
            continue;
        }

        // თუ KP ID მაინც არ გვაქვს (იშვიათია, რადგან პლეერები აბრუნებენ) -> Scraper
        if (!kpId) {
            kpId = await fetchKpIdFromKinoBD(titleRu, year);
        }
        if (!kpId) {
            kpId = await findKpByScraper(titleRu, originalTitle);
        }

        if (!kpId) {
            console.log("🚫 (KP ID Missing)");
            continue;
        }

        // 4. Trailer
        const trailerUrl = getTmdbTrailerUrl(fullItem);

        // 5. Save
        const saved = await saveSeries(client, fullItem, parseInt(kpId), imdbId, trailerUrl, titleRu);
        if (saved) {
            console.log(`✅ დაემატა: ${titleRu} (KP: ${kpId})`);
            totalAdded++;
        } else {
            console.log("⚠️ (SQL Error)");
        }

        await delay(150);
      }
      saveProgress(year, page + 1);
    }
  }
  
  try { if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE); } catch(e) {}
  console.log(`\n🎉 დასრულდა! სულ დაემატა: ${totalAdded} სერიალი.`);
  client.release();
  await pool.end();
}

main();