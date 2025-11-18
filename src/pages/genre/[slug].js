// src/pages/genre/[slug].js (Stranica zhanra)
import React from 'react';
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';

export async function getServerSideProps(context) {
  const { slug, page } = context.query;
  const currentPage = parseInt(page) || 1;
  const limit = 20;
  const offset = (currentPage - 1) * limit;

  // Dekodiruem slug (naprimer, "komediya")
  // No v nashey baze zhanry na russkom, naprimer "Комедия" ili "боевик"
  // My budem iskat' chastichnoe sovpadenie v massive genres_names
  
  // Primitivnyy mapping dlya primera (mozhno rasshirit')
  const genreMap = {
    'action': 'боевик',
    'comedy': 'комедия',
    'drama': 'драма',
    'horror': 'ужасы',
    'scifi': 'фантастика',
    'thriller': 'триллер',
    'adventure': 'приключения',
    'animation': 'мультфильм',
    'crime': 'криминал',
    'fantasy': 'фэнтези',
    'family': 'семейный'
  };

  // Esli slug v mape, berem russkoe nazvanie, inache ischem kak est'
  const searchGenre = genreMap[slug] || slug;

  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp
  `;

  let results = [];
  let total = 0;

  try {
    // Ischem filmy, u kotoryh v massive genres_names est' nash zhanr (ILIKE)
    // My ispolzuem operator && (peresechenie) ili prosto poisk v massive
    
    // Dlya prostoty ispolzuem unnest i ILIKE
    const sql = `
      SELECT ${columns} 
      FROM media, unnest(genres_names) as genre
      WHERE genre ILIKE $1
      GROUP BY tmdb_id
      ORDER BY rating_tmdb DESC
      LIMIT $2 OFFSET $3
    `;
    
    const searchPattern = `%${searchGenre}%`; // myagkiy poisk

    const dbResult = await query(sql, [searchPattern, limit, offset]);
    results = dbResult.rows;

    // Schitaem obshchee kolichestvo
    const countRes = await query(`
      SELECT COUNT(DISTINCT tmdb_id) 
      FROM media, unnest(genres_names) as genre
      WHERE genre ILIKE $1
    `, [searchPattern]);
    
    total = parseInt(countRes.rows[0].count);

  } catch (e) {
    console.error("Genre Page Error:", e.message);
  }

  return {
    props: {
      results,
      genreName: searchGenre,
      currentPage,
      totalPages: Math.ceil(total / limit),
      slug
    },
  };
}

export default function GenrePage({ results, genreName, currentPage, totalPages, slug }) {
  // Delaem pervuyu bukvu zaglavnoy
  const displayGenre = genreName.charAt(0).toUpperCase() + genreName.slice(1);

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <h1 className="text-3xl font-bold text-white mb-8">
          Zhanr: <span className="text-brand-red">{displayGenre}</span>
        </h1>
        
        {results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {results.map(item => (
              <MediaCard key={item.tmdb_id} item={item} />
            ))}
          </div>
        ) : (
           <p className="text-gray-400">V etom zhanre poka nichego net.</p>
        )}

        {totalPages > 1 && (
            <div className="flex justify-center mt-10 space-x-4">
            {currentPage > 1 && (
                <a href={`/genre/${slug}?page=${currentPage - 1}`} className="px-4 py-2 bg-gray-800 rounded hover:bg-brand-red transition">
                Nazad
                </a>
            )}
            <span className="px-4 py-2 text-gray-400">
                Stranitsa {currentPage} iz {totalPages}
            </span>
            {currentPage < totalPages && (
                <a href={`/genre/${slug}?page=${currentPage + 1}`} className="px-4 py-2 bg-gray-800 rounded hover:bg-brand-red transition">
                Vpered
                </a>
            )}
            </div>
        )}
      </main>
      <Footer />
    </div>
  );
}