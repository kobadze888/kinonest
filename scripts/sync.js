// scripts/sync.js
// ВЕРСИЯ 11: Полная синхронизация + Актеры + Умный Поиск

import { Pool } from 'pg';
import { slugify } from '../src/lib/utils.js'; // Импортируем slugify

const KINOBD_API_URL = 'https://kinobd.net/api/films';
const TMDB_API_KEY = 'f44912cf0212276fe1d1c6149f14803a';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const PAGES_PER_BATCH = 50;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ... (fetchKinobdBatch и fetchTmdbDetails остаются БЕЗ ИЗМЕНЕНИЙ, как в v10) ...
// ... (для краткости я их пропущу, но ты используй код из v10 для этих двух функций)
// ВАЖНО: Вставь сюда функции fetchKinobdBatch и fetchTmdbDetails из v10!

async function fetchKinobdBatch(startPage) {
  let allMovies = [];
  let currentPage = startPage;
  let hasMore = true;
  const endPage = startPage + PAGES_PER_BATCH - 1;

  console.log(`[Шаг 1] Начинаем загрузку ПАРТИИ (Страницы ${startPage} - ${endPage})...`);

  while (hasMore && currentPage <= endPage) { 
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`  - Страница ${currentPage}: Превышен 10-секундный лимит.`);
      controller.abort();
    }, 10000);

    try {
      const response = await fetch(`${KINOBD_API_URL}?page=${currentPage}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Ошибка API: ${response.status}`);
      const data = await response.json();
      if (data.data?.length > 0) allMovies.push(...data.data);
      hasMore = data.has_more || false;
      currentPage++;
      if (hasMore && currentPage <= endPage) await delay(1000);
    } catch (error) {
      clearTimeout(timeoutId); hasMore = false; 
    }
  }
  console.log(`[Шаг 1] Готово. Загружено ${allMovies.length} записей.`);
  return allMovies;
}

async function fetchTmdbDetails(tmdbId) {
  if (!tmdbId) return null;
  const appendToResponse = 'append_to_response=credits';
  const urls = [
    `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&${appendToResponse}`,
    `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU&${appendToResponse}`
  ];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); 
  try {
    for (const url of urls) {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        clearTimeout(timeoutId);
        const data = await res.json();
        data.media_type = url.includes('/movie/') ? 'movie' : 'tv';
        return data;
      }
    }
    clearTimeout(timeoutId);
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    return null;
  }
}


async function upsertMediaToDB(client, kinobdItem, tmdbItem) {
  const tmdb_id = parseInt(kinobdItem.tmdb_id);
  
  // Генерируем search_slug для поиска
  const title_ru = kinobdItem.name_russian || tmdbItem.title || tmdbItem.name || 'Без названия';
  const search_slug = slugify(title_ru); 

  // ... (Остальные переменные как в v10) ...
  const release_date = tmdbItem.release_date || tmdbItem.first_air_date || kinobdItem.premiere_world;
  const release_year = release_date ? parseInt(release_date.split('-')[0]) : (kinobdItem.year ? parseInt(kinobdItem.year) : null);
  const runtime = tmdbItem.runtime || (tmdbItem.episode_run_time && tmdbItem.episode_run_time[0]) || kinobdItem.time_minutes || null;
  const countries = (tmdbItem.production_countries || []).map(c => c.name);

  const mediaQuery = `
    INSERT INTO media (
      tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
      poster_path, backdrop_path, release_year, rating_tmdb,
      genres_ids, genres_names, updated_at,
      trailer_url, runtime, budget, countries, rating_kp, rating_imdb,
      kinobd_item_id, imdb_id, rating_kp_count, rating_imdb_count,
      age_restriction, slogan, premiere_ru, premiere_world, popularity,
      search_slug -- 💡 НОВОЕ ПОЛЕ
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(),
      $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
      $28
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
      popularity = EXCLUDED.popularity,
      search_slug = EXCLUDED.search_slug; -- 💡 ОБНОВЛЯЕМ
  `;

  const mediaValues = [
    tmdb_id, 
    kinobdItem.kinopoisk_id ? parseInt(kinobdItem.kinopoisk_id) : null, 
    tmdbItem.media_type,
    title_ru,
    tmdbItem.original_title || tmdbItem.original_name,
    tmdbItem.overview || kinobdItem.description,
    tmdbItem.poster_path,
    tmdbItem.backdrop_path,
    release_year,
    tmdbItem.vote_average ? parseFloat(tmdbItem.vote_average.toFixed(1)) : 0.0,
    (tmdbItem.genres || []).map(g => g.id),
    (tmdbItem.genres || []).map(g => g.name),
    kinobdItem.trailer,
    runtime,
    tmdbItem.budget > 0 ? tmdbItem.budget : null,
    countries,
    kinobdItem.rating_kp ? parseFloat(kinobdItem.rating_kp.toFixed(1)) : 0.0,
    kinobdItem.rating_imdb ? parseFloat(kinobdItem.rating_imdb.toFixed(1)) : 0.0,
    parseInt(kinobdItem.id),
    kinobdItem.imdb_id,
    kinobdItem.rating_kp_count ? parseInt(kinobdItem.rating_kp_count) : 0,
    kinobdItem.rating_imdb_count ? parseInt(kinobdItem.rating_imdb_count) : 0,
    kinobdItem.age_restriction || null,
    tmdbItem.tagline || kinobdItem.slogan,
    kinobdItem.premiere_ru || null,
    kinobdItem.premiere_world || null,
    kinobdItem.popular_rate ? parseInt(kinobdItem.popular_rate) : 0,
    search_slug // 💡
  ];

  try {
    await client.query(mediaQuery, mediaValues);

    // 2. Сохраняем АКТЕРОВ (как в v10)
    if (tmdbItem.credits && tmdbItem.credits.cast) {
      const cast = tmdbItem.credits.cast.slice(0, 10);
      for (let i = 0; i < cast.length; i++) {
        const actor = cast[i];
        await client.query(`
          INSERT INTO actors (id, name, original_name, profile_path, popularity)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            profile_path = EXCLUDED.profile_path,
            popularity = EXCLUDED.popularity
        `, [actor.id, actor.name, actor.original_name, actor.profile_path, actor.popularity]);

        await client.query(`
          INSERT INTO media_actors (media_id, actor_id, character, "order")
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (media_id, actor_id) DO NOTHING
        `, [tmdb_id, actor.id, actor.character, i]);
      }
    }
    return { success: true, title: title_ru };
  } catch (error) {
    console.error(`  - Ошибка SQL (ID: ${tmdb_id}): ${error.message}`);
    return { success: false };
  }
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const startPageArg = args.find(arg => arg.startsWith('--start='));
  const startPage = startPageArg ? parseInt(startPageArg.split('=')[1]) : 1;

  const kinobdMovies = await fetchKinobdBatch(startPage);
  if (kinobdMovies.length === 0) { console.log('Нет фильмов. Выход.'); return; }
  
  console.log('Подключаемся к базе данных (Neon)...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  console.log('...Успешно.');

  console.log(`[Шаг 2/3] Обработка ${kinobdMovies.length} записей...`);
  let successCount = 0;
  for (let i = 0; i < kinobdMovies.length; i++) {
    const item = kinobdMovies[i];
    if (!item.tmdb_id) continue;
    const tmdbItem = await fetchTmdbDetails(item.tmdb_id);
    if (!tmdbItem) { await delay(200); continue; }
    const { success, title } = await upsertMediaToDB(client, item, tmdbItem);
    if (success) { console.log(`(${i + 1}/${kinobdMovies.length}) OK: "${title}"`); successCount++; }
    await delay(200);
  }
  console.log(`--- ПАРТИЯ ЗАВЕРШЕНА ---`);
  await client.release();
  await pool.end();
}

main().catch(err => console.error(err));