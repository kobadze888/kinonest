// scripts/check-stats.js
// Скрипт для быстрой проверки статистики базы

import { Pool } from 'pg';

const KINOBD_API_URL = 'https://kinobd.net/api/films';

async function main() {
  console.log('Подключаемся к базе данных (Neon)...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // 1. Считаем фильмы в нашей базе
    const res = await client.query('SELECT COUNT(*) FROM media');
    const dbCount = parseInt(res.rows[0].count);

    // 2. Узнаем общее количество на API
    const response = await fetch(`${KINOBD_API_URL}?page=1`);
    const data = await response.json();
    const totalApi = data.total || (data.last_page * 50); // Примерный подсчет

    console.log('\n📊 --- СТАТИСТИКА KINONEST ---');
    console.log(`✅ Загружено в Neon:  ${dbCount}`);
    console.log(`🌍 Всего на API:      ~${totalApi}`);
    
    const percent = ((dbCount / totalApi) * 100).toFixed(1);
    console.log(`📈 Прогресс:          ${percent}%`);
    console.log('-----------------------------');

  } catch (e) {
    console.error('Ошибка:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
