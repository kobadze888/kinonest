// scripts/sync-videoseed.js
// 🚀 V1.0: Videoseed Integration - Full Sync & Auto-Discovery

import 'dotenv/config';
import { Pool } from 'pg';
import { slugify } from '../src/lib/utils.js';

// კონფიგურაცია
const VIDEOSEED_TOKEN = '1ccc47a54ed933114fe53245ec93f6c5'; // თქვენი ახალი ტოკენი
const VIDEOSEED_API_URL = 'https://api.videoseed.tv/apiv2.php';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// ფილტრები
const MIN_VOTES_TMDB = 2; // მინიმალური ხმების რაოდენობა TMDB-ზე (ხარისხისთვის)

if (!TMDB_API_KEY || !process.env.DATABASE_URL) {
  console.error("❌ შეცდომა: .env ფაილი არასწორია.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 📝 ლოგირება ---
function log(msg, type = 'info') {
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warn') icon = '⚠️';
    if (type === 'net') icon = '🌐';
    
    console.log(`${icon} ${msg}`);
}

// --- 🌐 API მოთხოვნები ---

// Videoseed-დან სიის წამოღება
async function fetchVideoseedList(type, page, yearFrom) {
    // sort_by=post_date desc -> ბოლოს დამატებულები თავში
    let url = `${VIDEOSEED_API_URL}?token=${VIDEOSEED_TOKEN}&list=${type}&sort_by=post_date%20desc&page=${page}`;
    
    if (yearFrom) {
        url += `&release_year_from=${yearFrom}`;
    }

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        
        // API v2 აბრუნებს data-ს მასივს
        if (data.status === 'success' && Array.isArray(data.data)) {
            return { items: data.data, total: parseInt(data.total) || 0 };
        }
        return { items: [], total: 0 };
    } catch (e) {
        log(`Videoseed API Error: ${e.message}`, 'error');
        return { items: [], total: 0 };
    }
}

// TMDB-დან დეტალების წამოღება
async function fetchTmdbDetails(tmdbId, type) {
    if (!tmdbId || tmdbId == 0) return null;
    try {
        const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=credits,videos,external_ids`;
        const res = await fetch(url);
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {}
    return null;
}

// TMDB Find - თუ Videoseed-ს არ აქვს TMDB ID, ვეძებთ KP ან IMDb ID-ით
async function findTmdbId(externalId, source) {
    if (!externalId) return null;
    try {
        const url = `${TMDB_BASE_URL}/find/${externalId}?api_key=${TMDB_API_KEY}&external_source=${source}&language=ru-RU`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            // პრიორიტეტი: ფილმი, შემდეგ სერიალი
            if (data.movie_results?.length > 0) return { ...data.movie_results[0], media_type: 'movie' };
            if (data.tv_results?.length > 0) return { ...data.tv_results[0], media_type: 'tv' };
        }
    } catch (e) {}
    return null;
}

// --- 💾 ბაზაში ჩაწერა ---

async function upsertMedia(client, vsItem, tmdbItem, finalType) {
    // მონაცემების შეგროვება ორივე წყაროდან
    const tmdbId = tmdbItem.id;
    const kpId = vsItem.id_kp ? parseInt(vsItem.id_kp) : (tmdbItem.external_ids?.kinopoisk_id || null);
    const imdbId = vsItem.id_imdb || tmdbItem.external_ids?.imdb_id || null;
    
    // სათაური (პრიორიტეტი TMDB-ს, რადგან უფრო სუფთაა ხოლმე)
    const titleRu = tmdbItem.title || tmdbItem.name || vsItem.name;
    const titleEn = tmdbItem.original_title || tmdbItem.original_name || vsItem.original_name;
    const searchSlug = slugify(titleRu);

    // წელი
    const releaseDate = tmdbItem.release_date || tmdbItem.first_air_date || vsItem.year;
    const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : parseInt(vsItem.year);

    // აღწერა
    const overview = tmdbItem.overview || vsItem.description;

    // სურათები
    const poster = tmdbItem.poster_path; // მხოლოდ path გვინდა
    const backdrop = tmdbItem.backdrop_path;

    // ტრეილერი (TMDB-დან თუ არის, უკეთესია, თუ არა და Videoseed არ გვაძლევს ტრეილერს პირდაპირ, ამიტომ ვტოვებთ TMDB-ს იმედად)
    let trailerUrl = null;
    const trailer = tmdbItem.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    if (trailer) trailerUrl = `https://www.youtube.com/embed/${trailer.key}`;

    // ბიუჯეტი, ქვეყნები, ჟანრები
    const budget = tmdbItem.budget || 0;
    const countries = (tmdbItem.production_countries || []).map(c => c.name);
    const genresIds = (tmdbItem.genres || []).map(g => g.id);
    const genresNames = (tmdbItem.genres || []).map(g => g.name);

    // რეიტინგები
    const ratingTmdb = tmdbItem.vote_average || 0;
    const ratingKp = 0; // Videoseed არ აბრუნებს რეიტინგს პირდაპირ ლისტში, TMDB-ს იმედად ვართ ან KP API გვინდა
    const ratingImdb = 0;

    const queryText = `
        INSERT INTO media (
            tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
            poster_path, backdrop_path, release_year, rating_tmdb,
            genres_ids, genres_names, updated_at, created_at,
            trailer_url, runtime, budget, countries, 
            imdb_id, search_slug, 
            kinobd_item_id -- ვინახავთ Videoseed ID-საც
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(),
            $13, $14, $15, $16, $17, $18, $19
        )
        ON CONFLICT (tmdb_id) DO UPDATE SET
            kinopoisk_id = COALESCE(media.kinopoisk_id, EXCLUDED.kinopoisk_id),
            imdb_id = COALESCE(media.imdb_id, EXCLUDED.imdb_id),
            updated_at = NOW(),
            poster_path = COALESCE(media.poster_path, EXCLUDED.poster_path),
            backdrop_path = COALESCE(media.backdrop_path, EXCLUDED.backdrop_path);
    `;

    const values = [
        tmdbId, kpId, finalType, titleRu, titleEn, overview,
        poster, backdrop, releaseYear, ratingTmdb,
        genresIds, genresNames,
        trailerUrl, tmdbItem.runtime || (tmdbItem.episode_run_time ? tmdbItem.episode_run_time[0] : null), budget, countries,
        imdbId, searchSlug,
        vsItem.id // Videoseed Internal ID
    ];

    try {
        await client.query(queryText, values);
        
        // მსახიობები
        if (tmdbItem.credits?.cast) {
            const cast = tmdbItem.credits.cast.slice(0, 5);
            for (let i = 0; i < cast.length; i++) {
                const a = cast[i];
                await client.query(`
                    INSERT INTO actors (id, name, original_name, profile_path, popularity) 
                    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING
                `, [a.id, a.name, a.original_name, a.profile_path, a.popularity]);
                await client.query(`
                    INSERT INTO media_actors (media_id, actor_id, character, "order") 
                    VALUES ($1, $2, $3, $4) ON CONFLICT (media_id, actor_id) DO NOTHING
                `, [tmdbId, a.id, a.character, i]);
            }
        }
        return true;
    } catch (e) {
        log(`SQL Error: ${e.message}`, 'error');
        return false;
    }
}

// --- 🔥 მთავარი ლოგიკა ---

async function processType(client, type, year, pagesToScan) {
    log(`--- ვიწყებთ ${type === 'movie' ? 'ფილმების' : 'სერიალების'} სინქრონიზაციას (${year} წელი) ---`, 'info');
    
    let addedCount = 0;
    
    for (let page = 1; page <= pagesToScan; page++) {
        log(`📄 მუშავდება გვერდი ${page}...`, 'net');
        
        const { items } = await fetchVideoseedList(type, page, year);
        
        if (items.length === 0) {
            log(`⚠️ გვერდი ${page} ცარიელია, გადავდივართ შემდეგზე.`, 'warn');
            break;
        }

        for (const vsItem of items) {
            const vsName = vsItem.name || 'უსახელო';
            
            // 1. ვცდილობთ ვიპოვოთ TMDB ID
            let tmdbId = vsItem.id_tmdb ? parseInt(vsItem.id_tmdb) : null;
            let tmdbItem = null;
            let finalType = type;

            // თუ Videoseed-ს არ აქვს TMDB ID, ვეძებთ KP/IMDb-ით
            if (!tmdbId || tmdbId === 0) {
                if (vsItem.id_imdb) {
                    const found = await findTmdbId(vsItem.id_imdb, 'imdb_id');
                    if (found) { tmdbId = found.id; finalType = found.media_type; }
                }
                if (!tmdbId && vsItem.id_kp) {
                    const found = await findTmdbId(vsItem.id_kp, 'kinopoisk_id');
                    if (found) { tmdbId = found.id; finalType = found.media_type; }
                }
            }

            if (!tmdbId) {
                log(`⏭️ [SKIP] ID ვერ მოიძებნა: ${vsName}`, 'warn');
                continue;
            }

            // 2. ვამოწმებთ ბაზაში უკვე ხომ არ არის
            const exists = await client.query('SELECT 1 FROM media WHERE tmdb_id = $1', [tmdbId]);
            if (exists.rows.length > 0) {
                // log(`⏭️ [SKIP] უკვე ბაზაშია: ${vsName}`);
                continue; // უკვე გვაქვს, გადავახტეთ
            }

            // 3. ვიღებთ სრულ ინფოს TMDB-დან
            tmdbItem = await fetchTmdbDetails(tmdbId, finalType);
            
            if (!tmdbItem) {
                log(`❌ [ERROR] TMDB მონაცემები არ იძებნება: ${vsName}`, 'error');
                continue;
            }

            // ხარისხის ფილტრი
            if ((tmdbItem.vote_count || 0) < MIN_VOTES_TMDB) {
                log(`🗑️ [JUNK] დაბალი რეიტინგი/ხმები: ${vsName}`, 'warn');
                continue;
            }

            // 4. ჩაწერა
            const success = await upsertMedia(client, vsItem, tmdbItem, finalType);
            if (success) {
                log(`✅ [ADDED] ${vsName} (${tmdbItem.release_date || vsItem.year})`, 'success');
                addedCount++;
            }
            
            await delay(100); // API ლიმიტების დაცვა
        }
    }
    
    log(`✨ დასრულდა ${year} წლის ${type}-ები. დაემატა: ${addedCount}`, 'success');
}

async function main() {
    const client = await pool.connect();
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1; // მომავალი წელიც შევამოწმოთ

    try {
        // 1. ჯერ ვამოწმებთ მიმდინარე და მომავალ წელს (პრიორიტეტი)
        // Movies
        await processType(client, 'movie', currentYear, 10); // პირველი 10 გვერდი
        await processType(client, 'movie', nextYear, 2);     // მომავლის 2 გვერდი
        
        // Serials
        await processType(client, 'serial', currentYear, 10);
        
        // 2. შემდეგ ვამოწმებთ ზოგადად ახალ დამატებულებს (წლის მიუხედავად, პირველი 3 გვერდი)
        // ეს საჭიროა, თუ ძველი ფილმი დაამატეს ახლახანს
        log(`\n🔄 ვამოწმებთ ზოგად განახლებებს (All Years)...`, 'net');
        await processType(client, 'movie', null, 3);
        await processType(client, 'serial', null, 3);

    } catch (e) {
        console.error("Critical Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

main();