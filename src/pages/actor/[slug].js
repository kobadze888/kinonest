// src/pages/actor/[slug].js (УПРОЩЕННАЯ ВЕРСИЯ БЕЗ ЛИШНИХ ПОЛЕЙ)
import React from 'react';
import Head from 'next/head';
import Image from 'next/image';

import { IMAGE_BASE_URL } from '@/lib/api';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCarousel from '@/components/MediaCarousel';

export async function getServerSideProps(context) {
  const { slug } = context.params;
  const actorId = slug.split('-')[0]; 
  if (!actorId) return { notFound: true };

  let actor = null;
  let filmography = [];

  try {
    // 1. Получаем только необходимые поля актера (ID, Name, Original Name, Image)
    const actorRes = await query(`
      SELECT id, name, original_name, profile_path
      FROM actors 
      WHERE id = $1
    `, [actorId]);
    actor = actorRes.rows[0];

    if (!actor) return { notFound: true };

    // 2. Получаем фильмографию актера (этот запрос остался без изменений)
    const columns = `
      m.tmdb_id, m.type, m.title_ru, m.title_en, m.overview,
      m.poster_path, m.release_year, m.rating_tmdb
    `;
    
    const filmographyRes = await query(`
      SELECT ${columns}, ma.character
      FROM media_actors ma
      JOIN media m ON ma.media_id = m.tmdb_id
      WHERE ma.actor_id = $1
      ORDER BY ma."order" ASC 
      LIMIT 20
    `, [actorId]);
    
    filmography = filmographyRes.rows.map(item => ({
        ...item,
        // Добавляем описание роли в item
        overview: `Роль: ${item.character || 'Неизвестно'} | ${item.overview}`, 
    }));

  } catch (e) {
    // 💡 Оставляем лог ошибки на случай проблем с JOIN или другими запросами
    console.error("Actor Page Database Error:", e.message); 
    // Поскольку мы теперь не запрашиваем несуществующие поля, этот блок 
    // будет срабатывать реже, и страница должна работать.
  }

  if (!actor) {
    return { notFound: true };
  }

  const serializedActor = JSON.parse(JSON.stringify(actor));

  return {
    props: {
      actor: serializedActor,
      filmography: filmography,
    },
  };
}

export default function ActorPage({ actor, filmography }) {
  const profilePath = actor.profile_path 
    ? `${IMAGE_BASE_URL}${actor.profile_path}` 
    : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Photo';
  
  const pageTitle = `${actor.name} | Фильмография | KinoNest`;
  const keywords = [actor.name, actor.original_name, 'фильмы актера'].join(', ');

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={`Фильмография актера ${actor.name} (${actor.original_name})`} />
        <meta name="keywords" content={keywords} />
      </Head>
      
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 w-full">
        
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Левая колонка: Фото */}
          <div className="w-full md:w-1/4 flex-shrink-0">
            <Image 
              src={profilePath} 
              alt={actor.name} 
              width={500} 
              height={750} 
              className="w-full h-auto rounded-lg shadow-xl" 
            />
          </div>

          {/* Правая колонка: Информация (Имя и Фамилия) */}
          <div className="md:w-3/4">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-2">{actor.name}</h1>
            <h2 className="text-xl text-gray-400 mb-6">{actor.original_name}</h2>
            
            <h3 className="text-2xl font-bold text-white mb-3">Фильмография</h3>
            <p className="text-gray-300 leading-relaxed">
              Здесь вы найдете список фильмов и сериалов, в которых участвовал {actor.name}.
            </p>
          </div>
        </div>

        {/* Фильмография */}
        {filmography.length > 0 ? (
            <div className="mt-12">
                <MediaCarousel 
                  title="Фильмография"
                  items={filmography}
                  swiperKey="actor-filmography"
                  cardType="movie" 
                />
            </div>
        ) : (
            <div className="mt-12 text-center p-8 bg-gray-900/50 rounded-lg">
                <p className="text-xl text-gray-400">Фильмография для этого актера пока не загружена.</p>
            </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}