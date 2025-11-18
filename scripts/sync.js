// scripts/sync.js
// ВЕРСИЯ 8: Загружаем АБСОЛЮТНО все данные (Профессиональный режим)

import { Pool } from 'pg';

// --- Конфигурация ---
const KINOBD_API_URL = 'https://kinobd.net/api/films';
const TMDB_API_KEY = 'f44912cf0212276fe1d1c6149f14803a';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const PAGES_PER_BATCH = 50; // Загружаем по 50 страниц за раз
// --- Конец Конфигурации ---

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Шаг 1: Загружаем ПАРТИЮ фильмов с kinobd.net
 */
async function fetchKinobdBatch(startPage) {
  let allMovies = [];
  let currentPage = startPage;
  let hasMore = true;
  const endPage = startPage + PAGES_PER_BATCH - 1;

  console.log(`[Шаг 1] Начинаем загрузку ПАРТИИ (Страницы ${startPage} - ${endPage})...`);

  while (hasMore && currentPage <= endPage) { 
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`  - Страница ${currentPage}: Превышен 10-секундный лимит. Прерываем.`);
      controller.abort();
    }, 10000); 

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
        await delay(1000); 
      }
      
    } catch (error) {
      clearTimeout(timeoutId); 
      if (error.name === 'AbortError') {
        console.error(`  - Ошибка на странице ${currentPage}: Запрос отменен (тайм-аут). Прерываем.`);
      } else {
        console.error(`  - Ошибка на странице ${currentPage}: ${error.message}. Прерываем.`);
      }
      hasMore = false; 
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

  // Мы также запрашиваем 'credits' (актеров), чтобы сохранить их позже
  const appendToResponse = 'append_to_response=credits';

  const urlsToTry = [
    `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&${appendToResponse}`,
    `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&${appendToResponse}`
  ];
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); 

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
  
  // 💡 --- БЕРЕМ ВСЕ ДАННЫЕ ИЗ ОБОИХ ИСТОЧНИКОВ ---
  const tmdb_id = parseInt(kinobdItem.tmdb_id);
  // (kinopoisk_id может быть null, если его нет в kinobd)
  const kinopoisk_id = kinobdItem.kinopoisk_id ? parseInt(kinobdItem.kinopoisk_id) : null;
  const type = tmdbItem.media_type;
  
  const title_ru = kinobdItem.name_russian || tmdbItem.title || tmdbItem.name || 'Без названия';
  const title_en = tmdbItem.original_title || tmdbItem.original_name;
  
  const overview = tmdbItem.overview || kinobdItem.description;
  const poster_path = tmdbItem.poster_path;
  const backdrop_path = tmdbItem.backdrop_path;

  const release_date = tmdbItem.release_date || tmdbItem.first_air_date || kinobdItem.premiere_world;
  const release_year = release_date ? parseInt(release_date.split('-')[0]) : (kinobdItem.year ? parseInt(kinobdItem.year) : null);

  // Рейтинги
  const rating_tmdb = tmdbItem.vote_average ? parseFloat(tmdbItem.vote_average.toFixed(1)) : 0.0;
  const rating_kp = kinobdItem.rating_kp ? parseFloat(kinobdItem.rating_kp.toFixed(1)) : 0.0;
  const rating_imdb = kinobdItem.rating_imdb ? parseFloat(kinobdItem.rating_imdb.toFixed(1)) : 0.0;
  const rating_kp_count = kinobdItem.rating_kp_count ? parseInt(kinobdItem.rating_kp_count) : 0;
  const rating_imdb_count = kinobdItem.rating_imdb_count ? parseInt(kinobdItem.rating_imdb_count) : 0;
  
  // Трейлер
  const trailer_url = kinobdItem.trailer;

  // Детали
  // (Для 'tv' runtime берется из 'episode_run_time', если он есть)
  const runtime = tmdbItem.runtime || (tmdbItem.episode_run_time && tmdbItem.episode_run_time[0]) || kinobdItem.time_minutes || null;
  const budget = tmdbItem.budget > 0 ? tmdbItem.budget : null; 
  const countries = (tmdbItem.production_countries || []).map(c => c.name);
  const slogan = tmdbItem.tagline || kinobdItem.slogan;
  const age_restriction = kinobdItem.age_restriction || null;
  
  // ID
  const kinobd_item_id = parseInt(kinobdItem.id);
  const imdb_id = kinobdItem.imdb_id;
  
  // Даты Премьер
  const premiere_ru = kinobdItem.premiere_ru || null;
  const premiere_world = kinobdItem.premiere_world || null;
  
  // Популярность
  const popularity = kinobdItem.popular_rate ? parseInt(kinobdItem.popular_rate) : 0;

  // Жанры
  const genres_ids = (tmdbItem.genres || []).map(g => g.id);
  const genres_names = (tmdbItem.genres || []).map(g => g.name);

  // 💡 --- ОБНОВЛЯЕМ SQL ЗАПРОС ---
  const query = `
    INSERT INTO media (
      tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
      poster_path, backdrop_path, release_year, rating_tmdb,
      genres_ids, genres_names, updated_at,
      
      trailer_url, runtime, budget, countries, rating_kp, rating_imdb,
      kinobd_item_id, imdb_id, rating_kp_count, rating_imdb_count,
      age_restriction, slogan, premiere_ru, premiere_world, popularity
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(),
      $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
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
      updated_at = NOW(),
      trailer_url = EXCLUDED.trailer_url,
      runtime = EXCLUDED.runtime,
      budget = EXCLUDED.budget,
      countries = EXCLUDED.countries,
      rating_kp = EXCLUDED.rating_kp,
      rating_imdb = EXCLUDED.rating_imdb,
      kinobd_item_id = EXCLUDED.kinobd_item_id,
      imdb_id = EXCLUDED.imdb_id,
      rating_kp_count = EXCLUDED.rating_kp_count,
      rating_imdb_count = EXCLUDED.rating_imdb_count,
      age_restriction = EXCLUDED.age_restriction,
      slogan = EXCLUDED.slogan,
      premiere_ru = EXCLUDED.premiere_ru,
      premiere_world = EXCLUDED.premiere_world,
      popularity = EXCLUDED.popularity;
  `;

  const values = [
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    trailer_url, runtime, budget, countries, rating_kp, rating_imdb,
    kinobd_item_id, imdb_id, rating_kp_count, rating_imdb_count,
    age_restriction, slogan, premiere_ru, premiere_world, popularity
  ];

  try {
    await client.query(query, values);
    return { success: true, title: title_ru };
  } catch (error) {
    console.error(`  - Ошибка SQL (ID: ${tmdb_id}): ${error.message}`);
    return { success: false };
  }
}

// --- Главная функция Скрипта (без изменений) ---
async function main() {
  
  const args = process.argv.slice(2);
  const startPageArg = args.find(arg => arg.startsWith('--start='));
  const startPage = startPageArg ? parseInt(startPageArg.split('=')[1]) : 1;

  // Шаг 1
  const kinobdMovies = await fetchKinobdBatch(startPage);
  
  if (kinobdMovies.length === 0) {
    console.log('Не удалось загрузить фильмы с kinobd.net (или в этой партии нет фильмов). Завершение.');
    return;
  }
  
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

    if (!kinobdItem.tmdb_id) {
      console.log(`${logPrefix} Пропуск (нет tmdb_id).`);
      skippedCount++;
      continue;
    }

    const tmdbItem = await fetchTmdbDetails(kinobdItem.tmdb_id);

    if (!tmdbItem) {
      console.log(`${logPrefix} Пропуск (не найден на TMDB или тайм-аут).`);
      skippedCount++;
      await delay(200); 
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