// src/pages/api/admin/sync-run.js
// 🚀 V17.0: "Hunter Mode" - Added Kinopoisk Unofficial API for 100% ID Match

import { query } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { slugify } from '@/lib/utils';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const KINOBD_API_URL = 'https://kinobd.net/api/films';
const KODIK_TOKEN = 'b95c138cc28a8377412303d604251230';

// 🔑 ეს არის საჯარო/უფასო ტოკენი KP Unofficial API-სთვის
// (თუ ეს ტოკენი შეიზღუდება, შეგიძლია დარეგისტრირდე kinopoiskapiunofficial.tech-ზე და შენი ჩასვა)
const KP_UNOFFICIAL_TOKEN = 'e3b79230-6f92-42d6-854a-06530a68e352'; 

const MIN_POPULARITY_FOR_NO_ID = 15; 
const MIN_VOTES = 2; 

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0.0.0 Safari/537.36"
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
function makeYoutubeUrl(key) { return `https://www.youtube.com/embed/${key}`; }
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 1. TMDB Discover ---
async function getTmdbDiscover(type, page, scanType) {
    const today = new Date().toISOString().split('T')[0];
    const minDate = '2023-01-01'; 
    let url = '';
    let dateFilter = '';

    if (scanType === 'future') {
        dateFilter = `&primary_release_date.gte=${today}`; 
        if (type === 'tv') dateFilter = `&first_air_date.gte=${today}`;
    } else {
        dateFilter = `&primary_release_date.lte=${today}&primary_release_date.gte=${minDate}`;
        if (type === 'tv') dateFilter = `&first_air_date.lte=${today}&first_air_date.gte=${minDate}`;
    }

    if (type === 'movie') {
        const sort = scanType === 'future' ? 'primary_release_date.asc' : 'primary_release_date.desc';
        url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=ru-RU&sort_by=${sort}${dateFilter}&vote_count.gte=${MIN_VOTES}&page=${page}`;
    } else {
        const sort = scanType === 'future' ? 'first_air_date.asc' : 'first_air_date.desc';
        url = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=ru-RU&sort_by=${sort}${dateFilter}&vote_count.gte=${MIN_VOTES}&page=${page}`;
    }

    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return data.results || [];
    } catch (e) { return []; }
}

// --- 2. TMDB Details ---
async function fetchTmdbDetails(tmdbId, type) {
    try {
      const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=credits,videos,external_ids`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        data.media_type = type; 
        return data;
      }
    } catch (e) {}
    return null;
}

async function fetchEnglishTrailer(tmdbId, type) {
    try {
        const url = `${TMDB_BASE_URL}/${type}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        let video = data.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        if (!video) video = data.results.find(v => v.site === 'YouTube' && v.type === 'Teaser');
        return video ? makeYoutubeUrl(video.key) : null;
    } catch (e) { return null; }
}

// --- 3. ID Search (Updated) ---

// 🆕 ახალი: KP Unofficial API (ყველაზე ძლიერი ძებნა)
async function fetchKpIdFromUnofficialApi(title, year) {
    try {
        const url = `https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(title)}&page=1`;
        const res = await fetch(url, {
            headers: { 
                'X-API-KEY': KP_UNOFFICIAL_TOKEN,
                'Content-Type': 'application/json',
            }
        });
        if (!res.ok) return null;
        const data = await res.json();
        
        if (data.films && data.films.length > 0) {
            // ვეძებთ წლის დამთხვევას
            const match = data.films.find(f => {
                // API ზოგჯერ აბრუნებს წელს როგორც string "2025"
                const filmYear = parseInt(f.year); 
                return Math.abs(filmYear - year) <= 1;
            });
            if (match && match.filmId) return parseInt(match.filmId);
        }
    } catch (e) { return null; }
    return null;
}

async function fetchTrailerFromKinobd(title, year) {
    try {
        const url = `${KINOBD_API_URL}?title=${encodeURIComponent(title)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            const match = data.data.find(item => Math.abs(parseInt(item.year) - year) <= 1);
            if (match && match.trailer && match.trailer.includes('http')) return match.trailer;
        }
    } catch (e) { return null; }
    return null;
}

async function fetchKpIdFromKinobdSearch(title, year) {
    try {
        const url = `${KINOBD_API_URL}?title=${encodeURIComponent(title)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            const match = data.data.find(item => Math.abs(parseInt(item.year) - year) <= 1);
            if (match && match.kinopoisk_id) return parseInt(match.kinopoisk_id);
        }
    } catch (e) { return null; }
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

async function fetchKpIdFromKodik(title, year) {
    try {
        const url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&title=${encodeURIComponent(title)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const match = data.results.find(item => Math.abs(item.year - year) <= 1);
            if (match && match.kinopoisk_id && match.kinopoisk_id !== 'null') return parseInt(match.kinopoisk_id);
        }
    } catch (e) { return null; }
    return null;
}

// --- DB Write ---
async function upsertMediaToDB(tmdbId, kpId, tmdbItem, finalTrailer) {
  const title_ru = tmdbItem.title || tmdbItem.name || tmdbItem.original_title || 'Без названия';
  const search_slug = slugify(title_ru);
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
    title_ru, tmdbItem.original_title || tmdbItem.original_name, tmdbItem.overview,
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

            const finalTitle = tmdbItem.title || tmdbItem.name;

            if (!/[а-яА-ЯёЁ]/.test(finalTitle)) {
                skippedCount++;
                continue;
            }

            if (!tmdbItem.poster_path || !tmdbItem.backdrop_path) {
                 skippedCount++;
                 continue;
            }

            const year = parseInt((tmdbItem.release_date || tmdbItem.first_air_date || "0").split('-')[0]);

            // 🔍 ID Hunt (5 დონიანი ძებნა!)
            let kpId = null;
            let source = "Unknown";

            if (scanType === 'future') {
                 if (tmdbItem.external_ids?.wikidata_id) {
                    kpId = await fetchKpIdFromWikidata(tmdbItem.external_ids.wikidata_id);
                    if (kpId) source = "Wikidata";
                }
            } else {
                // 1. Wikidata
                if (tmdbItem.external_ids?.wikidata_id) {
                    kpId = await fetchKpIdFromWikidata(tmdbItem.external_ids.wikidata_id);
                    if (kpId) source = "Wikidata";
                }
                // 2. Kinobd Search
                if (!kpId) {
                    kpId = await fetchKpIdFromKinobdSearch(finalTitle, year);
                    if (kpId) source = "Kinobd Search";
                }
                // 3. KP Unofficial API (ახალი და ძლიერი) 🆕
                if (!kpId) {
                    kpId = await fetchKpIdFromUnofficialApi(finalTitle, year);
                    if (kpId) source = "KP API";
                }
                // 4. Kodik
                if (!kpId) {
                    kpId = await fetchKpIdFromKodik(finalTitle, year);
                    if (kpId) source = "Kodik";
                }
                // 5. Scraper (აღარ გვჭირდება თუ API გვაქვს, მაგრამ იყოს)
            }

            // Trailer
            let finalTrailer = null;
            let ruVideo = tmdbItem.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
            if (!ruVideo) ruVideo = tmdbItem.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Teaser');
            
            if (ruVideo) {
                 finalTrailer = makeYoutubeUrl(ruVideo.key);
            } else {
                 const enTrailer = await fetchEnglishTrailer(tmdbId, tmdbItem.media_type);
                 if (enTrailer) finalTrailer = enTrailer;
                 else if (scanType !== 'future') {
                    const kbTrailer = await fetchTrailerFromKinobd(finalTitle, year);
                    if (kbTrailer) finalTrailer = kbTrailer;
                 }
            }

            if (!finalTrailer) {
                skippedCount++;
                logs.push(`🚫 [SKIP: NO TRAILER] ${finalTitle}`);
                continue;
            }

            // Trash Filter
            const isEnglish = tmdbItem.original_language === 'en';
            const pop = tmdbItem.popularity;
            
            if (!kpId) {
                if (!isEnglish && pop < MIN_POPULARITY_FOR_NO_ID) {
                    skippedCount++;
                    logs.push(`🗑️ [SKIP: LOW QUALITY] ${finalTitle}`);
                    continue;
                }
                if (isEnglish && pop < 5) {
                    skippedCount++;
                    continue;
                }
            }

            const result = await upsertMediaToDB(tmdbId, kpId, tmdbItem, finalTrailer);
            
            if (result.success) {
                addedCount++;
                const idStatus = kpId ? `[${source}]` : `[⚠️ No Player]`;
                const trailerStatus = finalTrailer ? "🎥" : "❌";
                logs.push(`✅ ${type === 'movie' ? '🎬' : '📺'} ${idStatus} ${trailerStatus} ${finalTitle} (${year})`);
            } else {
                skippedCount++;
            }
        } catch (innerErr) { continue; }
        
        await delay(100); 
    }

    res.status(200).json({ success: true, page, lastPage: 500, logs, added: addedCount, skipped: skippedCount });
  } catch (error) { res.status(500).json({ error: error.message, page }); }
}