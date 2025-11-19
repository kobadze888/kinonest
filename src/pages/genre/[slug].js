// src/pages/genre/[slug].js (Stranica zhanra + Skeleton)
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import MediaCardSkeleton from '@/components/MediaCardSkeleton'; // 💡 Импорт скелетона

export async function getServerSideProps(context) {
  const { slug, page } = context.query;
  const currentPage = parseInt(page) || 1;
  const limit = 30; // 💡 Лимит 30 для заполнения сетки
  const offset = (currentPage - 1) * limit;

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
    const sql = `
      SELECT ${columns} 
      FROM media, unnest(genres_names) as genre
      WHERE genre ILIKE $1
      GROUP BY tmdb_id
      ORDER BY rating_tmdb DESC
      LIMIT $2 OFFSET $3
    `;
    
    const searchPattern = `%${searchGenre}%`; 

    const dbResult = await query(sql, [searchPattern, limit, offset]);
    results = dbResult.rows;

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
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 💡 Логика отображения скелетонов при смене страницы
  useEffect(() => {
    const start = (url) => {
        // Если мы остаемся на странице жанра (пагинация), включаем загрузку
        if (url.startsWith(`/genre/${slug}`)) {
            setLoading(true);
        }
    };
    const end = () => setLoading(false);

    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', end);
    router.events.on('routeChangeError', end);
    
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', end);
      router.events.off('routeChangeError', end);
    };
  }, [router, slug]);

  const displayGenre = genreName.charAt(0).toUpperCase() + genreName.slice(1);

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <h1 className="text-3xl font-bold text-white mb-8">
          Жанр: <span className="text-brand-red">{displayGenre}</span>
        </h1>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {loading ? (
                // 💡 Показываем скелетоны при загрузке
                Array.from({ length: 30 }).map((_, i) => <MediaCardSkeleton key={i} />)
            ) : results.length > 0 ? (
                results.map(item => (
                <MediaCard key={item.tmdb_id} item={item} />
                ))
            ) : (
                <p className="text-gray-400 col-span-full text-center">В этом жанре пока ничего нет.</p>
            )}
        </div>

        {/* Пагинация (обычная, не Infinite Scroll, так как это специфичная страница) */}
        {totalPages > 1 && (
            <div className="flex justify-center mt-10 space-x-4">
            <button 
                disabled={currentPage <= 1}
                onClick={() => router.push(`/genre/${slug}?page=${currentPage - 1}`)} 
                className={`px-4 py-2 rounded transition ${currentPage <= 1 ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-800 hover:bg-brand-red text-white'}`}
            >
                Назад
            </button>
            
            <span className="px-4 py-2 text-gray-400 bg-gray-900 rounded">
                Страница {currentPage} из {totalPages}
            </span>
            
            <button 
                disabled={currentPage >= totalPages}
                onClick={() => router.push(`/genre/${slug}?page=${currentPage + 1}`)}
                className={`px-4 py-2 rounded transition ${currentPage >= totalPages ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-800 hover:bg-brand-red text-white'}`}
            >
                Вперед
            </button>
            </div>
        )}
      </main>
      <Footer />
    </div>
  );
}