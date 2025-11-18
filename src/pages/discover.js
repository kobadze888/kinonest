// src/pages/discover.js (СТРАНИЦА РАСШИРЕННОГО ПОИСКА)
import React from 'react';
import { useRouter } from 'next/router'; // Импортируем useRouter здесь
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import FilterBar from '@/components/FilterBar'; 

export async function getServerSideProps({ query: urlQuery }) {
  const { type, genre, year, rating, country, page } = urlQuery;
  
  const currentPage = parseInt(page) || 1;
  const limit = 24;
  const offset = (currentPage - 1) * limit;

  let sqlConditions = ["1=1"]; 
  let queryParams = [];
  let paramIndex = 1;

  if (type && type !== 'all') {
    sqlConditions.push(`type = $${paramIndex}`);
    queryParams.push(type);
    paramIndex++;
  }

  if (year && year !== 'all') {
    sqlConditions.push(`release_year = $${paramIndex}`);
    queryParams.push(parseInt(year));
    paramIndex++;
  }

  if (rating && rating !== 'all') {
    sqlConditions.push(`rating_imdb >= $${paramIndex}`);
    queryParams.push(parseFloat(rating));
    paramIndex++;
  }

  if (genre && genre !== 'all') {
    sqlConditions.push(`$${paramIndex} = ANY(genres_names)`); 
    const formattedGenre = genre.charAt(0).toUpperCase() + genre.slice(1);
    queryParams.push(formattedGenre);
    paramIndex++;
  }

  if (country && country !== 'all') {
    sqlConditions.push(`$${paramIndex} = ANY(countries)`);
    queryParams.push(country);
    paramIndex++;
  }

  const whereClause = sqlConditions.join(' AND ');

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
      FROM media 
      WHERE ${whereClause}
      ORDER BY release_year DESC, rating_tmdb DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const dbResult = await query(sql, queryParams);
    results = dbResult.rows;
    
    const countSql = `SELECT COUNT(*) FROM media WHERE ${whereClause}`;
    const countRes = await query(countSql, queryParams);
    total = parseInt(countRes.rows[0].count);

  } catch (e) {
    console.error("Discover Page Error:", e.message);
  }

  return {
    props: {
      results,
      currentPage,
      totalPages: Math.ceil(total / limit),
      filters: { type: type || 'all', genre: genre || 'all', year: year || 'all', rating: rating || 'all', country: country || 'all' }
    },
  };
}

export default function DiscoverPage({ results, currentPage, totalPages, filters }) {
  const router = useRouter();

  const changePage = (newPage) => {
    router.push({
      pathname: '/discover',
      query: { ...router.query, page: newPage },
    });
  };
  
  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Header />
      
      <div className="pt-20">
        <FilterBar />
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 w-full">
        <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Результаты фильтрации</h1>
            <span className="text-gray-400 text-sm">Найдено: {results.length} (всего страниц: {totalPages})</span>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {results.map(item => (
              <MediaCard key={item.tmdb_id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="text-6xl mb-4">📂</div>
             <h2 className="text-xl font-semibold text-white mb-2">Ничего не найдено</h2>
             <p className="text-gray-400">Попробуйте смягчить условия фильтра.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center mt-12 space-x-4">
            <button 
              disabled={currentPage <= 1}
              onClick={() => changePage(currentPage - 1)}
              className={`px-4 py-2 rounded transition ${currentPage <= 1 ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-800 hover:bg-brand-red text-white'}`}
            >
              ← Назад
            </button>
            
            <span className="px-4 py-2 text-gray-400 bg-gray-900 rounded">
              {currentPage}
            </span>

            <button 
              disabled={currentPage >= totalPages}
              onClick={() => changePage(currentPage + 1)}
              className={`px-4 py-2 rounded transition ${currentPage >= totalPages ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-800 hover:bg-brand-red text-white'}`}
            >
              Вперед →
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}