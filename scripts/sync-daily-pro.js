// scripts/sync-daily-pro.js
// 💎 Ultimate Quality Sync V5: Smart ID Priority + Limits

import 'dotenv/config';
import { Pool } from 'pg';
import { slugify } from '../src/lib/utils.js';

// --- კონფიგურაცია ---
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// 🔑 API ტოკენები
const KODIK_TOKEN = 'b95c138cc28a8377412303d604251230'; 
const FLIX_TOKEN = '248da8cab617df272ec39ac68fa2bd09'; 
const VIDEOSEED_TOKEN = '1ccc47a54ed933114fe53245ec93f6c5'; 

// 📅 თარიღები
const CURRENT_YEAR = new Date().getFullYear();
const TARGET_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1]; 

// 🛑 ლიმიტი: რამდენ გვერდს ჩამოვიდეს სიღრმეში? (5 გვერდი = ~100 ფილმი წელიწადზე)
const PAGES_TO_SCAN = 5; 

// 🕵️ Scraper User Agents
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

// --- 1. TMDB ფუნქციები ---

async function getTmdbDiscovery(type, year, page) {
    let url;
    // ფილმებისთვის - კონკრეტული წელი
    if (type === 'movie') {
        url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=ru-RU&sort_by=popularity.desc&primary_release_year=${year}&page=${page}&vote_count.gte=5`;
    } 
    // სერიალებისთვის - უფრო ფართო სპექტრი (რომ C.S.I. და მსგავსები არ დაიკარგოს)
    else {
        // ვიყენებთ air_date.gte-ს რომ მიმდინარე სეზონებიც ამოიღოს, ან უბრალოდ პოპულარულები
        url = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=ru-RU&sort_by=popularity.desc&page=${page}&vote_count.gte=5`;
        // შენიშვნა: სერიალებზე წელს არ ვფილტრავთ API-შივე, რადგან ძველი სერიალი შეიძლება ახლა იყოს პოპულარული
    }

    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.results || [];
    } catch (e) { return []; }
}

async function getTmdbDetails(id, type) {
    try {
        const url = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=external_ids,credits,videos`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) {}
    return null;
}

// --- 2. ID და Player შემოწმება (C.S.I. FIX) ---

// A. Kodik (ID Priority)
async function checkKodik(title, year, type, imdbId, kpId) {
    try {
        let url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&limit=1`;
        if (kpId) url += `&kinopoisk_id=${kpId}`;
        else if (imdbId) url += `&imdb_id=${imdbId}`;
        else url += `&title=${encodeURIComponent(title)}`;

        const res = await fetch(url);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
            const item = data.results[0];
            
            // ✅ FIX: თუ ID ემთხვევა, წელს ვაიგნორებთ!
            if (kpId || imdbId) {
                return { exists: true, kpId: parseInt(item.kinopoisk_id) || null };
            }

            // თუ მარტო სახელით ვიპოვეთ, მაშინ ვამოწმებთ წელს
            const itemYear = parseInt(item.year);
            const diff = Math.abs(itemYear - year);
            
            if (type === 'movie' && diff > 1) return { exists: false, kpId: null }; 
            // სერიალებზე უფრო ლმობიერები ვართ (მაგრამ ID-ის გარეშე მაინც რისკია)
            if (type === 'tv' && diff > 20) return { exists: false, kpId: null }; 

            return { exists: true, kpId: parseInt(item.kinopoisk_id) || null };
        }
    } catch (e) {}
    return { exists: false, kpId: null };
}

// B. Videoseed (ID Priority)
async function checkVideoseed(imdbId, kpId, title) {
    try {
        let url = `https://api.videoseed.tv/apiv2.php?token=${VIDEOSEED_TOKEN}`;
        // v2-ზე სასურველია title ან kp_id
        if (kpId) url += `&kp_id=${kpId}`; 
        else if (title) url += `&title=${encodeURIComponent(title)}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.data && data.data.length > 0) {
            const item = data.data[0];
            // ID Check
            if (kpId && parseInt(item.kp_id) === parseInt(kpId)) {
                 return { exists: true, kpId: item.kp_id };
            }
            // Title match (fallback)
            return { exists: true, kpId: item.kp_id || null };
        }
    } catch (e) { }
    return { exists: false, kpId: null };
}

// C. FlixCDN (Availability Check)
async function checkFlixCDN(imdbId, kpId) {
    if (!imdbId && !kpId) return false;
    try {
        let q = kpId ? `kinopoisk_id=${kpId}` : `imdb_id=${imdbId}`;
        const res = await fetch(`https://api0.flixcdn.biz/api/search?token=${FLIX_TOKEN}&${q}`);
        const data = await res.json();
        return data.result && data.result.length > 0;
    } catch (e) { return false; }
}

// D. Scraper
async function findKpByScraper(title, year) {
    const queries = [`site:kinopoisk.ru ${title}`]; // წელი ამოვიღე, რომ ძველებიც იპოვოს
    for (const q of queries) {
        try {
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
            const res = await fetch(url, { headers: { 'User-Agent': getRandomUA() } });
            const text = await res.text();
            let match = text.match(/kinopoisk\.ru\/(?:film|series)\/(\d+)/);
            if (match && match[1]) return parseInt(match[1]);
        } catch (e) {}
        await delay(1200);
    }
    return null;
}

// --- 3. ტრეილერი ---
async function findTrailer(tmdbData, title, year) {
    let video = tmdbData.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.iso_639_1 === 'ru');
    if (video) return `https://www.youtube.com/embed/${video.key}`;

    video = tmdbData.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    if (video) return `https://www.youtube.com/embed/${video.key}`;

    try {
        const q = `site:youtube.com watch ${title} русский трейлер`;
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { 'User-Agent': getRandomUA() } });
        const text = await res.text();
        const match = text.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
    } catch (e) {}

    return null;
}

// --- 4. შენახვა ---
async function saveToDb(client, item, type, kpId, trailerUrl) {
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

    const releaseYear = parseInt((item.release_date || item.first_air_date || '0').split('-')[0]);
    
    const values = [
        item.id, kpId, type, item.title || item.name, item.original_title || item.original_name, item.overview,
        item.poster_path, item.backdrop_path, releaseYear, item.vote_average,
        (item.genres || []).map(g => g.id), (item.genres || []).map(g => g.name),
        trailerUrl, item.runtime || (item.episode_run_time ? item.episode_run_time[0] : 0), item.budget || 0,
        (item.production_countries || []).map(c => c.name),
        item.external_ids?.imdb_id, slugify(item.title || item.name), 0, 0
    ];

    const res = await client.query(queryText, values);
    return res.rows.length > 0;
}

// --- MAIN LOOP ---
async function main() {
    const client = await pool.connect();
    console.log(`💎 PRO Sync V5 (Smart ID + Limits) გაეშვა...`);
    console.log(`🎯 წლები: ${TARGET_YEARS.join(', ')}`);
    console.log(`🛑 ლიმიტი: ${PAGES_TO_SCAN} გვერდი თითო კატეგორიაზე.`);

    let totalAdded = 0;

    for (const year of TARGET_YEARS) {
        console.log(`\n📅 წელი: ${year}`);
        
        for (const type of ['movie', 'tv']) {
            console.log(`   🎬 ტიპი: ${type.toUpperCase()}`);

            for (let page = 1; page <= PAGES_TO_SCAN; page++) {
                const list = await getTmdbDiscovery(type, year, page);
                if (list.length === 0) break;

                for (const baseItem of list) {
                    const titleRu = baseItem.title || baseItem.name;
                    process.stdout.write(`      🔍 ${titleRu.substring(0, 30)}... `);

                    const exists = await client.query('SELECT 1 FROM media WHERE tmdb_id = $1', [baseItem.id]);
                    if (exists.rowCount > 0) {
                        console.log("⏭️  (უკვე არის)");
                        continue;
                    }

                    const fullItem = await getTmdbDetails(baseItem.id, type);
                    if (!fullItem) { console.log("❌ (TMDB Error)"); continue; }

                    if (!fullItem.poster_path || !fullItem.backdrop_path) {
                        console.log("🗑️ (No Images)"); continue;
                    }
                    if (!/[а-яА-ЯёЁ]/.test(titleRu)) {
                        console.log("ru (No RU Title)"); continue;
                    }

                    // რეალური წელი (ფილმის/სერიალის)
                    const realYear = parseInt((fullItem.release_date || fullItem.first_air_date || '0').split('-')[0]);

                    let kpId = fullItem.external_ids?.kinopoisk_id;
                    const imdbId = fullItem.external_ids?.imdb_id;

                    // 5. Player Check
                    let hasPlayer = false;

                    // Check A: Videoseed
                    const vsRes = await checkVideoseed(imdbId, kpId, titleRu);
                    if (vsRes.exists) {
                        hasPlayer = true;
                        if (!kpId && vsRes.kpId) kpId = vsRes.kpId;
                    }

                    // Check B: FlixCDN
                    if (!hasPlayer) {
                        const hasFlix = await checkFlixCDN(imdbId, kpId);
                        if (hasFlix) hasPlayer = true;
                    }

                    // Check C: Kodik
                    if (!hasPlayer) {
                        const kodikRes = await checkKodik(titleRu, realYear, type, imdbId, kpId);
                        if (kodikRes.exists) {
                            hasPlayer = true;
                            if (!kpId && kodikRes.kpId) kpId = kodikRes.kpId;
                        }
                    }

                    if (!hasPlayer) {
                        console.log("☁️ (No Player Found)");
                        continue;
                    }

                    if (!kpId) {
                        kpId = await findKpByScraper(titleRu, realYear);
                    }

                    if (!kpId) {
                        console.log("🚫 (KP ID Missing)"); continue;
                    }

                    const trailerUrl = await findTrailer(fullItem, titleRu, realYear);
                    if (!trailerUrl) {
                        console.log("🔇 (No Trailer)"); continue;
                    }

                    const saved = await saveToDb(client, fullItem, type, parseInt(kpId), trailerUrl);
                    if (saved) {
                        console.log("✅ დაემატა!");
                        totalAdded++;
                    } else {
                        console.log("⚠️ (SQL Error / Duplicate)");
                    }

                    await delay(150); 
                }
            }
        }
    }

    console.log(`\n🎉 დასრულდა! სულ დაემატა: ${totalAdded} სრულყოფილი კონტენტი.`);
    client.release();
    pool.end();
}

main();