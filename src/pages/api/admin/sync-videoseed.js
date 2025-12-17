// src/pages/api/admin/sync-videoseed.js
// 🚀 V10.2: Cron Ready - Always starts at Page 1 for updates + Limit Control

import { query } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { slugify } from '@/lib/utils';

// კონფიგურაცია
const VIDEOSEED_TOKEN = '1ccc47a54ed933114fe53245ec93f6c5';
const VIDEOSEED_API_URL = 'https://api.videoseed.tv/apiv2.php';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// 🛑 ფილტრები
const MIN_VOTES_TMDB = 2;     
const ITEMS_PER_PAGE = 50; 

// 🕵️ Scraper User Agents
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

// --- 💾 DB Progress Helpers ---

async function initSettingsTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS sync_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
}

async function getLastPage() {
    try {
        await initSettingsTable();
        const res = await query(`SELECT value FROM sync_settings WHERE key = 'videoseed_page'`);
        return res.rows.length > 0 ? parseInt(res.rows[0].value) + 1 : 1;
    } catch (e) {
        return 1;
    }
}

async function saveCurrentPage(page) {
    try {
        await initSettingsTable();
        await query(`
            INSERT INTO sync_settings (key, value, updated_at) VALUES ('videoseed_page', $1, NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `, [page]);
    } catch (e) { console.error("Save Progress Error:", e); }
}

// --- API Methods ---

async function fetchVideoseedList(type, page) {
    const from = (page - 1) * ITEMS_PER_PAGE + 1;
    const url = `${VIDEOSEED_API_URL}?token=${VIDEOSEED_TOKEN}&list=${type}&sort_by=post_date%20desc&from=${from}&items=${ITEMS_PER_PAGE}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.data)) {
            return data.data;
        }
        return [];
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

    const ratingImdb = 0; 
    const ratingKp = 0;

    const queryText = `
        INSERT INTO media (
            tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
            poster_path, backdrop_path, release_year, rating_tmdb,
            genres_ids, genres_names, updated_at, created_at,
            trailer_url, runtime, budget, countries, 
            imdb_id, search_slug, kinobd_item_id,
            rating_imdb, rating_kp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(),
            $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        ON CONFLICT (tmdb_id) DO NOTHING;
    `;

    const values = [
        tmdbId, kpId, finalType, titleRu, titleEn, overview,
        poster, backdrop, releaseYear, ratingTmdb,
        genresIds, genresNames,
        finalTrailer, tmdbItem.runtime || (tmdbItem.episode_run_time ? tmdbItem.episode_run_time[0] : null), budget, countries,
        imdbId, searchSlug, vsItem.id,
        ratingImdb, ratingKp 
    ];

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

// 🚀 მთავარი Handler
export default async function handler(req, res) {
    const { secret, limit } = req.query; 
    
    // 1. ავტორიზაცია
    const session = await getServerSession(req, res, authOptions);
    const isCronAuthorized = secret === process.env.CRON_SECRET;
    
    if (!session && !isCronAuthorized) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. GET: ბოლო გვერდის დაბრუნება (ადმინკისთვის)
    if (req.method === 'GET' && !isCronAuthorized) {
        const lastPage = await getLastPage();
        return res.status(200).json({ page: lastPage });
    }

    // 3. სინქრონიზაცია
    if (req.method === 'POST' || (req.method === 'GET' && isCronAuthorized)) {
        
        // 🛑 გვერდის განსაზღვრა
        // თუ ადმინკიდან მოდის POST და აქვს 'page', ვიყენებთ მას.
        // სხვა შემთხვევაში (Cron ან ცარიელი POST) - ვიწყებთ 1-დან!
        let page = (req.body && req.body.page) ? req.body.page : 1;

        // 🛑 ლიმიტის განსაზღვრა
        const maxLimit = limit ? parseInt(limit) : ITEMS_PER_PAGE;

        sessionLogs = [];
        let addedCount = 0;
        let skippedCount = 0;

        try {
            const type = page % 2 !== 0 ? 'movie' : 'serial'; 
            const vsPage = Math.ceil(page / 2);
            
            log(`🧩 Videoseed ${type.toUpperCase()} - გვერდი ${vsPage}`, 'net');

            const items = await fetchVideoseedList(type, vsPage);

            if (items.length === 0) {
                log(`⚠️ გვერდი ცარიელია.`, 'warn');
            }

            for (const vsItem of items) {
                // ლიმიტის შემოწმება
                if (addedCount >= maxLimit) {
                    log(`🛑 ლიმიტი (${maxLimit}) ამოიწურა.`, 'skip');
                    break;
                }

                const vsName = vsItem.name || 'უსახელო';
                
                // KP ID შემოწმება
                const hasKpId = (vsItem.id_kp && vsItem.id_kp !== "0" && vsItem.id_kp !== 0);
                if (!hasKpId) { skippedCount++; continue; }

                // TMDB ID ძებნა
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

                if (!tmdbId) { skippedCount++; continue; }

                // ბაზაში არსებობის შემოწმება
                const exists = await query('SELECT 1 FROM media WHERE tmdb_id = $1', [tmdbId]);
                if (exists.rows.length > 0) {
                    skippedCount++;
                    log(`⏭️ Skip: უკვე ბაზაშია (${vsName})`, 'skip');
                    continue; 
                }

                tmdbItem = await fetchTmdbDetails(tmdbId, finalType);
                if (!tmdbItem) { log(`❌ TMDB ვერ მოიძებნა: ${vsName}`, 'error'); continue; }

                if ((tmdbItem.vote_count || 0) < MIN_VOTES_TMDB) {
                    skippedCount++;
                    log(`🗑️ დაბალი ხმები: ${vsName}`, 'warn');
                    continue;
                }

                let finalTitleRu = tmdbItem.title || tmdbItem.name;
                if (!/[а-яА-ЯёЁ]/.test(finalTitleRu) && /[а-яА-ЯёЁ]/.test(vsItem.name)) finalTitleRu = vsItem.name;
                
                if (!/[а-яА-ЯёЁ]/.test(finalTitleRu)) {
                    skippedCount++;
                    log(`🚫 Skip: არ აქვს რუსული სათაური (${vsName})`, 'skip');
                    continue;
                }

                const year = tmdbItem.release_date?.split('-')[0] || vsItem.year;
                let trailerUrl = null;
                let trailer = tmdbItem.videos?.results?.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
                
                if (trailer) trailerUrl = makeYoutubeUrl(trailer.key);
                else trailerUrl = await fetchEnglishTrailer(tmdbId, finalType);
                
                if (!trailerUrl) {
                    trailerUrl = await fetchTrailerViaSearch(finalTitleRu, year);
                    await delay(1000);
                }

                if (!trailerUrl) {
                    trailerUrl = null; 
                }

                const success = await upsertMedia(vsItem, tmdbItem, finalType, trailerUrl, finalTitleRu);
                if (success) {
                    const trailerIcon = trailerUrl ? '🎥' : '🔇';
                    log(`✅ დაემატა: ${trailerIcon} ${finalTitleRu} (${year})`, 'success');
                    addedCount++;
                }
            }

            // ინახავს პროგრესს (სურვილისამებრ, თუ ადმინკაში გინდა გამოჩნდეს სად გაჩერდა ბოლოს)
            await saveCurrentPage(page);
            
            res.status(200).json({ success: true, page, logs: sessionLogs, added: addedCount, skipped: skippedCount });

        } catch (error) {
            log(`🔥 Critical Error: ${error.message}`, 'error');
            res.status(200).json({ success: false, error: error.message, logs: sessionLogs });
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}