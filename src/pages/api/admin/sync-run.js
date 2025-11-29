// src/pages/api/admin/sync-run.js
// 🚀 V22.0: "IMDb Sniper" - 100% Accuracy via IMDb ID Matching

import { query } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { slugify } from '@/lib/utils';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const KINOBD_API_URL = 'https://kinobd.net/api/films';
const KODIK_TOKEN = 'b95c138cc28a8377412303d604251230';

// 🔑 KP Unofficial API Token
// გირჩევთ დარეგისტრირდეთ kinopoiskapiunofficial.tech-ზე და თქვენი უფასო ტოკენი ჩასვათ აქ,
// რადგან საჯარო ტოკენები ხშირად იბლოკება ლიმიტის გამო.
const KP_UNOFFICIAL_TOKEN = 'e3b79230-6f92-42d6-854a-06530a68e352'; 

const MIN_VOTES = 1; 

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
function makeYoutubeUrl(key) { return `https://www.youtube.com/embed/${key}`; }
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 1. TMDB Methods ---
async function getTmdbDiscover(type, page, scanType) {
    const today = new Date().toISOString().split('T')[0];
    const minDate = '2023-01-01'; 
    let dateFilter = '';

    if (scanType === 'future') {
        dateFilter = `&primary_release_date.gte=${today}`; 
        if (type === 'tv') dateFilter = `&first_air_date.gte=${today}`;
    } else {
        dateFilter = `&primary_release_date.lte=${today}&primary_release_date.gte=${minDate}`;
        if (type === 'tv') dateFilter = `&first_air_date.lte=${today}&first_air_date.gte=${minDate}`;
    }

    const sort = scanType === 'future' ? 'primary_release_date.asc' : 'primary_release_date.desc';
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    
    // ვამატებთ vote_count-ს ისევ, რომ სრული ნაგავი არ წამოიღოს, მაგრამ დაბალს (1)
    const url = `${TMDB_BASE_URL}/discover/${endpoint}?api_key=${TMDB_API_KEY}&language=ru-RU&sort_by=${sort}${dateFilter}&vote_count.gte=${MIN_VOTES}&page=${page}`;

    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return data.results || [];
    } catch (e) { return []; }
}

async function fetchTmdbDetails(tmdbId, type) {
    try {
      const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=credits,videos,external_ids,translations`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        data.media_type = type; 
        return data;
      }
    } catch (e) {}
    return null;
}

function getRussianTitle(tmdbItem) {
    let title = tmdbItem.title || tmdbItem.name;
    if (/[а-яА-ЯёЁ]/.test(title)) return title;
    if (tmdbItem.translations?.translations) {
        const ruTrans = tmdbItem.translations.translations.find(t => t.iso_639_1 === 'ru');
        if (ruTrans?.data?.title || ruTrans?.data?.name) {
            const ruTitle = ruTrans.data.title || ruTrans.data.name;
            if (/[а-яА-ЯёЁ]/.test(ruTitle)) return ruTitle;
        }
    }
    return null;
}

// --- 2. Trailer Hunt ---
async function fetchTrailerViaSearch(title, year, lang = 'ru') {
    const suffix = lang === 'ru' ? 'Русский Трейлер' : 'Trailer';
    const query = `site:youtube.com watch ${title} ${suffix} ${year}`;
    try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'User-Agent': getRandomUA() } });
        if (!res.ok) return null;
        const text = await res.text();
        const match = text.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) return makeYoutubeUrl(match[1]);
    } catch (e) { return null; }
    return null;
}

async function getBestTrailer(tmdbId, type, title, year) {
    // 1. TMDB (Russian)
    try {
        const url = `${TMDB_BASE_URL}/${type}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=ru-RU`;
        const res = await fetch(url);
        const data = await res.json();
        let video = data.results?.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        if (video) return makeYoutubeUrl(video.key);
    } catch(e) {}

    // 2. TMDB (English)
    try {
        const url = `${TMDB_BASE_URL}/${type}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url);
        const data = await res.json();
        let video = data.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        if (video) return makeYoutubeUrl(video.key);
    } catch(e) {}

    // 3. Scrapers
    let scrapedTrailer = await fetchTrailerViaSearch(title, year, 'ru');
    if (scrapedTrailer) return scrapedTrailer;
    return await fetchTrailerViaSearch(title, year, 'en');
}

// --- 3. ID SNIPER LOGIC (New & Improved) ---

// A. KP Unofficial API by IMDb (100% Accurate)
async function fetchKpIdByImdb(imdbId) {
    if (!imdbId) return null;
    try {
        const url = `https://kinopoiskapiunofficial.tech/api/v2.2/films?imdbId=${imdbId}`;
        const res = await fetch(url, {
            headers: { 'X-API-KEY': KP_UNOFFICIAL_TOKEN, 'Content-Type': 'application/json' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        // API აბრუნებს მასივს "items" ან პირდაპირ ობიექტს
        const items = data.items || [];
        if (items.length > 0) return items[0].kinopoiskId;
        if (data.kinopoiskId) return data.kinopoiskId;
    } catch (e) { return null; }
    return null;
}

// B. KP Unofficial API by Keyword (Backup)
async function fetchKpIdByKeyword(title, year) {
    try {
        const url = `https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(title)}&page=1`;
        const res = await fetch(url, {
            headers: { 'X-API-KEY': KP_UNOFFICIAL_TOKEN, 'Content-Type': 'application/json' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        const films = data.films || [];
        const match = films.find(f => Math.abs(parseInt(f.year) - year) <= 1);
        if (match && match.filmId) return parseInt(match.filmId);
    } catch (e) { return null; }
    return null;
}

// C. Kodik by IMDb (High Accuracy)
async function fetchKpIdFromKodik(imdbId, title, year) {
    try {
        let url = '';
        if (imdbId) {
            url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&imdb_id=${imdbId}`;
        } else {
            url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&title=${encodeURIComponent(title)}`;
        }
        
        const res = await fetch(url);
        const data = await res.json();
        const results = data.results || [];
        
        if (results.length > 0) {
            // თუ IMDb-ით ვეძებთ, პირველივე სწორია
            if (imdbId) return parseInt(results[0].kinopoisk_id);
            
            // თუ სათაურით, ვამოწმებთ წელს
            const match = results.find(item => Math.abs(item.year - year) <= 1);
            if (match && match.kinopoisk_id) return parseInt(match.kinopoisk_id);
        }
    } catch (e) { return null; }
    return null;
}

// D. Scraper using IMDb ID (Very High Accuracy)
async function fetchKpIdViaScraper(imdbId, titleRu, year) {
    const queries = [];
    
    // 1. ყველაზე ზუსტი: IMDb კოდით ძებნა KP-ზე
    if (imdbId) {
        queries.push(`site:kinopoisk.ru "${imdbId}"`); 
    }
    
    // 2. სათაურით ძებნა (Backup)
    if (titleRu) {
        queries.push(`site:kinopoisk.ru ${titleRu} ${year}`);
        queries.push(`kinopoisk id ${titleRu} ${year}`);
    }

    for (const query of queries) {
        try {
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const res = await fetch(url, { 
                headers: { 'User-Agent': getRandomUA() } 
            });
            
            if (res.status === 429) { await delay(3000); continue; }
            if (!res.ok) continue;

            const text = await res.text();
            
            // Regex ID-სთვის
            let match = text.match(/kinopoisk\.ru\/(?:film|series)\/(\d+)/);
            if (match && match[1]) {
                 const id = parseInt(match[1]);
                 if (id !== 430 && id > 2000) return id;
            }
            
            match = text.match(/(?:kp|id|kinopoisk)[\s:]+(\d{6,8})/i);
            if (match && match[1]) {
                 const id = parseInt(match[1]);
                 if (id !== 430 && id > 2000) return id;
            }
        } catch (e) { continue; }
        await delay(1200);
    }
    return null;
}

// --- DB Write ---
async function upsertMediaToDB(tmdbId, kpId, tmdbItem, finalTrailer, ruTitle) {
  const search_slug = slugify(ruTitle);
  const release_date = tmdbItem.release_date || tmdbItem.first_air_date;
  const release_year = release_date ? parseInt(release_date.split('-')[0]) : 0;
  const runtime = tmdbItem.runtime || (tmdbItem.episode_run_time && tmdbItem.episode_run_time[0]) || null;
  const popularity = Math.round(tmdbItem.popularity || 0);

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
    ON CONFLICT (tmdb_id) DO NOTHING RETURNING tmdb_id;
  `;

  const values = [
    tmdbId, kpId, tmdbItem.media_type,
    ruTitle, tmdbItem.original_name || tmdbItem.original_title, tmdbItem.overview,
    tmdbItem.poster_path, tmdbItem.backdrop_path, release_year,
    tmdbItem.vote_average,
    (tmdbItem.genres || []).map(g => g.id), (tmdbItem.genres || []).map(g => g.name), 
    finalTrailer, runtime, tmdbItem.budget || 0,
    (tmdbItem.production_countries || []).map(c => c.name), 0, 0,
    tmdbItem.external_ids?.imdb_id, 0, 0,
    null, tmdbItem.tagline, null,
    release_date, popularity, search_slug
  ];

  try {
    const res = await query(queryText, values);
    if (res.rows.length > 0) {
        if (tmdbItem.credits && tmdbItem.credits.cast) {
            const cast = tmdbItem.credits.cast.slice(0, 5);
            for (let i = 0; i < cast.length; i++) {
                const actor = cast[i];
                await query(`INSERT INTO actors (id, name, original_name, profile_path, popularity) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`, [actor.id, actor.name, actor.original_name, actor.profile_path, actor.popularity]);
                await query(`INSERT INTO media_actors (media_id, actor_id, character, "order") VALUES ($1, $2, $3, $4) ON CONFLICT (media_id, actor_id) DO NOTHING`, [tmdbId, actor.id, actor.character, i]);
            }
        }
        return { success: true };
    }
    return { success: false, type: 'EXISTS' }; 
  } catch (err) {
    return { success: false, type: 'ERROR', message: err.message };
  }
}

// --- Handler ---
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'არაავტორიზებული' });
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const page = req.body.page || 1;
  const scanType = req.body.scanType || 'released';
  const logs = [];
  let addedCount = 0;
  let skippedCount = 0;

  try {
    const type = page % 2 !== 0 ? 'movie' : 'tv';
    const tmdbPage = Math.ceil(page / 2);

    const modeLabel = scanType === 'future' ? '🔮 მომავალი' : '🔥 ახალი';
    logs.push(`${modeLabel} ${type.toUpperCase()} - გვერდი ${tmdbPage}...`);

    const tmdbList = await getTmdbDiscover(type, tmdbPage, scanType);
    
    if (tmdbList.length === 0) {
        logs.push("⚠️ TMDB-ზე მეტი შედეგი არ არის.");
    }

    for (const tmdbBase of tmdbList) {
        try {
            const tmdbId = tmdbBase.id;

            const exists = await query('SELECT 1 FROM media WHERE tmdb_id = $1', [tmdbId]);
            if (exists.rows.length > 0) { 
                skippedCount++; 
                continue; 
            }

            const tmdbItem = await fetchTmdbDetails(tmdbId, type);
            if (!tmdbItem) continue;

            const year = parseInt((tmdbItem.release_date || tmdbItem.first_air_date || "0").split('-')[0]);
            
            // 🛑 რუსული სათაურის შემოწმება
            const finalTitle = getRussianTitle(tmdbItem);
            if (!finalTitle) {
                skippedCount++;
                continue;
            }

            if (!tmdbItem.poster_path || !tmdbItem.backdrop_path) {
                 skippedCount++;
                 continue;
            }

            const imdbId = tmdbItem.external_ids?.imdb_id;

            // 🔍 ID SNIPER (IMDb ID პრიორიტეტი)
            let kpId = null;
            let source = "Unknown";

            if (scanType === 'future') {
                 if (tmdbItem.external_ids?.wikidata_id) {
                    kpId = await fetchKpIdFromWikidata(tmdbItem.external_ids.wikidata_id);
                    if (kpId) source = "Wikidata";
                }
            } else {
                // 1. KP API via IMDb ID (100% ზუსტი) 🎯
                if (imdbId) {
                    kpId = await fetchKpIdByImdb(imdbId);
                    if (kpId) source = "KP API (IMDb)";
                }

                // 2. Kodik via IMDb ID (ასევე ზუსტი)
                if (!kpId && imdbId) {
                    kpId = await fetchKpIdFromKodik(imdbId, null, null);
                    if (kpId) source = "Kodik (IMDb)";
                }

                // 3. Wikidata
                if (!kpId && tmdbItem.external_ids?.wikidata_id) {
                    kpId = await fetchKpIdFromWikidata(tmdbItem.external_ids.wikidata_id);
                    if (kpId) source = "Wikidata";
                }

                // 4. KP API via Keyword (Backup)
                if (!kpId) {
                    kpId = await fetchKpIdByKeyword(finalTitle, year);
                    if (kpId) source = "KP API (Title)";
                }

                // 5. Scraper (Last Resort - Now uses IMDb ID first)
                if (!kpId) {
                    kpId = await fetchKpIdViaScraper(imdbId, finalTitle, year);
                    if (kpId) source = "Scraper";
                }
            }

            // 🛑 STOP!
            if (!kpId) {
                skippedCount++;
                logs.push(`🚫 [SKIP: NO ID] ${finalTitle} (${year})`);
                continue; 
            }

            // 🎥 Trailer
            const finalTrailer = await getBestTrailer(tmdbId, type, finalTitle, year);

            const result = await upsertMediaToDB(tmdbId, kpId, tmdbItem, finalTrailer, finalTitle);
            
            if (result.success) {
                addedCount++;
                const trailerStatus = finalTrailer ? "🎥" : "⚠️ No Trailer";
                logs.push(`✅ ${type === 'movie' ? '🎬' : '📺'} [${source}] ${trailerStatus} ${finalTitle} (${year})`);
            } else {
                skippedCount++;
            }
        } catch (innerErr) { continue; }
        
        await delay(250); // ცოტა მოვუმატეთ პაუზას API-სთვის
    }

    res.status(200).json({ success: true, page, lastPage: 500, logs, added: addedCount, skipped: skippedCount });
  } catch (error) { res.status(500).json({ error: error.message, page }); }
}