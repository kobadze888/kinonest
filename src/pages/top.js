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
import { getDynamicFilters } from '@/lib/getFilters';
import SeoHead from '@/components/SeoHead'; // 🚀 SEO იმპორტი

export async function getServerSideProps({ query: urlQuery }) {
  const page = parseInt(urlQuery.page) || 1;
  const limit = 30;
  const offset = (page - 1) * limit;
  
  const { genres, countries } = await getDynamicFilters();

  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp
  `;

  let items = [];
  let total = 0;

  try {
    const sql = `
      SELECT ${columns} FROM media 
      WHERE type = 'movie' AND rating_tmdb > 0
      ORDER BY 
        CASE 
          WHEN ('США' = ANY(countries) OR 'Великобритания' = ANY(countries)) 
          THEN 0 
          ELSE 1 
        END ASC,
        rating_imdb DESC, 
        release_year DESC NULLS LAST, 
        tmdb_id DESC
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
    props: { items, currentPage: page, totalPages: Math.ceil(total / limit), genres, countries },
  };
}

export default function TopPage({ items, currentPage, totalPages, genres, countries }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const start = (url) => { if (url.startsWith('/top')) setLoading(true); };
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

  const handlePageChange = (newPage) => {
    router.push({ pathname: '/top', query: { page: newPage } });
  };

  // 🚀 SEO Schema
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Топ фильмов - Рейтинг Кинопоиск и IMDb",
    "description": "Список самых лучших фильмов по рейтингу. Топ 250 фильмов смотреть онлайн.",
    "url": "https://kinonest.ge/top"
  };

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      {/* 🚀 SEO Head */}
      <SeoHead 
        title="Топ фильмов - Лучшие фильмы по рейтингу смотреть онлайн"
        description="Самые высокооцененные фильмы всех времен. Рейтинг IMDb и Кинопоиск. Смотрите шедевры кино бесплатно."
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
        <h1 className="text-3xl font-bold text-white mb-8">Топ фильмы</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {loading 
            ? Array.from({ length: 30 }).map((_, i) => <MediaCardSkeleton key={i} />)
            : items.map(item => <MediaCard key={item.tmdb_id} item={item} />)
          }
        </div>
        <div className="mt-12">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      </main>
      <Footer />
    </div>
  );
}