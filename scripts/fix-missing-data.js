// scripts/fix-missing-data.js
// 🚑 "The Healer" (V69): Strictly RUSSIAN Titles Only + Precise Search

import 'dotenv/config';
import { Pool } from 'pg';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OMDB_API_KEY = 'b0f7e52c'; 

const BATCH_SIZE = 50;

// ბრაუზერების როტაცია
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) Firefox/109.0"
];

if (!TMDB_API_KEY || !process.env.DATABASE_URL) {
  console.error("❌ .env ფაილი არასწორია.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
const smartDelay = () => delay(Math.floor(Math.random() * 1500) + 1500);

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

// 💡 გაუმჯობესებული ძებნა: მხოლოდ რუსული სათაურით + ბრჭყალები
async function fetchKpIdViaSearch(titleRu, year) {
    // თუ სათაური არ შეიცავს რუსულ ასოებს, არ ვეძებთ (უსაფრთხოების ზომა)
    if (!/[а-яА-ЯёЁ]/.test(titleRu)) return null;

    const queries = [
        `site:kinopoisk.ru "${titleRu}" ${year}`, // ზუსტი ძებნა ბრჭყალებით
        `site:kinopoisk.ru ${titleRu} ${year}`    // ჩვეულებრივი ძებნა
    ];
    
    for (const query of queries) {
        try {
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const res = await fetch(url, { headers: { 'User-Agent': getRandomUA() } });
            if (!res.ok) continue;
            const text = await res.text();
            
            let match = text.match(/kinopoisk\.ru\/(?:film|series)\/(\d+)/);
            if (match && match[1]) {
                 const id = parseInt(match[1]);
                 if (id !== 430 && id > 1000) return id;
            }
            
            match = text.match(/(?:kp|id|kinopoisk)[:\s]+(\d{6,8})/i);
            if (match && match[1]) {
                 const id = parseInt(match[1]);
                 if (id !== 430 && id > 1000) return id;
            }
        } catch (e) { continue; }
        await smartDelay();
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
        if (entity.claims && entity.claims.P2603) {
            return parseInt(entity.claims.P2603[0].mainsnak.datavalue.value);
        }
    } catch (e) { return null; }
    return null;
}

async function getTmdbData(id, type) {
    try {
        const url = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=external_ids,videos`;
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) { return null; }
}

function getTmdbTrailer(tmdbData) {
    if (!tmdbData?.videos?.results) return null;
    const videos = tmdbData.videos.results;
    let video = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    if (!video) video = videos.find(v => v.site === 'YouTube' && v.type === 'Teaser');
    return video ? `https://www.youtube.com/embed/${video.key}` : null;
}

async function diagnoseAndFix(client) {
    try {
        await client.query(`
            ALTER TABLE media 
            ALTER COLUMN rating_kp TYPE NUMERIC(4, 1) USING rating_kp::numeric,
            ALTER COLUMN rating_imdb TYPE NUMERIC(4, 1) USING rating_imdb::numeric;
        `);
    } catch (error) { }
}

// --- Main ---
async function main() {
    const client = await pool.connect();
    await diagnoseAndFix(client);
    console.log(`🚑 "მკურნალი" (V69) ჩაირთო... მხოლოდ რუსული სათაურები!`);

    try {
        while (true) {
            // 💡 ფილტრი: AND title_ru ~ '[а-яА-ЯёЁ]'
            // ეს ნიშნავს: მომეცი მხოლოდ ისეთები, სადაც სათაურში რუსული ასოებია
            const res = await client.query(`
                SELECT tmdb_id, type, title_ru, title_en, release_year, kinopoisk_id, trailer_url, imdb_id
                FROM media
                WHERE (kinopoisk_id IS NULL OR trailer_url IS NULL OR rating_imdb = 0 OR rating_kp = 0)
                  AND title_ru ~ '[а-яА-ЯёЁ]' 
                ORDER BY release_year DESC, updated_at ASC
                LIMIT $1
            `, [BATCH_SIZE]);

            if (res.rows.length === 0) {
                console.log("✅ ყველა რუსულენოვანი ჩანაწერი შემოწმებულია!");
                break;
            }

            console.log(`🔄 მუშავდება ${res.rows.length} ჩანაწერი (წელი: ${res.rows[0].release_year || '?'})...`);

            for (const item of res.rows) {
                let needsUpdate = false;
                let newKpId = item.kinopoisk_id;
                let newTrailer = item.trailer_url;
                let newRatingKp = 0.0;
                let newRatingImdb = 0.0;
                
                const updatesLog = []; 

                const tmdbData = await getTmdbData(item.tmdb_id, item.type);
                if (!tmdbData) {
                    await client.query('UPDATE media SET updated_at = NOW() WHERE tmdb_id = $1', [item.tmdb_id]);
                    continue;
                }

                const wikiId = tmdbData.external_ids?.wikidata_id;
                
                // 1. KP ID (Wikidata + Safe Search)
                if (!newKpId) {
                    if (wikiId) newKpId = await fetchKpIdFromWikidata(wikiId);
                    
                    // 💡 ძებნა ჩართულია, რადგან უკვე ვიცით რომ სათაური რუსულია
                    if (!newKpId) newKpId = await fetchKpIdViaSearch(item.title_ru, parseInt(item.release_year));
                    
                    if (newKpId) {
                        needsUpdate = true;
                        updatesLog.push(`🔑 KP ID: ${newKpId}`);
                    }
                }

                // 2. Ratings
                if (newKpId) {
                    const ratings = await fetchRatingsFromKpXML(newKpId);
                    if (ratings) {
                        if (ratings.kp > 0) { newRatingKp = ratings.kp; needsUpdate = true; updatesLog.push(`KP: ${ratings.kp}`); }
                        if (ratings.imdb > 0) { newRatingImdb = ratings.imdb; needsUpdate = true; updatesLog.push(`IMDb: ${ratings.imdb}`); }
                    }
                }

                // 3. Trailer
                if (!newTrailer) {
                    const trailer = getTmdbTrailer(tmdbData);
                    if (trailer) { 
                        newTrailer = trailer; 
                        needsUpdate = true; 
                        updatesLog.push(`🎬 Trailer`);
                    }
                }

                if (needsUpdate) {
                    await client.query(`
                        UPDATE media 
                        SET kinopoisk_id = COALESCE($1, kinopoisk_id),
                            trailer_url = COALESCE($2, trailer_url),
                            rating_kp = CASE WHEN $3::numeric > 0 THEN $3::numeric ELSE rating_kp END,
                            rating_imdb = CASE WHEN $4::numeric > 0 THEN $4::numeric ELSE rating_imdb END,
                            updated_at = NOW()
                        WHERE tmdb_id = $5
                    `, [
                        newKpId, 
                        newTrailer, 
                        parseFloat(newRatingKp), 
                        parseFloat(newRatingImdb), 
                        item.tmdb_id
                    ]);
                    
                    console.log(`   ✅ განახლდა: "${item.title_ru}" -> [${updatesLog.join(', ')}]`);
                } else {
                    // თუ ვერაფერი იპოვა, დრო განვაახლოთ რომ რიგის ბოლოში გადავიდეს
                    await client.query('UPDATE media SET updated_at = NOW() WHERE tmdb_id = $1', [item.tmdb_id]);
                }
                await delay(100); 
            }
            console.log("\n--- შემდეგი პარტია ---");
        }
    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    } finally {
        client.release();
        pool.end();
    }
}

main();