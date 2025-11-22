// scripts/clean-recent-risky.js
// 🧹 Deletes KP IDs for NON-Russian titles updated in the last 6 hours.
// 🛠️ Fixed: Uses 'tmdb_id' instead of 'id'

import 'dotenv/config';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  console.error("❌ .env ფაილი არასწორია.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    const client = await pool.connect();
    console.log(`🧹 "რისკ-წმენდა" ჩაირთო... ვეძებთ უცხოურენოვან სათაურებს ბოლო 6 საათიდან.`);

    try {
        // 1. ვიღებთ ჩანაწერებს (tmdb_id-ით)
        const res = await client.query(`
            SELECT tmdb_id, title_ru, kinopoisk_id
            FROM media
            WHERE updated_at > NOW() - INTERVAL '6 hours'
              AND title_ru !~ '[а-яА-ЯёЁ]' 
              AND kinopoisk_id IS NOT NULL
        `);

        if (res.rows.length === 0) {
            console.log("✅ სარისკო ჩანაწერები არ მოიძებნა ბოლო 6 საათში.");
        } else {
            console.log(`⚠️ ნაპოვნია ${res.rows.length} სარისკო ჩანაწერი. ვიწყებთ წაშლას...`);
            
            for (const item of res.rows) {
                // KP ID-ს გასუფთავება (tmdb_id-ით)
                await client.query(`
                    UPDATE media 
                    SET kinopoisk_id = NULL, 
                        rating_kp = 0, 
                        rating_imdb = 0, 
                        trailer_url = NULL,
                        updated_at = NOW()
                    WHERE tmdb_id = $1
                `, [item.tmdb_id]);

                console.log(`   🗑️ წაიშალა ID (${item.kinopoisk_id}) ფილმზე: "${item.title_ru}"`);
            }
            console.log("\n✅ დასრულდა! არასწორი ID-ები გასუფთავებულია.");
        }

    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    } finally {
        client.release();
        pool.end();
    }
}

main();