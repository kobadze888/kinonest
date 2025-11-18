// src/pages/search.js (ВАРИАНТ А: Быстрый поиск)
import React from 'react';
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';

/**
 * Серверная функция (SSR) для поиска
 */
export async function getServerSideProps(context) {
  const { q } = context.query; // Получаем поисковый запрос (q=...) из URL

  if (!q || q.trim() === '') {
    // Если запрос пустой, не делаем SQL-запрос
    return { props: { results: [], query: '' } };
  }

  // 1. Готовим запрос для "умного" FTS-поиска (Русский, Английский, Описание)
  // 'Криминальное чтиво' -> 'Криминальное & чтиво'
  const ftsQuery = q.trim().split(' ').filter(Boolean).join(' & ');

  // 2. Список полей (с исправлением дат)
  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT,
    trailer_url, runtime, budget, countries, rating_kp, rating_imdb,
    kinobd_item_id, imdb_id, rating_kp_count, rating_imdb_count,
    age_restriction, slogan, premiere_ru::TEXT, premiere_world::TEXT, popularity
  `;

  let results = [];
  try {
    // 3. Выполняем "умный" поиск FTS (БЕЗ 'search_slug')
    const dbResult = await query(
      `SELECT ${columns} FROM media 
       WHERE 
         -- 1. Ищем по РУССКОМУ названию + описанию
         to_tsvector('russian', title_ru || ' ' || overview) @@ to_tsquery('russian', $1)
         OR
         -- 2. Ищем по АНГЛИЙСКОМУ названию
         to_tsvector('english', title_en) @@ to_tsquery('english', $1)
       
       ORDER BY release_year DESC
       LIMIT 20`, 
      [ftsQuery] // 💡 Передаем только один параметр
    );
    results = dbResult.rows;
  } catch (e) {
    console.error("Search SSR Error:", e.message);
  }

  return {
    props: {
      results: results,
      query: q, // Возвращаем оригинальный запрос 'q' для отображения
    },
  };
}


/**
 * Компонент страницы Поиска
 */
export default function SearchPage({ results, query }) {
  const router = useRouter();

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen">
      {/* Ваш Header.js (Self-contained) уже готов к работе.
        Мы передаем 'key'={router.asPath}, чтобы он принудительно 
        перерисовывался, если пользователь ищет что-то новое
        (например, со страницы /search?q=A на /search?q=B).
      */}
      <Header key={router.asPath} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {query ? (
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Результаты поиска: <span className="text-brand-red">"{query}"</span>
          </h1>
        ) : (
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Пожалуйста, введите поисковый запрос
          </h1>
        )}

        {results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {results.map(item => (
              <MediaCard key={item.tmdb_id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-gray-400">
            {query ? 'По вашему запросу ничего не найдено.' : '...'}
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}