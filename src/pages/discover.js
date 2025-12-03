import React, { useState, useEffect } from 'react';
import Head from 'next/head'; // 💡 Schema-სთვის
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import MediaCardSkeleton from '@/components/MediaCardSkeleton'; 
import FilterBar from '@/components/FilterBar'; 
import Pagination from '@/components/Pagination'; 
import SeoHead from '@/components/SeoHead'; // 🚀 SEO იმპორტი

const countryEnToRuMap = { "United States of America": "США", "Russian Federation": "Россия", "Russia": "Россия", "United Kingdom": "Великобритания", "France": "Франция", "Japan": "Япония", "South Korea": "Южная Корея", "Germany": "Германия", "China": "Китай", "Canada": "Канада", "Australia": "Австралия", "India": "Индия", "Spain": "Испания", "Italy": "Италия", "Mexico": "Мексика", "Brazil": "Бразилия", "Turkey": "Турция", "Sweden": "Швеция", "Denmark": "Дания", "Norway": "Норвегия", "Ukraine": "Украина", "Belarus": "Беларусь", "Kazakhstan": "Казахстан" };

export async function getServerSideProps({ query: urlQuery }) {
  const { type, genre, year, rating, country, page, sort } = urlQuery; 
  
  let dynamicGenres = [], dynamicCountries = [];
  try {
    const [dbCountriesRes, dbGenresRes] = await Promise.all([
      query(`SELECT DISTINCT UNNEST(countries) AS country FROM media WHERE countries IS NOT NULL AND countries <> '{}' ORDER BY country`),
      query(`SELECT DISTINCT UNNEST(genres_names) AS genre FROM media WHERE genres_names IS NOT NULL AND genres_names <> '{}' ORDER BY genre`)
    ]);
    dynamicGenres = dbGenresRes.rows.map(row => row.genre.charAt(0).toUpperCase() + row.genre.slice(1));
    dynamicCountries = dbCountriesRes.rows.map(row => ({ en: row.country, ru: countryEnToRuMap[row.country] || row.country }));
    dynamicCountries.sort((a, b) => a.ru.localeCompare(b.ru));
  } catch (e) {}
  
  const currentPage = parseInt(page) || 1;
  const limit = 30; 
  const offset = (currentPage - 1) * limit;

  let sqlConditions = ["1=1"]; 
  let queryParams = [];
  let paramIndex = 1;

  if (type && type !== 'all') { sqlConditions.push(`type = $${paramIndex}`); queryParams.push(type); paramIndex++; }
  if (year && year !== 'all') { sqlConditions.push(`release_year = $${paramIndex}`); queryParams.push(parseInt(year)); paramIndex++; }
  if (rating && rating !== 'all') { sqlConditions.push(`rating_imdb >= $${paramIndex}`); queryParams.push(parseFloat(rating)); paramIndex++; }
  if (genre && genre !== 'all') { sqlConditions.push(`EXISTS(SELECT 1 FROM UNNEST(genres_names) AS g WHERE g ILIKE $${paramIndex})`); queryParams.push(`%${genre.toLowerCase()}%`); paramIndex++; }
  if (country && country !== 'all') { sqlConditions.push(`EXISTS(SELECT 1 FROM UNNEST(countries) AS c WHERE c ILIKE $${paramIndex})`); queryParams.push(`%${country}%`); paramIndex++; }

  const whereClause = sqlConditions.join(' AND ');

  const priorityCase = `CASE WHEN title_ru ~ '[а-яА-ЯёЁ]' AND poster_path IS NOT NULL AND kinopoisk_id IS NOT NULL THEN 0 ELSE 1 END ASC`;
  let orderBy = '';
  
  // 💡 ცვლილება: თუ არჩეულია ნაგულისხმევი სორტირება (year_desc) ფილმებზე, პრიორიტეტი მივანიჭოთ created_at-ს
  const isDefaultMovieSort = type === 'movie' && sort === 'year_desc';

  switch (sort) {
      case 'rating_asc': orderBy = `${priorityCase}, rating_imdb ASC NULLS LAST, rating_tmdb ASC`; break;
      case 'rating_desc': orderBy = `${priorityCase}, rating_imdb DESC NULLS LAST, rating_tmdb DESC`; break;
      case 'year_asc': orderBy = `${priorityCase}, release_year ASC NULLS LAST, rating_imdb DESC`; break;
      // 🎯 ნაგულისხმევი დალაგება - ფილმებისთვის ვიყენებთ created_at-ს
      case 'year_desc': default: 
        if (isDefaultMovieSort) {
             orderBy = `${priorityCase}, created_at DESC, release_year DESC NULLS LAST, rating_imdb DESC`;
        } else {
             orderBy = `${priorityCase}, release_year DESC NULLS LAST, rating_imdb DESC, created_at DESC`;
        }
        break;
  }
  orderBy += `, tmdb_id DESC`;

  const columns = `tmdb_id, kinopoisk_id, type, title_ru, title_en, overview, poster_path, backdrop_path, release_year, rating_tmdb, genres_ids, genres_names, created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp`;

  let results = [];
  let total = 0;

  try {
    const sql = `SELECT ${columns} FROM media WHERE ${whereClause} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
    const dbResult = await query(sql, queryParams);
    results = dbResult.rows;
    const countSql = `SELECT COUNT(*) FROM media WHERE ${whereClause}`;
    const countRes = await query(countSql, queryParams);
    total = parseInt(countRes.rows[0].count);
  } catch (e) {
    console.error("Discover Page Error:", e.message);
  }

  return { props: { results, total, currentPage, totalPages: Math.ceil(total / limit), filters: { type: type || 'all', genre: genre || 'all', year: year || 'all', rating: rating || 'all', country: country || 'all', sort: sort || 'year_desc' }, dynamicGenres, dynamicCountries } };
}

export default function DiscoverPage({ results, total, currentPage, totalPages, filters, dynamicGenres, dynamicCountries }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const start = (url) => { if (url.startsWith('/discover')) setLoading(true); };
    const end = () => setLoading(false);
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', end);
    router.events.on('routeChangeError', end);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', end);
      router.events.off('routeChangeError', end);
    };
  }, [router]);

  const changePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    router.push({ pathname: '/discover', query: { ...router.query, page: newPage } });
  };

  const getActiveFilters = () => {
    const active = [];
    if (filters.type && filters.type !== 'all') active.push({ label: 'Тип', value: filters.type === 'movie' ? 'Фильмы' : 'Сериалы' });
    if (filters.genre && filters.genre !== 'all') active.push({ label: 'Жанр', value: decodeURIComponent(filters.genre).charAt(0).toUpperCase() + decodeURIComponent(filters.genre).slice(1) });
    if (filters.year && filters.year !== 'all') active.push({ label: 'Год', value: filters.year });
    if (filters.country && filters.country !== 'all') {
      const countryVal = decodeURIComponent(filters.country);
      const countryObj = dynamicCountries.find(c => c.en === countryVal);
      active.push({ label: 'Страна', value: countryObj ? countryObj.ru : countryVal });
    }
    if (filters.rating && filters.rating !== 'all') active.push({ label: 'Рейтинг', value: `> ${filters.rating}` });
    return active;
  };
  const activeFilters = getActiveFilters();

  // 🚀 დინამიური SEO სათაურის გენერაცია
  const generateSeoTitle = () => {
    const parts = [];
    if (filters.genre && filters.genre !== 'all') parts.push(decodeURIComponent(filters.genre));
    if (filters.year && filters.year !== 'all') parts.push(`${filters.year} года`);
    if (filters.type === 'movie') parts.push('фильмы');
    else if (filters.type === 'tv') parts.push('сериалы');
    else parts.push('фильмы и сериалы');
    
    const titleText = parts.length > 0 
        ? `${parts.join(' ')} смотреть онлайн бесплатно` 
        : 'Фильтры поиска фильмов и сериалов';
        
    return titleText.charAt(0).toUpperCase() + titleText.slice(1);
  };
  
  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      {/* 🚀 SEO Head */}
      <SeoHead 
        title={generateSeoTitle()}
        description={`Подбор фильмов по параметрам: ${activeFilters.map(f => `${f.label}: ${f.value}`).join(', ')}. Смотреть онлайн бесплатно.`}
      />

      <Header />
      <div className="pt-20">
        <FilterBar initialFilters={filters} genres={dynamicGenres} countries={dynamicCountries} />
      </div>
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 w-full">
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h1 className="text-2xl font-bold text-white">Результаты фильтрации</h1>
                <span className="text-gray-400 text-sm">Найдено: {total} (страница {currentPage})</span>
            </div>
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm text-gray-500">Выбрано:</span>
                {activeFilters.map((f, idx) => (
                  <div key={idx} className="flex items-center bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-sm">
                    <span className="text-gray-400 mr-2">{f.label}:</span>
                    <span className="font-medium text-white">{f.value}</span>
                  </div>
                ))}
                <button onClick={() => router.push('/discover')} className="text-sm text-brand-red hover:text-red-400 transition-colors ml-2 underline decoration-dashed underline-offset-4">Сбросить все</button>
              </div>
            )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {loading 
            ? Array.from({ length: 30 }).map((_, i) => <MediaCardSkeleton key={i} />)
            : results.length > 0 ? (
                results.map(item => <MediaCard key={item.tmdb_id} item={item} />)
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-6xl mb-4">📂</div>
                  <h2 className="text-xl font-semibold text-white mb-2">Ничего не найдено</h2>
                  <button onClick={() => router.push('/discover')} className="mt-4 px-4 py-2 bg-brand-red text-white rounded-md hover:bg-red-700 transition">Сбросить фильтры</button>
                </div>
              )
          }
        </div>
        {totalPages > 1 && (
           <div className="mt-12">
             <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} />
           </div>
        )}
      </main>
      <Footer />
    </div>
  );
}