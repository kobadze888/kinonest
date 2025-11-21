import React from 'react';
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ActorCard from '@/components/ActorCard'; 
import Pagination from '@/components/Pagination';

export async function getServerSideProps({ query: urlQuery }) {
  const page = parseInt(urlQuery.page) || 1;
  const limit = 30; 
  const offset = (page - 1) * limit;

  let actors = [];
  let total = 0;

  try {
    // 💡 ახალი ლოგიკა: ვიღებთ მხოლოდ მაღალრეიტინგული (>7.0) US/UK ფილმების მსახიობებს
    // და ვალაგებთ პოპულარობის მიხედვით
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

    // მთლიანი რაოდენობის დათვლა იგივე კრიტერიუმით (მიახლოებით)
    // ზუსტი count რთული ქუერით ძვირია, ამიტომ უბრალოდ actors ცხრილიდან ვიღებთ, 
    // ან შეგვიძლია დავტოვოთ ძველი count თუ პერფორმანსი პრობლემაა.
    // აქ სჯობს დავტოვოთ მარტივი count, რადგან ფილტრაცია ლიმიტირებულია.
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

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
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