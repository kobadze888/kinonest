// src/pages/actors.js
import React from 'react';
import { useRouter } from 'next/router';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ActorCard from '@/components/ActorCard'; 
import Pagination from '@/components/Pagination';

export async function getServerSideProps({ query: urlQuery }) {
  const page = parseInt(urlQuery.page) || 1;
  // 💡 შეცვლილია 30-ზე
  const limit = 30; 
  const offset = (page - 1) * limit;

  let actors = [];
  let total = 0;

  try {
    const actorsRes = await query(`
      SELECT id, name, profile_path, popularity 
      FROM actors
      ORDER BY popularity DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    actors = actorsRes.rows;

    const countRes = await query(`SELECT COUNT(*) FROM actors`);
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