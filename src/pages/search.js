import React, { useState, useEffect } from 'react';
import Head from 'next/head'; // 💡 Schema-სთვის
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import MediaCardSkeleton from '@/components/MediaCardSkeleton'; 
import FilterBar from '@/components/FilterBar';
import { getDynamicFilters } from '@/lib/getFilters';
import { slugify } from '@/lib/utils';
import SeoHead from '@/components/SeoHead'; // 🚀 SEO იმპორტი

function transliterate(text) {
  if (!text) return '';
  let res = text.toLowerCase();
  
  const combos = { "shch": "щ", "sch": "щ", "kh": "х", "zh": "ж", "ts": "ц", "ch": "ч", "sh": "ш", "yu": "ю", "ju": "ю", "ya": "я", "ja": "я", "yo": "ё", "jo": "ё", "ph": "ф", "ck": "к" };
  for (const [eng, rus] of Object.entries(combos)) res = res.split(eng).join(rus);

  const map = { 'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'z': 'з', 'i': 'и', 'j': 'й', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'h': 'х', 'x': 'х', 'c': 'к', 'w': 'в', 'y': 'ы', "'": 'ь', '"': 'ъ', 'q': 'к' };
  return res.split('').map(c => map[c] || c).join('');
}

export async function getServerSideProps(context) {
  const { q, type, genre, year, rating, country, page, sort } = context.query;
  
  let rawQuery = q ? q.trim() : '';
  let extractedYear = null;

  try { await query('CREATE EXTENSION IF NOT EXISTS pg_trgm'); } catch (e) {}

  const yearMatch = rawQuery.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
      extractedYear = parseInt(yearMatch[0]);
      rawQuery = rawQuery.replace(yearMatch[0], '').trim(); 
  }

  const { genres, countries } = await getDynamicFilters();

  let sqlConditions = ["1=1"];
  let queryParams = [];
  let paramIndex = 1;

  if (rawQuery.length > 0) {
      const words = rawQuery.split(/\s+/).filter(w => w.length > 0);
      const wordConditions = words.map(word => {
          const transWord = transliterate(word);
          queryParams.push(`%${word}%`);      const idxEnLike = paramIndex++;
          queryParams.push(`%${transWord}%`); const idxRuLike = paramIndex++;
          queryParams.push(word);             const idxEnSim = paramIndex++;
          queryParams.push(transWord);        const idxRuSim = paramIndex++;

          return `(
              title_en ILIKE $${idxEnLike} OR
              search_slug ILIKE $${idxEnLike} OR
              title_ru ILIKE $${idxRuLike} OR
              similarity(title_en, $${idxEnSim}) > 0.3 OR
              similarity(replace(search_slug, '-', ' '), $${idxEnSim}) > 0.3 OR
              similarity(title_ru, $${idxRuSim}) > 0.3
          )`;
      });
      sqlConditions.push(`(${wordConditions.join(' AND ')})`);
  }

  if (type && type !== 'all') { sqlConditions.push(`type = $${paramIndex}`); queryParams.push(type); paramIndex++; }
  const targetYear = (year && year !== 'all') ? parseInt(year) : extractedYear;
  if (targetYear) { sqlConditions.push(`release_year = $${paramIndex}`); queryParams.push(targetYear); paramIndex++; }
  if (rating && rating !== 'all') { sqlConditions.push(`rating_imdb >= $${paramIndex}`); queryParams.push(parseFloat(rating)); paramIndex++; }
  if (genre && genre !== 'all') { sqlConditions.push(`EXISTS(SELECT 1 FROM UNNEST(genres_names) AS g WHERE g ILIKE $${paramIndex})`); queryParams.push(`%${genre.toLowerCase()}%`); paramIndex++; }
  if (country && country !== 'all') { sqlConditions.push(`EXISTS(SELECT 1 FROM UNNEST(countries) AS c WHERE c ILIKE $${paramIndex})`); queryParams.push(`%${country}%`); paramIndex++; }

  const whereClause = sqlConditions.join(' AND ');

  let orderBy = 'rating_imdb DESC NULLS LAST'; 
  if (rawQuery.length > 0) {
     const fullTrans = transliterate(rawQuery);
     queryParams.push(fullTrans); const idxFullTrans = paramIndex++;
     queryParams.push(rawQuery); const idxFullRaw = paramIndex++;
     orderBy = `
       CASE 
         WHEN title_ru ILIKE $${idxFullTrans} THEN 0       
         WHEN title_en ILIKE $${idxFullRaw} THEN 0       
         WHEN search_slug ILIKE '%' || $${idxFullRaw} || '%' THEN 1 
         ELSE 2
       END ASC, release_year DESC NULLS LAST
     `;
  }
  
  if (sort === 'year_desc') orderBy = 'release_year DESC NULLS LAST';
  if (sort === 'year_asc') orderBy = 'release_year ASC NULLS LAST';
  if (sort === 'rating_desc') orderBy = 'rating_imdb DESC NULLS LAST';

  const columns = `tmdb_id, kinopoisk_id, type, title_ru, title_en, overview, poster_path, release_year, rating_tmdb, rating_imdb, rating_kp, genres_names`;

  let results = [];
  try {
    const sql = `SELECT ${columns} FROM media WHERE ${whereClause} ORDER BY ${orderBy} LIMIT 40`;
    const dbResult = await query(sql, queryParams);
    results = dbResult.rows;
  } catch (e) { 
      try {
        const fallbackSql = `SELECT ${columns} FROM media WHERE title_ru ILIKE '%' || $1 || '%' OR title_en ILIKE '%' || $1 || '%' LIMIT 40`;
        const fbRes = await query(fallbackSql, [rawQuery]); 
        results = fbRes.rows;
      } catch(err) {}
  }

  return { props: { results, query: q || '', filters: { type: type || 'all', genre: genre || 'all', year: year || 'all', rating: rating || 'all', country: country || 'all', sort: sort || 'year_desc' }, genres, countries } };
}

export default function SearchPage({ results, query, filters, genres, countries }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      const start = (url) => { if (url.startsWith('/search')) setLoading(true); };
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

    // 🚀 SEO Schema (SearchResultsPage)
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "SearchResultsPage",
        "name": `Результаты поиска: ${query}`,
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": results.map((item, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "url": `https://kinonest.ge/${item.type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}`
            }))
        }
    };

    return (
        <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
             {/* 🚀 SEO Head */}
             <SeoHead 
                title={query ? `Поиск: ${query} - KinoNest` : "Поиск фильмов и сериалов"}
                description={`Результаты поиска по запросу "${query}". Смотреть онлайн бесплатно в хорошем качестве.`}
             />
             {/* 🚀 JSON-LD Schema */}
             <Head>
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
                />
             </Head>

             <Header key={router.asPath} />
             <div className="pt-20">
                <FilterBar initialFilters={filters} genres={genres} countries={countries} />
             </div>
             <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 w-full">
                <div className="mb-8">
                     {query ? (
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            Результаты поиска: <span className="text-brand-red">«{query}»</span>
                        </h1>
                     ) : ( <h1 className="text-2xl md:text-3xl font-bold text-white">Поиск</h1> )}
                     {!loading && <p className="text-gray-400 mt-2">Найдено: {results.length}</p>}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {loading ? (
                      Array.from({ length: 10 }).map((_, i) => <MediaCardSkeleton key={i} />)
                  ) : results.length > 0 ? (
                      results.map(item => <MediaCard key={item.tmdb_id} item={item} />)
                  ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                          <div className="text-6xl mb-4">🔍</div>
                          <h2 className="text-xl font-semibold text-white mb-2">Ничего не найдено</h2>
                          <p className="text-gray-400 max-w-md">Попробуйте изменить запрос или фильтры.</p>
                          <button onClick={() => router.push('/search')} className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
                              Сбросить поиск
                          </button>
                      </div>
                  )}
                </div>
             </main>
             <Footer />
        </div>
    );
}