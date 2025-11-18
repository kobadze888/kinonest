// src/pages/search.js (УМНЫЙ ПОИСК: RU + EN + TRANSLIT + QUOTES)
import React from 'react';
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import { slugify } from '@/lib/utils'; // Импортируем slugify для транслита

export async function getServerSideProps(context) {
  const { q } = context.query;
  if (!q || q.trim() === '') return { props: { results: [], query: '' } };

  const rawQuery = q.trim();

  // 1. Подготовка для FTS (Русский + Английский)
  // Очищаем от спецсимволов для tsquery
  const cleanQuery = rawQuery.replace(/[^\w\sа-яА-ЯёЁ]/g, '');
  const ftsQuery = cleanQuery.split(/\s+/).filter(Boolean).map(w => w + ':*').join(' & ');

  // 2. Транслит (для поиска по search_slug)
  const slugQuery = slugify(rawQuery); 

  // 💡 Запрашиваем все необходимые поля (даты как TEXT)
  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp
  `;

  let results = [];
  try {
    // 💡 Используем "SIMILARITY" (сходство) для транслита
    // Это позволяет находить "krestni" даже если в базе "krestnyy"
    
    const sql = `
      SELECT ${columns},
      -- Вычисляем релевантность для сортировки
      GREATEST(
        ts_rank(to_tsvector('russian', title_ru), to_tsquery('russian', $1)),
        similarity(search_slug, $2) -- Сходство по транслиту
      ) as rank
      FROM media 
      WHERE 
        -- 1. Русский FTS (название + описание)
        to_tsvector('russian', title_ru || ' ' || COALESCE(overview, '')) @@ to_tsquery('russian', $1)
        OR
        -- 2. Английский FTS (название)
        to_tsvector('english', COALESCE(title_en, '')) @@ to_tsquery('english', $1)
        OR
        -- 3. Транслит (Нечеткий поиск - Fuzzy Search)
        -- Ищем, если search_slug ПОХОЖ на запрос или содержит его
        search_slug ILIKE '%' || $2 || '%' 
        OR
        similarity(search_slug, $2) > 0.3 -- Порог сходства (0.3 - достаточно мягкий)
      
      ORDER BY rank DESC, rating_tmdb DESC
      LIMIT 40
    `;

    const finalFtsQuery = ftsQuery || 'пустой_запрос'; 
    
    // ВАЖНО: Мы должны передать slugQuery БЕЗ процентов для similarity()
    const dbResult = await query(sql, [finalFtsQuery, slugQuery]);
    results = dbResult.rows;
  } catch (e) {
    console.error("Search Error:", e.message);
  }

  return { props: { results, query: rawQuery } };
}

export default function SearchPage({ results, query }) {
    const router = useRouter();
    return (
        <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
             <Header key={router.asPath} />
             <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
                <div className="mb-8">
                     {query ? (
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            Результаты поиска: <span className="text-brand-red">«{query}»</span>
                        </h1>
                     ) : (
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Поиск</h1>
                     )}
                     {results.length > 0 && <p className="text-gray-400 mt-2">Найдено: {results.length}</p>}
                </div>
                {results.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {results.map(item => <MediaCard key={item.tmdb_id} item={item} />)}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="text-6xl mb-4">🔍</div>
                        <h2 className="text-xl font-semibold text-white mb-2">Ничего не найдено</h2>
                        <p className="text-gray-400 max-w-md">Попробуйте изменить запрос или ввести другое название.</p>
                    </div>
                )}
             </main>
             <Footer />
        </div>
    );
}