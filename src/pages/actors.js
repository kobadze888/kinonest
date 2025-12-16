import React from 'react';
import Head from 'next/head'; 
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ActorCard from '@/components/ActorCard'; 
import Pagination from '@/components/Pagination';
import SeoHead from '@/components/SeoHead'; 

export async function getServerSideProps({ query: urlQuery }) {
  const page = parseInt(urlQuery.page) || 1;
  const limit = 30; 
  const offset = (page - 1) * limit;

  let actors = [];
  let total = 0;

  try {
    // 💡 ოპტიმიზებული ქვერი: იყენებს m.id-ს JOIN-ისთვის და ფილტრავს შერეულ ქვეყნებს
    const actorsQuery = `
      SELECT DISTINCT a.id, a.name, a.profile_path, a.popularity 
      FROM actors a
      JOIN media_actors ma ON a.id = ma.actor_id
      JOIN media m ON ma.media_id = m.id
      WHERE a.profile_path IS NOT NULL 
        AND m.type = 'movie'
        AND m.rating_imdb >= 6.0
        AND (
          m.countries && ARRAY['США', 'USA', 'Великобритания', 'UK', 'United Kingdom']::text[]
          OR a.popularity > 15
        )
      ORDER BY a.popularity DESC
      LIMIT $1 OFFSET $2
    `;
    
    const actorsRes = await query(actorsQuery, [limit, offset]);
    actors = actorsRes.rows;

    const countRes = await query(`
      SELECT COUNT(DISTINCT a.id) 
      FROM actors a
      JOIN media_actors ma ON a.id = ma.actor_id
      JOIN media m ON ma.media_id = m.id
      WHERE a.profile_path IS NOT NULL 
        AND m.rating_imdb >= 6.0
    `);
    total = parseInt(countRes.rows[0].count);

  } catch (e) {
    console.error("Actors Page Error:", e.message);
  }

  return {
    props: {
      actors: JSON.parse(JSON.stringify(actors)),
      currentPage: page,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export default function ActorsPage({ actors, currentPage, totalPages }) {
  const router = useRouter();

  const handlePageChange = (newPage) => {
    router.push({
      pathname: '/actors',
      query: { page: newPage },
    });
  };

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Популярные актеры кино",
    "description": "Список известных актеров и актрис. Биографии, фото и фильмография.",
    "url": "https://kinonest.tv/actors",
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": actors.slice(0, 20).map((actor, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
            "@type": "Person",
            "name": actor.name,
            "url": `https://kinonest.tv/actor/${actor.id}`
        }
      }))
    }
  };

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <SeoHead 
        title="Актеры и актрисы - Биографии, фото, фильмография"
        description="Каталог популярных актеров мирового и российского кино. Полная фильмография, фото и биографии звезд на KinoNest."
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      </Head>

      <Header />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <h1 className="text-3xl font-bold text-white mb-8">Популярные актеры</h1>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {actors && actors.length > 0 ? (
            actors.map(actor => (
              <div key={actor.id} className="flex justify-center hover:scale-105 transition-transform">
                  <ActorCard actor={actor} />
              </div>
            ))
          ) : (
            <p className="text-gray-400 col-span-full text-center">Актеры не найдены.</p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-12">
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}