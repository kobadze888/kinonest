// src/pages/tv-shows.js
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import MediaCardSkeleton from '@/components/MediaCardSkeleton'; 
import FilterBar from '@/components/FilterBar';
import { getDynamicFilters } from '@/lib/getFilters';

export async function getServerSideProps() {
  const limit = 30;
  const offset = 0;

  // Получаем фильтры для FilterBar
  const { genres, countries } = await getDynamicFilters();

  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp
  `;

  let initialShows = [];

  try {
    // Запрашиваем только сериалы (type = 'tv')
    const showsRes = await query(`
      SELECT ${columns} FROM media 
      WHERE type = 'tv'
      ORDER BY 
        CASE 
          WHEN title_ru ~ '[а-яА-ЯёЁ]' 
               AND poster_path IS NOT NULL 
               AND kinopoisk_id IS NOT NULL 
          THEN 0 
          ELSE 1 
        END ASC,
        release_year DESC NULLS LAST, 
        rating_tmdb DESC,
        tmdb_id DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    initialShows = showsRes.rows;
  } catch (e) {
    console.error("TV Shows Page Error:", e.message);
  }

  return {
    props: {
      initialShows,
      genres,
      countries,
    },
  };
}

export default function TvShowsPage({ initialShows, genres, countries }) {
  const [shows, setShows] = useState(initialShows);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  useEffect(() => {
    setShows(initialShows);
    setPage(1);
    setHasMore(true);
  }, [initialShows]);

  const loadMoreShows = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    
    try {
      // Используем API для подгрузки (type=tv)
      const res = await fetch(`/api/media?type=tv&page=${nextPage}`);
      if (res.ok) {
        const newShows = await res.json();
        if (newShows.length > 0) {
          setShows(prev => {
            // Фильтрация дубликатов
            const existingIds = new Set(prev.map(m => m.tmdb_id));
            const uniqueNewShows = newShows.filter(m => !existingIds.has(m.tmdb_id));
            
            if (uniqueNewShows.length === 0) {
               setHasMore(false); 
               return prev;
            }
            return [...prev, ...uniqueNewShows];
          });
          setPage(nextPage);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Failed to load more tv shows:", error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  // Бесконечная прокрутка
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500) {
        loadMoreShows();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreShows]);

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Head>
        <title>Сериалы | KinoNest</title>
      </Head>
      
      <Header />
      <div className="pt-20">
        <FilterBar genres={genres} countries={countries} />
      </div>
      
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 w-full">
        <h1 className="text-3xl font-bold text-white mb-8">Сериалы</h1>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {shows.map((item) => (
            <MediaCard key={`tv-${item.tmdb_id}`} item={item} />
          ))}
          
          {loading && Array.from({ length: 10 }).map((_, i) => (
              <MediaCardSkeleton key={`skeleton-${i}`} />
          ))}
        </div>

        {!hasMore && shows.length > 0 && (
          <p className="text-center text-gray-500 mt-12 mb-8">Вы посмотрели все сериалы.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}