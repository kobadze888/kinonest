// src/pages/api/admin/sync-videoseed.js
// 🚀 V14.0: "Hybrid Mode" 
// 👉 POST (Admin Panel) = Original Logic (Specific Page, No Year Filter, Save Progress)
// 👉 GET (Cron Job) = New Logic (Deep Search 300, Auto-Year Filter 2024+, No Save Progress)

import { query } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { slugify } from '@/lib/utils';

// --- კონფიგურაცია ---
const VIDEOSEED_TOKEN = '1ccc47a54ed933114fe53245ec93f6c5';
const VIDEOSEED_API_URL = 'https://api.videoseed.tv/apiv2.php';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const MIN_VOTES_TMDB = 2;     
const ITEMS_PER_PAGE = 50;

// CRON-ის სპეციფიკური პარამეტრები (მოქმედებს მხოლოდ ავტომატურ რეჟიმში)
const CRON_MAX_PAGES = 300; 
const CRON_MIN_YEAR = new Date().getFullYear() - 1; // მაგ: 2025-1 = 2024+

// 🕵️ User Agents
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
];
const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

let sessionLogs = [];
function log(msg, type = 'info') {
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warn') icon = '⚠️';
    if (type === 'net') icon = '🌐';
    if (type === 'skip') icon = '⏭️';
    if (type === 'scraper') icon = '🕵️';
    sessionLogs.push(`${icon} ${msg}`);
}

function makeYoutubeUrl(key) { return `https://www.youtube.com/embed/${key}`; }
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- DB Helpers (მხოლოდ ადმინკისთვის) ---
async function initSettingsTable() {
    await query(`CREATE TABLE IF NOT EXISTS sync_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT NOW())`);
}
async function getLastPage() {
    try {
        await initSettingsTable();
        const res = await query(`SELECT value FROM sync_settings WHERE key = 'videoseed_page'`);
        return res.rows.length > 0 ? parseInt(res.rows[0].value) + 1 : 1;
    } catch (e) { return 1; }
}
async function saveCurrentPage(page) {
    try {
        await initSettingsTable();
        await query(`INSERT INTO sync_settings (key, value, updated_at) VALUES ('videoseed_page', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`, [page]);
    } catch (e) { console.error(e); }
}

// --- API Helpers ---
async function fetchVideoseedList(type, page) {
    const from = (page - 1) * ITEMS_PER_PAGE + 1;
    const url = `${VIDEOSEED_API_URL}?token=${VIDEOSEED_TOKEN}&list=${type}&sort_by=post_date%20desc&from=${from}&items=${ITEMS_PER_PAGE}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        return (data.status === 'success' && Array.isArray(data.data)) ? data.data : [];
    } catch (e) {
        log(`Videoseed API Error: ${e.message}`, 'error');
        return [];
    }
}

async function fetchTmdbDetails(tmdbId, type) {
    if (!tmdbId || tmdbId == 0) return null;
    try {
        const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=credits,videos,external_ids`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) {}
    return null;
}

async function fetchEnglishTrailer(tmdbId, type) {
    try {
        const url = `${TMDB_BASE_URL}/${type}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            const trailer = data.results?.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
            if (trailer) return makeYoutubeUrl(trailer.key);
        }
    } catch (e) {}
    return null;
}

async function fetchTrailerViaSearch(title, year) {
    const query = `site:youtube.com watch ${title} русский трейлер ${year}`;
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

async function findTmdbId(externalId, source) {
    if (!externalId) return null;
    try {
        const url = `${TMDB_BASE_URL}/find/${externalId}?api_key=${TMDB_API_KEY}&external_source=${source}&language=ru-RU`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.movie_results?.length > 0) return { ...data.movie_results[0], media_type: 'movie' };
            if (data.tv_results?.length > 0) return { ...data.tv_results[0], media_type: 'tv' };
        }
    } catch (e) {}
    return null;
}

async function upsertMedia(vsItem, tmdbItem, finalType, finalTrailer, finalTitleRu) {
    const tmdbId = tmdbItem.id;
    const kpId = parseInt(vsItem.id_kp) || parseInt(tmdbItem.external_ids?.kinopoisk_id); 
    const imdbId = vsItem.id_imdb || tmdbItem.external_ids?.imdb_id || null;
    
    const titleRu = finalTitleRu;
    const titleEn = tmdbItem.original_title || tmdbItem.original_name || vsItem.original_name;
    const searchSlug = slugify(titleRu);

    const releaseDate = tmdbItem.release_date || tmdbItem.first_air_date || vsItem.year;
    const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : parseInt(vsItem.year);
    const overview = tmdbItem.overview || vsItem.description;
    const poster = tmdbItem.poster_path;
    const backdrop = tmdbItem.backdrop_path;

    const budget = tmdbItem.budget || 0;
    const countries = (tmdbItem.production_countries || []).map(c => c.name);
    const genresIds = (tmdbItem.genres || []).map(g => g.id);
    const genresNames = (tmdbItem.genres || []).map(g => g.name);
    const ratingTmdb = tmdbItem.vote_average || 0;
    const ratingImdb = 0; const ratingKp = 0;

    const queryText = `INSERT INTO media (tmdb_id, kinopoisk_id, type, title_ru, title_en, overview, poster_path, backdrop_path, release_year, rating_tmdb, genres_ids, genres_names, updated_at, created_at, trailer_url, runtime, budget, countries, imdb_id, search_slug, kinobd_item_id, rating_imdb, rating_kp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), $13, $14, $15, $16, $17, $18, $19, $20, $21) ON CONFLICT (tmdb_id) DO NOTHING;`;
    const values = [tmdbId, kpId, finalType, titleRu, titleEn, overview, poster, backdrop, releaseYear, ratingTmdb, genresIds, genresNames, finalTrailer, tmdbItem.runtime || (tmdbItem.episode_run_time ? tmdbItem.episode_run_time[0] : null), budget, countries, imdbId, searchSlug, vsItem.id, ratingImdb, ratingKp];

    try {
        await query(queryText, values);
        if (tmdbItem.credits?.cast) {
            const cast = tmdbItem.credits.cast.slice(0, 5);
            for (let i = 0; i < cast.length; i++) {
                const a = cast[i];
                await query(`INSERT INTO actors (id, name, original_name, profile_path, popularity) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`, [a.id, a.name, a.original_name, a.profile_path, a.popularity]);
                await query(`INSERT INTO media_actors (media_id, actor_id, character, "order") VALUES ($1, $2, $3, $4) ON CONFLICT (media_id, actor_id) DO NOTHING`, [tmdbId, a.id, a.character, i]);
            }
        }
        return true;
    } catch (e) {
        log(`SQL Error: ${e.message}`, 'error');
        return false;
    }
}

// ==========================================
// 🚀 MAIN HANDLER LOGIC
// ==========================================
export default async function handler(req, res) {
    sessionLogs = [];
    const { secret, limit } = req.query; 

    // 1. ავტორიზაცია
    const session = await getServerSession(req, res, authOptions);
    const isCron = (secret === process.env.CRON_SECRET);
    const isAdmin = !!session;

    if (!isAdmin && !isCron) return res.status(401).json({ error: 'Unauthorized' });

    // 2. GET მოთხოვნა გვერდის ნომრისთვის (მხოლოდ Admin-ისთვის)
    if (req.method === 'GET' && isAdmin && !isCron) {
        const lastPage = await getLastPage();
        return res.status(200).json({ page: lastPage });
    }

    // ======================================================
    // 👉 SCENARIO A: MANUAL SYNC (Admin Panel - POST)
    // ორიგინალი ლოგიკა: კონკრეტული გვერდი, ფილტრების გარეშე
    // ======================================================
    if (req.method === 'POST' && isAdmin) {
        const page = req.body.page || 1; 
        let addedCount = 0;
        let skippedCount = 0;

        try {
            const type = page % 2 !== 0 ? 'movie' : 'serial'; 
            const vsPage = Math.ceil(page / 2);
            log(`👤 Manual Sync: Page ${page} (Videoseed ${type}: ${vsPage})`, 'net');

            const items = await fetchVideoseedList(type, vsPage);
            
            for (const vsItem of items) {
                // False ნიშნავს, რომ წლებს არ ვფილტრავთ (ორიგინალი ლოგიკა)
                const result = await processItem(vsItem, type, false); 
                if (result === 'added') addedCount++;
                if (result === 'skipped') skippedCount++;
            }

            await saveCurrentPage(page); // ვინახავთ პროგრესს
            return res.status(200).json({ success: true, page, logs: sessionLogs, added: addedCount, skipped: skippedCount });
        } catch (e) {
            return res.status(500).json({ error: e.message, logs: sessionLogs });
        }
    }

    // ======================================================
    // 👉 SCENARIO B: CRON SYNC (Automated - GET + Secret)
    // ახალი ლოგიკა: 300 გვერდი, წლების ფილტრი, ლიმიტი
    // ======================================================
    if (req.method === 'GET' && isCron) {
        const maxLimit = limit ? parseInt(limit) : 20;
        let addedCount = 0;
        let currentPage = 1;

        try {
            while (addedCount < maxLimit) {
                // ლიმიტი: 300 გვერდი
                if (currentPage > CRON_MAX_PAGES) {
                    log(`🛑 Cron limit reached: ${CRON_MAX_PAGES} pages scanned.`, 'warn');
                    break;
                }

                const type = currentPage % 2 !== 0 ? 'movie' : 'serial'; 
                const vsPage = Math.ceil(currentPage / 2);
                log(`🔄 Cron Scan: Page ${currentPage} (Year: ${CRON_MIN_YEAR}+)`, 'net');

                const items = await fetchVideoseedList(type, vsPage);
                if (items.length === 0) break;

                for (const vsItem of items) {
                    if (addedCount >= maxLimit) break;
                    
                    // True ნიშნავს, რომ წლებს ვფილტრავთ (ახალი ლოგიკა)
                    const result = await processItem(vsItem, type, true); 
                    
                    if (result === 'added') {
                        addedCount++;
                        log(`✅ [${addedCount}/${maxLimit}] Added via Cron`, 'success');
                    }
                }

                if (addedCount >= maxLimit) break;
                currentPage++;
                await delay(500);
            }
            // არ ვინახავთ saveCurrentPage-ს, რადგან ყოველთვის 1-დან იწყებს
            return res.status(200).json({ success: true, pagesScanned: currentPage, logs: sessionLogs, added: addedCount });
        } catch (e) {
            return res.status(500).json({ error: e.message, logs: sessionLogs });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}

// ==========================================
// 🛠️ SHARED PROCESSING FUNCTION
// ==========================================
async function processItem(vsItem, type, useYearFilter) {
    const vsName = vsItem.name || 'უსახელო';

    // 🛑 YEAR FILTER (მხოლოდ Cron-ისთვის)
    // თუ Cron-ია და წელი ძველია, მაშინვე ვატარებთ
    if (useYearFilter) {
        const vsYear = parseInt(vsItem.year || "0");
        if (vsYear < CRON_MIN_YEAR) return 'filtered_year';
    }

    const hasKpId = (vsItem.id_kp && vsItem.id_kp !== "0" && vsItem.id_kp !== 0);
    if (!hasKpId) return 'skipped';

    let tmdbId = vsItem.id_tmdb ? parseInt(vsItem.id_tmdb) : null;
    let tmdbItem = null;
    let finalType = type === 'serial' ? 'tv' : 'movie';

    if (!tmdbId || tmdbId === 0) {
        const foundKp = await findTmdbId(vsItem.id_kp, 'kinopoisk_id');
        if (foundKp) { tmdbId = foundKp.id; finalType = foundKp.media_type; }
        else if (vsItem.id_imdb) {
            const foundImdb = await findTmdbId(vsItem.id_imdb, 'imdb_id');
            if (foundImdb) { tmdbId = foundImdb.id; finalType = foundImdb.media_type; }
        }
    }

    if (!tmdbId) return 'skipped';

    const exists = await query('SELECT 1 FROM media WHERE tmdb_id = $1', [tmdbId]);
    if (exists.rows.length > 0) {
        // ადმინკაში ვლოგავთ რომ გამოტოვა, კრონში არა (რომ ლოგები არ გადაიტვირთოს)
        if (!useYearFilter) log(`⏭️ Skip: უკვე ბაზაშია (${vsName})`, 'skip'); 
        return 'skipped';
    }

    tmdbItem = await fetchTmdbDetails(tmdbId, finalType);
    if (!tmdbItem) return 'error';

    if ((tmdbItem.vote_count || 0) < MIN_VOTES_TMDB) return 'skipped';

    let finalTitleRu = tmdbItem.title || tmdbItem.name;
    if (!/[а-яА-ЯёЁ]/.test(finalTitleRu) && /[а-яА-ЯёЁ]/.test(vsItem.name)) finalTitleRu = vsItem.name;
    if (!/[а-яА-ЯёЁ]/.test(finalTitleRu)) return 'skipped';

    const year = tmdbItem.release_date?.split('-')[0] || vsItem.year;
    
    // TMDB-ის წელსაც ვამოწმებთ მხოლოდ Cron-ისთვის
    if (useYearFilter && parseInt(year) < CRON_MIN_YEAR) return 'filtered_year';

    let trailerUrl = null;
    let trailer = tmdbItem.videos?.results?.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
    if (trailer) trailerUrl = makeYoutubeUrl(trailer.key);
    else trailerUrl = await fetchEnglishTrailer(tmdbId, finalType);
    if (!trailerUrl) {
        trailerUrl = await fetchTrailerViaSearch(finalTitleRu, year);
        await delay(500);
    }
    if (!trailerUrl) {
         // ადმინკაში ვლოგავთ გაფრთხილებას
         if (!useYearFilter) log(`⚠️ ტრეილერი ვერ მოიძებნა, მაგრამ ვინახავთ - ${finalTitleRu}`, 'warn');
         trailerUrl = null;
    }

    const success = await upsertMedia(vsItem, tmdbItem, finalType, trailerUrl, finalTitleRu);
    if (success) {
        // ადმინკაში ვლოგავთ დამატებას
        if (!useYearFilter) {
             const trailerIcon = trailerUrl ? '🎥' : '🔇';
             log(`✅ დაემატა: ${trailerIcon} ${finalTitleRu} (${year})`, 'success');
        }
        return 'added';
    }
    return 'error';
}