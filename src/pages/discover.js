// src/pages/discover.js (ФИКС: Динамические фильтры)
import React from 'react';
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import FilterBar from '@/components/FilterBar'; 

// 💡 Полная таблица соответствия (Английский DB -> Русский UI)
// Это необходимо, чтобы показать пользователю русское имя, 
// но отправить в SQL английское имя (которое и хранится в DB).
const countryEnToRuMap = {
  "United States of America": "США",
  "Russian Federation": "Россия", 
  "Russia": "Россия",
  "United Kingdom": "Великобритания",
  "France": "Франция",
  "Japan": "Япония",
  "South Korea": "Южная Корея",
  "Germany": "Германия",
  "China": "Китай",
  "Canada": "Канада",
  "Australia": "Австралия",
  "India": "Индия",
  "Spain": "Испания",
  "Italy": "Италия",
  "Mexico": "Мексика",
  "Brazil": "Бразилия",
  // Добавь сюда остальные переводы по мере необходимости
};

export async function getServerSideProps({ query: urlQuery }) {
  const { type, genre, year, rating, country, page, sort } = urlQuery; 
  
  // --- 1. ЗАГРУЗКА ДИНАМИЧЕСКИХ СПИСКОВ ---
  let dynamicGenres = [];
  let dynamicCountries = [];

  try {
    const [dbCountriesRes, dbGenresRes] = await Promise.all([
      query(`SELECT DISTINCT UNNEST(countries) AS country FROM media WHERE countries IS NOT NULL AND countries <> '{}' ORDER BY country`),
      query(`SELECT DISTINCT UNNEST(genres_names) AS genre FROM media WHERE genres_names IS NOT NULL AND genres_names <> '{}' ORDER BY genre`)
    ]);

    // Жанры: просто форматируем первую букву
    dynamicGenres = dbGenresRes.rows.map(row => {
      const g = row.genre;
      return g.charAt(0).toUpperCase() + g.slice(1); // "боевик" -> "Боевик"
    });

    // Страны: переводим с английского на русский
    dynamicCountries = dbCountriesRes.rows.map(row => {
        const enName = row.country;
        const ruName = countryEnToRuMap[enName] || enName; // Используем маппинг
        return { en: enName, ru: ruName }; // Храним оба имени для UI/SQL
    });

  } catch (e) {
    console.error("Dynamic Filter Load Error:", e.message);
  }
  // --- КОНЕЦ: ЗАГРУЗКА ДИНАМИЧЕСКИХ СПИСКОВ ---
  
  
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
    // Жанр: Используем ILIKE для поиска без учета регистра.
    sqlConditions.push(`EXISTS(SELECT 1 FROM UNNEST(genres_names) AS g WHERE g ILIKE $${paramIndex})`);
    queryParams.push(`%${genre.toLowerCase()}%`); 
    paramIndex++;
  }

  if (country && country !== 'all') {
    // 💡 КРИТИЧЕСКИЙ ФИКС: Используем ВХОДЯЩЕЕ значение COUNTRY, которое теперь
    // является АНГЛИЙСКИМ именем (см. FilterBar.js)
    sqlConditions.push(`EXISTS(SELECT 1 FROM UNNEST(countries) AS c WHERE c ILIKE $${paramIndex})`);
    queryParams.push(`%${country}%`); 
    paramIndex++;
  }

  const whereClause = sqlConditions.join(' AND ');

  let orderBy = 'release_year DESC NULLS LAST, rating_tmdb DESC'; 
  // ... (switch case для сортировки остается без изменений) ...
  switch (sort) {
      case 'rating_asc':
          orderBy = 'rating_imdb ASC NULLS LAST, rating_tmdb ASC';
          break;
      case 'rating_desc':
          orderBy = 'rating_imdb DESC NULLS LAST, rating_tmdb DESC';
          break;
      case 'year_asc':
          orderBy = 'release_year ASC NULLS LAST, rating_tmdb DESC';
          break;
      case 'year_desc':
      default:
          orderBy = 'release_year DESC NULLS LAST, rating_tmdb DESC';
          break;
  }


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
      ORDER BY ${orderBy}
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
      total, 
      currentPage,
      totalPages: Math.ceil(total / limit),
      filters: { type: type || 'all', genre: genre || 'all', year: year || 'all', rating: rating || 'all', country: country || 'all', sort: sort || 'year_desc' },
      dynamicGenres,     // 💡 НОВЫЙ ПРОПС
      dynamicCountries,  // 💡 НОВЫЙ ПРОПС
    },
  };
}

export default function DiscoverPage({ results, total, currentPage, totalPages, filters, dynamicGenres, dynamicCountries }) { // 💡 ДОБАВЛЕНЫ dynamic props
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
        {/* Передаем динамические списки в FilterBar */}
        <FilterBar initialFilters={filters} genres={dynamicGenres} countries={dynamicCountries} />
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 w-full">
        <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Результаты фильтрации</h1>
            <span className="text-gray-400 text-sm">Найдено: {total} (страница {currentPage})</span>
        </div>
        {/* ... (результаты) */}
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

        {/* ... (пагинация) */}
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