import React from 'react';
import Head from 'next/head'; // 💡 Schema-სთვის
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ActorCard from '@/components/ActorCard'; 
import Pagination from '@/components/Pagination';
import SeoHead from '@/components/SeoHead'; // 🚀 SEO იმპორტი

export async function getServerSideProps({ query: urlQuery }) {
  const page = parseInt(urlQuery.page) || 1;
  const limit = 30; 
  const offset = (page - 1) * limit;

  let actors = [];
  let total = 0;

  try {
    const actorsQuery = `
      SELECT DISTINCT a.id, a.name, a.profile_path, a.popularity 
      FROM actors a
      JOIN media_actors ma ON a.id = ma.actor_id
      JOIN media m ON ma.media_id = m.tmdb_id
      WHERE a.profile_path IS NOT NULL 
        AND m.type = 'movie'
        AND m.rating_imdb > 7.0
         AND ('США' = ANY(m.countries) OR 'Великобритания' = ANY(m.countries))
      ORDER BY a.popularity DESC
      LIMIT $1 OFFSET $2
    `;
    
    const actorsRes = await query(actorsQuery, [limit, offset]);
    actors = actorsRes.rows;

    const countRes = await query(`SELECT COUNT(*) FROM actors WHERE profile_path IS NOT NULL`);
    total = parseInt(countRes.rows[0].count);

  } catch (e) {
    console.error("Actors Page Error:", e.message);
  }

  return {
    props: {
      actors,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
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

  // 🚀 SEO Schema (CollectionPage for Persons)
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Популярные актеры кино",
    "description": "Список известных актеров и актрис. Биографии, фото и фильмография.",
    "url": "https://kinonest.ge/actors",
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": actors.slice(0, 20).map((actor, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
            "@type": "Person",
            "name": actor.name,
            "url": `https://kinonest.ge/actor/${actor.id}`
        }
      }))
    }
  };

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      {/* 🚀 SEO Head */}
      <SeoHead 
        title="Актеры и актрисы - Биографии, фото, фильмография"
        description="Каталог популярных актеров мирового и российского кино. Полная фильмография, фото и биографии звезд на KinoNest."
      />
      {/* 🚀 JSON-LD Schema */}
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
          {actors.map(actor => (
            <div key={actor.id} className="flex justify-center">
                <ActorCard actor={actor} />
            </div>
          ))}
        </div>

        <div className="mt-12">
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={handlePageChange} 
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
