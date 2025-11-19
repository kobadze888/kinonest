// src/pages/search.js
import React, { useState, useEffect } from 'react'; // 💡 useState, useEffect
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import MediaCardSkeleton from '@/components/MediaCardSkeleton'; // 💡 იმპორტი
import { slugify } from '@/lib/utils';

export async function getServerSideProps(context) {
  const { q } = context.query;
  if (!q || q.trim() === '') return { props: { results: [], query: '' } };

  const rawQuery = q.trim();
  const cleanQuery = rawQuery.replace(/[^\w\sа-яА-ЯёЁ]/g, '');
  const ftsQuery = cleanQuery.split(/\s+/).filter(Boolean).map(w => w + ':*').join(' & ');
  const slugQuery = slugify(rawQuery); 

  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp
  `;

  let results = [];
  try {
    const sql = `
      SELECT ${columns},
      GREATEST(
        ts_rank(to_tsvector('russian', title_ru), to_tsquery('russian', $1)),
        similarity(search_slug, $2) 
      ) as rank
      FROM media 
      WHERE 
        to_tsvector('russian', title_ru || ' ' || COALESCE(overview, '')) @@ to_tsquery('russian', $1)
        OR
        to_tsvector('english', COALESCE(title_en, '')) @@ to_tsquery('english', $1)
        OR
        search_slug ILIKE '%' || $2 || '%' 
        OR
        similarity(search_slug, $2) > 0.3 
      
      ORDER BY rank DESC, rating_tmdb DESC
      LIMIT 40
    `;

    const finalFtsQuery = ftsQuery || 'пустой_запрос'; 
    const dbResult = await query(sql, [finalFtsQuery, slugQuery]);
    results = dbResult.rows;
  } catch (e) {
    console.error("Search Error:", e.message);
  }

  return { props: { results, query: rawQuery } };
}

export default function SearchPage({ results, query }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // 💡 როუტერის ივენთები სკელეტონებისთვის
    useEffect(() => {
      const start = (url) => {
        // მხოლოდ თუ ძიების გვერდზე ვრჩებით (მაგ: ახალი ძიება)
        if (url.startsWith('/search')) setLoading(true);
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
    }, [router]);

    return (
        <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
             <Header key={router.asPath} />
             <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
                <div className="mb-8">
                     {query ? (
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            Результаты поиска: <span className="text-brand-red">«{query}»</span>
                        </h1>
                     ) : (
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Поиск</h1>
                     )}
                     {!loading && results.length > 0 && <p className="text-gray-400 mt-2">Найдено: {results.length}</p>}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {loading ? (
                      // 💡 სკელეტონები
                      Array.from({ length: 10 }).map((_, i) => <MediaCardSkeleton key={i} />)
                  ) : results.length > 0 ? (
                      results.map(item => <MediaCard key={item.tmdb_id} item={item} />)
                  ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                          <div className="text-6xl mb-4">🔍</div>
                          <h2 className="text-xl font-semibold text-white mb-2">Ничего не найдено</h2>
                          <p className="text-gray-400 max-w-md">Попробуйте изменить запрос или ввести другое название.</p>
                      </div>
                  )}
                </div>

             </main>
             <Footer />
        </div>
    );
}