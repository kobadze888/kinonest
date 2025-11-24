// scripts/check-full-health.js
// 📊 "The Doctor": Full Database Health Check & Statistics

import 'dotenv/config';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  console.error("❌ .env ფაილი არასწორია.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    const client = await pool.connect();
    console.log(`\n📊 --- ბაზის სრული დიაგნოსტიკა ---\n`);

    try {
        // 1. ზოგადი რაოდენობა
        const totalRes = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE type = 'movie') as movies,
                COUNT(*) FILTER (WHERE type = 'tv') as tv_shows
            FROM media
        `);
        const { total, movies, tv_shows } = totalRes.rows[0];

        console.log(`📦 სულ მედია:      ${total}`);
        console.log(`   🎬 ფილმები:      ${movies}`);
        console.log(`   📺 სერიალები:    ${tv_shows}`);
        console.log('-------------------------------------------');

        // 2. დანაკლისი (Missing Data)
        const missingRes = await client.query(`
            SELECT 
                COUNT(*) FILTER (WHERE kinopoisk_id IS NULL) as missing_kp,
                COUNT(*) FILTER (WHERE trailer_url IS NULL) as missing_trailer,
                COUNT(*) FILTER (WHERE rating_imdb = 0) as missing_imdb,
                COUNT(*) FILTER (WHERE rating_kp = 0) as missing_kp_rating
            FROM media
        `);
        const m = missingRes.rows[0];

        console.log(`⚠️  პრობლემური ჩანაწერები:`);
        console.log(`   ❌ KP ID აკლია:        ${m.missing_kp}  (აუცილებელია პლეერისთვის)`);
        console.log(`   ❌ ტრეილერი აკლია:     ${m.missing_trailer}`);
        console.log(`   ❌ IMDb რეიტინგი 0:    ${m.missing_imdb}`);
        console.log(`   ❌ KP რეიტინგი 0:      ${m.missing_kp_rating}`);
        console.log('-------------------------------------------');

        // 3. ბოლო 2025 და 2024 წლების სტატუსი (ყველაზე მნიშვნელოვანი)
        console.log(`📅  ბოლო წლების სტატუსი:`);
        
        const yearsRes = await client.query(`
            SELECT 
                release_year,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE kinopoisk_id IS NULL) as no_id
            FROM media
            WHERE release_year >= 2023
            GROUP BY release_year
            ORDER BY release_year DESC
        `);

        yearsRes.rows.forEach(row => {
            const status = row.no_id == 0 ? "✅" : "⚠️";
            console.log(`   ${status} ${row.release_year}: სულ ${row.total} | ID აკლია: ${row.no_id}`);
        });
        console.log('-------------------------------------------');

        // 4. ბოლო 24 საათში დამატებულები
        const recentRes = await client.query(`
            SELECT COUNT(*) as count FROM media 
            WHERE created_at > NOW() - INTERVAL '24 hours'
        `);
        console.log(`🆕  ბოლო 24 საათში დაემატა: ${recentRes.rows[0].count}`);

    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    } finally {
        client.release();
        pool.end();
    }
}

main();