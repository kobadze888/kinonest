import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import MediaCardSkeleton from '@/components/MediaCardSkeleton'; 
import FilterBar from '@/components/FilterBar';
import Pagination from '@/components/Pagination';
import { getDynamicFilters } from '@/lib/getFilters';

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
    // 💡 Kids გვერდზეც პრიორიტეტი
    const sql = `
      SELECT ${columns} FROM media 
      WHERE genres_names && ARRAY['мультфильм', 'семейный']
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
    `;
    const itemsRes = await query(sql, [limit, offset]);
    items = itemsRes.rows;

    const countRes = await query(`SELECT COUNT(*) FROM media WHERE genres_names && ARRAY['мультфильм', 'семейный']`);
    total = parseInt(countRes.rows[0].count);
  } catch (e) {
    console.error("Kids Page Error:", e.message);
  }

  return {
    props: { items, currentPage: page, totalPages: Math.ceil(total / limit), genres, countries },
  };
}

export default function KidsPage({ items, currentPage, totalPages, genres, countries }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const start = (url) => { if (url.startsWith('/kids')) setLoading(true); };
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
    router.push({ pathname: '/kids', query: { page: newPage } });
  };

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Header />
      <div className="pt-20">
        <FilterBar genres={genres} countries={countries} />
      </div>
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 w-full">
        <h1 className="text-3xl font-bold text-white mb-8">Детям</h1>
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