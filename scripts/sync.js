// scripts/sync.js
// Этот скрипт запускается из терминала: node scripts/sync.js

import { Pool } from 'pg'; // Используем 'pg' из вашего package.json
import dotenv from 'dotenv'; // Используем 'dotenv' из вашего package.json

// --- Конфигурация ---
// Загружаем переменные окружения (DATABASE_URL)
dotenv.config();

// API плеера (отсюда берем kinopoisk_id)
const KINOBD_API_URL = 'https://kinobd.net/api/films';

// TMDB API (отсюда берем всю информацию)
const TMDB_API_KEY = 'f44912cf0212276fe1d1c6149f14803a'; //
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
// --- Конец Конфигурации ---

// Вспомогательная функция для небольшой задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Шаг 1: Загружаем ВСЕ фильмы с kinobd.net (все страницы)
 */
async function fetchAllKinobdMovies() {
  let allMovies = [];
  let currentPage = 1;
  let hasMore = true;

  console.log('[Шаг 1] Начинаем загрузку с kinobd.net...');

  while (hasMore) {
    try {
      const url = `${KINOBD_API_URL}?page=${currentPage}`;
      console.log(`  - Загружаем страницу ${currentPage}...`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Ошибка API kinobd: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        allMovies.push(...data.data);
      }
      
      hasMore = data.has_more || false;
      currentPage++;
      
      // Будем вежливы к API kinobd
      if (hasMore) {
        await delay(250); // 250мс задержка
      }
      
    } catch (error) {
      console.error(`  - Ошибка на странице ${currentPage}: ${error.message}. Прерываем.`);
      hasMore = false;
    }
  }

  console.log(`[Шаг 1] Готово. Загружено ${allMovies.length} записей с kinobd.net.`);
  return allMovies;
}

/**
 * Шаг 2: Получаем полную информацию с TMDB.
 * Мы не знаем, 'movie' это или 'tv', поэтому пробуем оба варианта.
 */
async function fetchTmdbDetails(tmdbId) {
  if (!tmdbId) return null;

  const urlsToTry = [
    `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU`,
    `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU`
  ];

  try {
    // Пробуем /movie
    let response = await fetch(urlsToTry[0]);
    if (response.ok) {
      const data = await response.json();
      return { ...data, media_type: 'movie' };
    }

    // Если не /movie, пробуем /tv
    response = await fetch(urlsToTry[1]);
    if (response.ok) {
      const data = await response.json();
      return { ...data, media_type: 'tv' };
    }
    
    // Если не нашли ни там, ни там
    return null;

  } catch (error) {
    console.error(`  - Ошибка при запросе к TMDB (ID: ${tmdbId}): ${error.message}`);
    return null;
  }
}

/**
 * Шаг 3: Сохраняем объединенные данные в нашу базу Postgres
 */
async function upsertMediaToDB(client, kinobdItem, tmdbItem) {
  // 1. Готовим данные для SQL
  const tmdb_id = parseInt(kinobdItem.tmdb_id);
  const kinopoisk_id = parseInt(kinobdItem.kinopoisk_id);
  const type = tmdbItem.media_type; // 'movie' или 'tv'
  
  // Русское название берем из kinobd, оно там обычно лучше
  const title_ru = kinobdItem.name_russian || tmdbItem.title || tmdbItem.name;
  const title_en = tmdbItem.original_title || tmdbItem.original_name;
  
  const overview = tmdbItem.overview;
  const poster_path = tmdbItem.poster_path;
  const backdrop_path = tmdbItem.backdrop_path;

  // Нормализуем год (у сериалов 'first_air_date')
  const release_date = tmdbItem.release_date || tmdbItem.first_air_date;
  const release_year = release_date ? parseInt(release_date.split('-')[0]) : null;

  const rating_tmdb = tmdbItem.vote_average ? parseFloat(tmdbItem.vote_average.toFixed(1)) : 0.0;

  const genres_ids = (tmdbItem.genres || []).map(g => g.id);
  const genres_names = (tmdbItem.genres || []).map(g => g.name);

  // 2. SQL-Запрос (UPSERT)
  // Пытаемся вставить (INSERT). Если `tmdb_id` уже существует (ON CONFLICT),
  // то обновляем (UPDATE) существующую запись.
  const query = `
    INSERT INTO media (
      tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
      poster_path, backdrop_path, release_year, rating_tmdb,
      genres_ids, genres_names, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
    )
    ON CONFLICT (tmdb_id) DO UPDATE SET
      kinopoisk_id = EXCLUDED.kinopoisk_id,
      type = EXCLUDED.type,
      title_ru = EXCLUDED.title_ru,
      title_en = EXCLUDED.title_en,
      overview = EXCLUDED.overview,
      poster_path = EXCLUDED.poster_path,
      backdrop_path = EXCLUDED.backdrop_path,
      release_year = EXCLUDED.release_year,
      rating_tmdb = EXCLUDED.rating_tmdb,
      genres_ids = EXCLUDED.genres_ids,
      genres_names = EXCLUDED.genres_names,
      updated_at = NOW();
  `;

  const values = [
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names
  ];

  // 3. Выполняем запрос
  try {
    await client.query(query, values);
    return true;
  } catch (error) {
    console.error(`  - Ошибка SQL (ID: ${tmdb_id}): ${error.message}`);
    return false;
  }
}

// --- Главная функция Скрипта ---
async function main() {
  // Подключаемся к базе данных
  // (Берет `DATABASE_URL` из .env файла)
  console.log('Подключаемся к базе данных...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Как в вашем src/lib/db.js
  });
  const client = await pool.connect();
  console.log('...Успешно подключено.');

  // Шаг 1
  const kinobdMovies = await fetchAllKinobdMovies();

  // Шаг 2 и 3
  console.log(`[Шаг 2/3] Начинаем обработку ${kinobdMovies.length} записей...`);
  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < kinobdMovies.length; i++) {
    const kinobdItem = kinobdMovies[i];
    const logPrefix = `(${i + 1}/${kinobdMovies.length}) ID ${kinobdItem.tmdb_id}:`;

    if (!kinobdItem.tmdb_id || !kinobdItem.kinopoisk_id) {
      console.log(`${logPrefix} Пропуск (нет tmdb_id или kinopoisk_id).`);
      skippedCount++;
      continue;
    }

    // Получаем детали с TMDB
    const tmdbItem = await fetchTmdbDetails(kinobdItem.tmdb_id);

    if (!tmdbItem) {
      console.log(`${logPrefix} Пропуск (не найден на TMDB).`);
      skippedCount++;
      await delay(100); // Задержка, чтобы не "атаковать" TMDB
      continue;
    }

    // Сохраняем в базу
    const success = await upsertMediaToDB(client, kinobdItem, tmdbItem);
    if (success) {
      console.log(`${logPrefix} Успешно (${tmdbItem.media_type}) "${title_ru}"`);
      successCount++;
    } else {
      skippedCount++;
    }
    
    // ВАЖНО: Задержка, чтобы не превысить лимиты TMDB API (у них ~50 запросов/сек)
    await delay(100); // 100мс = 10 запросов в секунду. Безопасно.
  }

  console.log('--- СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА ---');
  console.log(`Успешно добавлено/обновлено: ${successCount}`);
  console.log(`Пропущено/ошибки: ${skippedCount}`);

  // Закрываем соединение с базой
  await client.release();
  await pool.end();
}

// Запускаем
main().catch(err => {
  console.error('КРИТИЧЕСКАЯ ОШИБКА:', err);
  process.exit(1);
});