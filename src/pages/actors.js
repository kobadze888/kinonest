// src/pages/actors.js (Страница "Все актеры")
import React from 'react';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ActorCard from '@/components/ActorCard'; // Используем наш ActorCard
import Link from 'next/link';

export async function getServerSideProps({ query: urlQuery }) {
  const page = parseInt(urlQuery.page) || 1;
  const limit = 24; // Показываем больше актеров на странице (они маленькие)
  const offset = (page - 1) * limit;

  let actors = [];
  let total = 0;

  try {
    // Получаем актеров, сортируем по популярности
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

        <div className="flex justify-center mt-12 space-x-4">
          {currentPage > 1 && (
            <Link href={`/actors?page=${currentPage - 1}`} className="px-4 py-2 bg-gray-800 rounded hover:bg-brand-red transition">
              ← Назад
            </Link>
          )}
          <span className="px-4 py-2 text-gray-400">
            Страница {currentPage} из {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`/actors?page=${currentPage + 1}`} className="px-4 py-2 bg-gray-800 rounded hover:bg-brand-red transition">
              Вперед →
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}