import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head'; // 💡 Schema-სთვის
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import MediaCardSkeleton from '@/components/MediaCardSkeleton'; 
import FilterBar from '@/components/FilterBar';
import { getDynamicFilters } from '@/lib/getFilters';
import SeoHead from '@/components/SeoHead'; // 🚀 SEO იმპორტი

export async function getServerSideProps() {
  const limit = 30;
  const offset = 0;

  const { genres, countries } = await getDynamicFilters();

  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp
  `;

  let initialMovies = [];

  try {
    const moviesRes = await query(`
      SELECT ${columns} FROM media 
      WHERE type = 'movie'
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
    initialMovies = moviesRes.rows;
  } catch (e) {
    console.error("Movies Page Error:", e.message);
  }

  return {
    props: {
      initialMovies,
      genres,
      countries,
    },
  };
}

export default function MoviesPage({ initialMovies, genres, countries }) {
  const [movies, setMovies] = useState(initialMovies);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  useEffect(() => {
    setMovies(initialMovies);
    setPage(1);
    setHasMore(true);
  }, [initialMovies]);

  const loadMoreMovies = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    
    try {
      const res = await fetch(`/api/media?type=movie&page=${nextPage}`);
      if (res.ok) {
        const newMovies = await res.json();
        if (newMovies.length > 0) {
          setMovies(prev => {
            const existingIds = new Set(prev.map(m => m.tmdb_id));
            const uniqueNewMovies = newMovies.filter(m => !existingIds.has(m.tmdb_id));
            
            if (uniqueNewMovies.length === 0) {
               setHasMore(false); 
               return prev;
            }
            return [...prev, ...uniqueNewMovies];
          });
          setPage(nextPage);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Failed to load more movies:", error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500) {
        loadMoreMovies();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreMovies]);

  // 🚀 SEO Schema (CollectionPage)
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Фильмы смотреть онлайн",
    "description": "Каталог лучших фильмов онлайн бесплатно в хорошем качестве.",
    "url": "https://kinonest.ge/movies",
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": movies.slice(0, 20).map((movie, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://kinonest.ge/movie/${movie.tmdb_id}`
      }))
    }
  };

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      {/* 🚀 SEO Head */}
      <SeoHead 
        title="Фильмы смотреть онлайн бесплатно в хорошем качестве HD"
        description="Огромная коллекция фильмов онлайн. Новинки кино, популярные блокбастеры и классика кинематографа абсолютно бесплатно на KinoNest."
      />
      {/* 🚀 JSON-LD Schema */}
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      </Head>

      <Header />
      <div className="pt-20">
        <FilterBar genres={genres} countries={countries} />
      </div>
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 w-full">
        <h1 className="text-3xl font-bold text-white mb-8">Фильмы</h1>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {movies.map((movie) => (
            <MediaCard key={`movie-${movie.tmdb_id}`} item={movie} />
          ))}
          
          {loading && Array.from({ length: 10 }).map((_, i) => (
              <MediaCardSkeleton key={`skeleton-${i}`} />
          ))}
        </div>

        {!hasMore && movies.length > 0 && (
          <p className="text-center text-gray-500 mt-12 mb-8">Вы посмотрели все фильмы.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}