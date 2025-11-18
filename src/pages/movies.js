// src/pages/movies.js (Страница "Все фильмы")
import React from 'react';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import Link from 'next/link';

export async function getServerSideProps({ query: urlQuery }) {
  const page = parseInt(urlQuery.page) || 1;
  const limit = 20; // Количество фильмов на странице
  const offset = (page - 1) * limit;

  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp
  `;

  let movies = [];
  let total = 0;

  try {
    // 1. Получаем фильмы (только type='movie')
    const moviesRes = await query(`
      SELECT ${columns} FROM media 
      WHERE type = 'movie'
      ORDER BY release_year DESC NULLS LAST, rating_tmdb DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    movies = moviesRes.rows;

    // 2. Считаем общее количество для пагинации
    const countRes = await query(`SELECT COUNT(*) FROM media WHERE type = 'movie'`);
    total = parseInt(countRes.rows[0].count);

  } catch (e) {
    console.error("Movies Page Error:", e.message);
  }

  return {
    props: {
      movies,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default function MoviesPage({ movies, currentPage, totalPages }) {
  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <h1 className="text-3xl font-bold text-white mb-8">Фильмы</h1>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {movies.map(movie => (
            <MediaCard key={movie.tmdb_id} item={movie} />
          ))}
        </div>

        {/* Пагинация */}
        <div className="flex justify-center mt-12 space-x-4">
          {currentPage > 1 && (
            <Link href={`/movies?page=${currentPage - 1}`} className="px-4 py-2 bg-gray-800 rounded hover:bg-brand-red transition">
              ← Назад
            </Link>
          )}
          <span className="px-4 py-2 text-gray-400">
            Страница {currentPage} из {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`/movies?page=${currentPage + 1}`} className="px-4 py-2 bg-gray-800 rounded hover:bg-brand-red transition">
              Вперед →
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}