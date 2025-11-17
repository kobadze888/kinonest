// scripts/sync.js
// ВЕРСИЯ 6: Пакетный режим (Batch Mode)

import { Pool } from 'pg';

// --- Конфигурация ---
const KINOBD_API_URL = 'https://kinobd.net/api/films';
const TMDB_API_KEY = 'f44912cf0212276fe1d1c6149f14803a';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const PAGES_PER_BATCH = 50; // 💡 Загружаем по 50 страниц за раз (~2500 фильмов)
// --- Конец Конфигурации ---

// Вспомогательная функция для задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Шаг 1: Загружаем ПАРТИЮ фильмов с kinobd.net
 */
async function fetchKinobdBatch(startPage) {
  let allMovies = [];
  let currentPage = startPage;
  let hasMore = true;
  // 💡 Определяем, на какой странице остановиться
  const endPage = startPage + PAGES_PER_BATCH - 1;

  console.log(`[Шаг 1] Начинаем загрузку ПАРТИИ (Страницы ${startPage} - ${endPage})...`);

  while (hasMore && currentPage <= endPage) { 
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`  - Страница ${currentPage}: Превышен 10-секундный лимит. Прерываем.`);
      controller.abort();
    }, 10000); // 10 секунд

    try {
      const url = `${KINOBD_API_URL}?page=${currentPage}`;
      console.log(`  - Загружаем страницу ${currentPage}...`);
      
      const response = await fetch(url, {
        signal: controller.signal 
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Ошибка API kinobd: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        allMovies.push(...data.data);
      }
      
      hasMore = data.has_more || false;
      currentPage++;
      
      if (hasMore && currentPage <= endPage) {
        await delay(1000); // 1 секунда
      }
      
    } catch (error) {
      clearTimeout(timeoutId); 
      if (error.name === 'AbortError') {
        console.error(`  - Ошибка на странице ${currentPage}: Запрос отменен (тайм-аут). Прерываем.`);
      } else {
        console.error(`  - Ошибка на странице ${currentPage}: ${error.message}. Прерываем.`);
      }
      hasMore = false; // Останавливаем цикл в случае ошибки
    }
  }

  console.log(`[Шаг 1] Готово. Загружено ${allMovies.length} записей.`);
  return allMovies;
}

/**
 * Шаг 2: Получаем полную информацию с TMDB.
 */
async function fetchTmdbDetails(tmdbId) {
  if (!tmdbId) return null;

  const urlsToTry = [
    `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU`,
    `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU`
  ];
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 сек

  try {
    let response = await fetch(urlsToTry[0], { signal: controller.signal });
    if (response.ok) {
      clearTimeout(timeoutId);
      const data = await response.json();
      return { ...data, media_type: 'movie' };
    }

    response = await fetch(urlsToTry[1], { signal: controller.signal });
    if (response.ok) {
      clearTimeout(timeoutId);
      const data = await response.json();
      return { ...data, media_type: 'tv' };
    }
    
    clearTimeout(timeoutId);
    return null;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name !== 'AbortError') {
      console.error(`  - Ошибка при запросе к TMDB (ID: ${tmdbId}): ${error.message}`);
    }
    return null;
  }
}

/**
 * Шаг 3: Сохраняем объединенные данные в нашу базу Postgres
 */
async function upsertMediaToDB(client, kinobdItem, tmdbItem) {
  const tmdb_id = parseInt(kinobdItem.tmdb_id);
  const kinopoisk_id = parseInt(kinobdItem.kinopoisk_id);
  const type = tmdbItem.media_type;
  
  const title_ru = kinobdItem.name_russian || tmdbItem.title || tmdbItem.name || 'Без названия';
  const title_en = tmdbItem.original_title || tmdbItem.original_name;
  
  const overview = tmdbItem.overview;
  const poster_path = tmdbItem.poster_path;
  const backdrop_path = tmdbItem.backdrop_path;

  const release_date = tmdbItem.release_date || tmdbItem.first_air_date;
  const release_year = release_date ? parseInt(release_date.split('-')[0]) : null;

  const rating_tmdb = tmdbItem.vote_average ? parseFloat(tmdbItem.vote_average.toFixed(1)) : 0.0;

  const genres_ids = (tmdbItem.genres || []).map(g => g.id);
  const genres_names = (tmdbItem.genres || []).map(g => g.name);

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

  try {
    await client.query(query, values);
    return { success: true, title: title_ru };
  } catch (error) {
    console.error(`  - Ошибка SQL (ID: ${tmdb_id}): ${error.message}`);
    return { success: false };
  }
}

// --- Главная функция Скрипта ---
async function main() {
  
  // 💡 --- ЧИТАЕМ АРГУМЕНТЫ КОМАНДНОЙ СТРОКИ ---
  const args = process.argv.slice(2);
  const startPageArg = args.find(arg => arg.startsWith('--start='));
  const startPage = startPageArg ? parseInt(startPageArg.split('=')[1]) : 1;
  // 💡 --- КОНЕЦ ---

  // Шаг 1
  const kinobdMovies = await fetchKinobdBatch(startPage);
  
  if (kinobdMovies.length === 0) {
    console.log('Не удалось загрузить фильмы с kinobd.net (или в этой партии нет фильмов). Завершение.');
    return;
  }
  
  // Подключаемся к базе ТОЛЬКО СЕЙЧАС
  console.log('Подключаемся к базе данных (Neon)...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  let client;
  try {
    client = await pool.connect();
    console.log('...Успешно подключено.');
  } catch (err) {
    console.error('КРИТИЧЕСКАЯ ОШИБКА ПОДКЛЮЧЕНИЯ:', err.message);
    return;
  }

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

    const tmdbItem = await fetchTmdbDetails(kinobdItem.tmdb_id);

    if (!tmdbItem) {
      console.log(`${logPrefix} Пропуск (не найден на TMDB или тайм-аут).`);
      skippedCount++;
      await delay(200); // Небольшая задержка
      continue;
    }

    const { success, title } = await upsertMediaToDB(client, kinobdItem, tmdbItem);
    
    if (success) {
      console.log(`${logPrefix} Успешно (${tmdbItem.media_type}) "${title}"`);
      successCount++;
    } else {
      skippedCount++;
    }
    
    await delay(200); 
  }

  console.log(`--- СИНХРОНИЗАЦИЯ ПАРТИИ (НАЧИНАЯ С ${startPage}) ЗАВЕРШЕНА ---`);
  console.log(`Успешно добавлено/обновлено: ${successCount}`);
  console.log(`Пропущено/ошибки: ${skippedCount}`);

  await client.release();
  await pool.end();
}

// Запускаем
main().catch(err => {
  console.error('КРИТИЧЕСКАЯ НЕОБРАБОТАННАЯ ОШИБКА:', err);
  process.exit(1);
});