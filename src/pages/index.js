// --- ФИНАЛЬНАЯ ВЕРСИЯ index.js (FIX: Убрали Promise.all) ---
import React, { useState, useRef, useCallback } from 'react';

import { fetchData } from '../lib/api';
import { query } from '../lib/db';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import MediaCarousel from '../components/MediaCarousel';
import Footer from '../components/Footer'; 
import TrailerModal from '../components/TrailerModal'; 

/**
 * 💡 ОБНОВЛЕННАЯ СЕРВЕРНАЯ ФУНКЦИЯ (Без Promise.all)
 */
export async function getServerSideProps() {
  
  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT 
  `;

  try {
    // 💡 --- ВОТ ИЗМЕНЕНИЕ --- 💡
    // Выполняем запросы ПО ОЧЕРЕДИ, чтобы использовать только 1 соединение.
    
    // 1. Для Слайдера
    const heroResult = await query(
      `SELECT ${columns} FROM media 
       WHERE type = 'movie' AND backdrop_path IS NOT NULL AND rating_tmdb > 7.0 
       ORDER BY rating_tmdb DESC 
       LIMIT 5`
    );

    // 2. Топ Фильмов
    const topResult = await query(
      `SELECT ${columns} FROM media 
       WHERE type = 'movie' 
       ORDER BY rating_tmdb DESC 
       LIMIT 10`
    );

    // 3. Популярные Сериалы
    const tvResult = await query(
      `SELECT ${columns} FROM media 
       WHERE type = 'tv' 
       ORDER BY rating_tmdb DESC 
       LIMIT 10`
    );
    // 💡 --- КОНЕЦ ИЗМЕНЕНИЯ ---

    return {
      props: {
        heroMovies: heroResult.rows,
        topMovies: topResult.rows,
        popularTv: tvResult.rows,
        horrorMovies: [], 
        popularActors: [], 
      },
    };

  } catch (error) {
    console.error("Home Page SSR Error (Database):", error.message);
    return {
      props: {
        heroMovies: [],
        topMovies: [],
        popularTv: [],
        horrorMovies: [],
        popularActors: [],
      },
    };
  }
}

/**
 * Главный компонент страницы
 */
export default function Home({ heroMovies, topMovies, popularTv, horrorMovies, popularActors }) {
  
  const [searchQuery, setSearchQuery] = useState('');

  // --- Состояния для модального окна ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIsLoading, setModalIsLoading] = useState(false);
  const [modalVideoHtml, setModalVideoHtml] = useState('');
  
  
  // --- ОБНОВЛЕННАЯ функция открытия модала ---
  const handleShowTrailer = useCallback(async (movie) => {
    // 'movie' - это теперь полный объект из нашей базы
    setIsModalOpen(true);
    setModalIsLoading(true);

    let playerFound = false;
    
    // 1. Проверяем kinopoisk_id ПРЯМО из объекта (который пришел из props)
    if (movie.kinopoisk_id) {
        setModalVideoHtml(`
          <div data-kinopoisk="${movie.kinopoisk_id}" id="kinobd" style="width:100%; height:100%;"></div>
        `);
        
        const oldScript = document.getElementById('kinobd-player-script');
        if (oldScript) oldScript.remove();
        
        const playerScript = document.createElement('script');
        
        playerScript.src = 'https://kinobd.net/js/player_.js';
        
        playerScript.id = 'kinobd-player-script';
        document.body.appendChild(playerScript); 

        playerFound = true;
    }

    // 2. Fallback: Если 'kinopoisk_id' нет, ищем трейлер на YouTube
    if (!playerFound) {
      console.log(`Плеер не найден в нашей базе (TMDB ID: ${movie.tmdb_id}). Используем резервный метод YouTube.`);
      
      const data = await fetchData(`/${movie.type}/${movie.tmdb_id}/videos`);
      let trailer = null;
      if (data && data.results) {
        trailer = data.results.find(vid => vid.site === 'YouTube' && vid.type === 'Trailer' && vid.iso_639_1 === 'ru') 
               || data.results.find(vid => vid.site === 'YouTube' && vid.type === 'Trailer');
      }
      
      if (trailer) {
        setModalVideoHtml(`
          <iframe 
            class="absolute top-0 left-0 w-full h-full" 
            src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        `);
      } else {
        setModalVideoHtml(`<div class="flex items-center justify-center w-full h-full absolute inset-0"><p class="text-white text-xl p-8 text-center">Видео не найдено.</p></div>`);
      }
    }
    setModalIsLoading(false);
  }, [fetchData]);

  // --- Функция закрытия модала (без изменений) ---
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalVideoHtml(''); 
    
    const oldScript = document.getElementById('kinobd-player-script');
    if (oldScript) oldScript.remove();
  }, []);

  // --- Поиск (без изменений) ---
  const handleSearch = () => {
     console.log('Searching for:', searchQuery);
     alert(`(временно) Поиск: ${searchQuery}.`);
  }

  // --- JSX (Рендеринг) ---
  return (
    <div className="bg-[#10141A] text-white font-sans">
      <Header 
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearchSubmit={handleSearch}
      />

      <TrailerModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        isLoading={modalIsLoading}
        videoHtml={modalVideoHtml}
      />
      
      <>
        <HeroSlider movies={heroMovies} onShowTrailer={handleShowTrailer} /> 
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20" id="main-container">
          
          <MediaCarousel 
            title="Топ фильмы"
            items={topMovies}
            swiperKey="top-movies"
            cardType="movie"
          />
          <MediaCarousel 
            title="Популярные сериалы"
            items={popularTv}
            swiperKey="popular-tv"
            cardType="tv"
          />
          <MediaCarousel 
            title="Фильмы ужасов"
            items={horrorMovies}
            swiperKey="horror-movies"
            cardType="movie"
          />
          <MediaCarousel 
            title="Популярные актеры"
            items={popularActors}
            swiperKey="popular-actors"
            onShowTrailer={() => {}} 
            cardType="actor" 
          />
        </main>
      </>

      <Footer />
    </div>
  );
}