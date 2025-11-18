// src/pages/top.js
import React from 'react';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import Link from 'next/link';
import FilterBar from '@/components/FilterBar';

export async function getServerSideProps({ query: urlQuery }) {
  const page = parseInt(urlQuery.page) || 1;
  const limit = 24;
  const offset = (page - 1) * limit;

  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp
  `;

  let items = [];
  let total = 0;

  try {
    // Сортировка строго по рейтингу
    const sql = `
      SELECT ${columns} FROM media 
      WHERE type = 'movie' AND rating_tmdb > 0
      ORDER BY rating_tmdb DESC, rating_imdb DESC
      LIMIT $1 OFFSET $2
    `;
    const itemsRes = await query(sql, [limit, offset]);
    items = itemsRes.rows;

    const countRes = await query(`SELECT COUNT(*) FROM media WHERE type = 'movie' AND rating_tmdb > 0`);
    total = parseInt(countRes.rows[0].count);

  } catch (e) {
    console.error("Top Page Error:", e.message);
  }

  return {
    props: {
      items,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default function TopPage({ items, currentPage, totalPages }) {
  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Header />
      <div className="pt-20">
        <FilterBar />
      </div>
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 w-full">
        <h1 className="text-3xl font-bold text-white mb-8">Топ фильмы</h1>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {items.map(item => (
            <MediaCard key={item.tmdb_id} item={item} />
          ))}
        </div>

        <div className="flex justify-center mt-12 space-x-4">
          {currentPage > 1 && (
            <Link href={`/top?page=${currentPage - 1}`} className="px-4 py-2 bg-gray-800 rounded hover:bg-brand-red transition">
              ← Назад
            </Link>
          )}
          <span className="px-4 py-2 text-gray-400 bg-gray-900 rounded">
             Страница {currentPage} из {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`/top?page=${currentPage + 1}`} className="px-4 py-2 bg-gray-800 rounded hover:bg-brand-red transition">
              Вперед →
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}