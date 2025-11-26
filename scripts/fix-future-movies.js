// scripts/fix-future-movies.js
// 🧹 CLEANUP & FIX: Deletes bad quality items (no img) & Finds Trailers/Teasers for future movies

import 'dotenv/config';
import { Pool } from 'pg';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// 📅 ვეხებით მხოლოდ ახალ და მომავლის ფილმებს
const TARGET_YEAR_START = 2025;

if (!TMDB_API_KEY || !process.env.DATABASE_URL) {
  console.error("❌ .env ფაილი არასწორია.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function makeYoutubeUrl(key) { return `https://www.youtube.com/embed/${key}`; }

// --- 1. TMDB Video Fetcher ---
async function getTrailerFromTmdb(tmdbId, type) {
    try {
        // 1. ვეძებთ რუსულს
        let url = `${TMDB_BASE_URL}/${type}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=ru-RU`;
        let res = await fetch(url);
        let data = await res.json();
        let results = data.results || [];

        let video = results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        if (!video) video = results.find(v => v.site === 'YouTube' && v.type === 'Teaser'); // ტიზერიც წავა

        if (video) return makeYoutubeUrl(video.key);

        // 2. თუ რუსული არაა, ვეძებთ ინგლისურს
        url = `${TMDB_BASE_URL}/${type}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
        res = await fetch(url);
        data = await res.json();
        results = data.results || [];

        video = results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        if (!video) video = results.find(v => v.site === 'YouTube' && v.type === 'Teaser');

        if (video) return makeYoutubeUrl(video.key);

    } catch (e) {
        return null;
    }
    return null;
}

// --- Main Logic ---
async function main() {
  const client = await pool.connect();
  console.log(`\n🚀 იწყება მომავლის ფილმების (${TARGET_YEAR_START}+) გასუფთავება და შეკეთება...\n`);

  try {
    // 🧹 STEP 1: უხარისხოების წაშლა (პოსტერის ან ფონის გარეშე)
    console.log("🧹 ეტაპი 1: უსურათო ფილმების წაშლა...");
    
    const deleteRes = await client.query(`
        DELETE FROM media 
        WHERE release_year >= $1
          AND (poster_path IS NULL OR backdrop_path IS NULL OR poster_path = '' OR backdrop_path = '')
    `, [TARGET_YEAR_START]);

    console.log(`   🗑️ წაიშალა ${deleteRes.rowCount} ფილმი/სერიალი (პოსტერის/ფონის გარეშე).`);
    console.log("---------------------------------------------------");

    // 🎥 STEP 2: ტრეილერების მოძიება დარჩენილებისთვის
    console.log("🎥 ეტაპი 2: ტრეილერების/ტიზერების მოძიება...");

    // ვიღებთ მხოლოდ იმათ, ვისაც ტრეილერი არ აქვს
    const moviesToFix = await client.query(`
        SELECT tmdb_id, title_ru, type, release_year 
        FROM media 
        WHERE release_year >= $1 
          AND trailer_url IS NULL
    `, [TARGET_YEAR_START]);

    console.log(`   🔍 ნაპოვნია ${moviesToFix.rowCount} ფილმი ტრეილერის გარეშე.`);

    let fixedCount = 0;

    for (const movie of moviesToFix.rows) {
        const trailerUrl = await getTrailerFromTmdb(movie.tmdb_id, movie.type);
        
        if (trailerUrl) {
            await client.query(`
                UPDATE media 
                SET trailer_url = $1, updated_at = NOW()
                WHERE tmdb_id = $2
            `, [trailerUrl, movie.tmdb_id]);
            
            console.log(`   ✅ ნაპოვნია: ${movie.title_ru} (${movie.release_year})`);
            fixedCount++;
        } else {
            console.log(`   ❌ ვერ მოიძებნა: ${movie.title_ru}`);
        }
        
        await delay(200); // პაუზა API-სთვის
    }

    console.log(`\n🎉 დასრულდა! სულ გამოსწორდა (დაემატა ტრეილერი): ${fixedCount}`);

  } catch (e) {
    console.error("შეცდომა:", e);
  } finally {
    client.release();
    await pool.end();
  }
}

main();