// --- ОБНОВЛЕННЫЙ ФАЙЛ (с исправлением serializing) ---
import React, { useState, useEffect, useRef, useCallback } from 'react';

// 1. Мы по-прежнему используем 'fetchData' для YouTube трейлеров (fallback)
import { fetchData } from '../lib/api';
// 2. Мы добавляем 'query' для работы с НАШЕЙ базой данных на сервере
import { query } from '../lib/db';

// Импорт компонентов (без изменений)
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import MediaCarousel from '../components/MediaCarousel';
import Footer from '../components/Footer'; 
import TrailerModal from '../components/TrailerModal'; 

// --- Конфиг для API плеера ---
const NEW_PLAYER_API_ENDPOINT = 'https://kinobd.net/api/films';

/**
 * 💡 ОБНОВЛЕННАЯ СЕРВЕРНАЯ ФУНКЦИЯ (с исправлением 'created_at::TEXT')
 */
export async function getServerSideProps() {
  
  // 💡 Список полей, которые мы хотим получить (даты конвертируем в TEXT)
  // Это исправляет ошибку 'Error serializing .created_at'
  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT 
  `;

  try {
    // 1. Для Слайдера
    const heroQuery = query(
      `SELECT ${columns} FROM media 
       WHERE type = 'movie' AND backdrop_path IS NOT NULL AND rating_tmdb > 7.0 
       ORDER BY rating_tmdb DESC 
       LIMIT 5`
    );

    // 2. Топ Фильмов
    const topQuery = query(
      `SELECT ${columns} FROM media 
       WHERE type = 'movie' 
       ORDER BY rating_tmdb DESC 
       LIMIT 10`
    );

    // 3. Популярные Сериалы
    const tvQuery = query(
      `SELECT ${columns} FROM media 
       WHERE type = 'tv' 
       ORDER BY rating_tmdb DESC 
       LIMIT 10`
    );
    
    // Выполняем все запросы одновременно
    const [
      heroResult,
      topResult,
      tvResult
    ] = await Promise.all([heroQuery, topQuery, tvQuery]);

    return {
      props: {
        heroMovies: heroResult.rows,
        topMovies: topResult.rows,
        popularTv: tvResult.rows,
        horrorMovies: [], // 💡 Пока пусто
        popularActors: [], // 💡 Пока пусто
      },
    };

  } catch (error) {
    console.error("Home Page SSR Error (Database):", error.message);
    // В случае ошибки, возвращаем пустые массивы, чтобы сайт не "упал"
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
 * (ОН ОСТАЕТСЯ БЕЗ ИЗМЕНЕНИЙ!)
 */
export default function Home({ heroMovies, topMovies, popularTv, horrorMovies, popularActors }) {
  
  const [searchQuery, setSearchQuery] = useState('');

  // --- Состояния для модального окна ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIsLoading, setModalIsLoading] = useState(false);
  const [modalVideoHtml, setModalVideoHtml] = useState('');
  
  // --- Состояния для базы плеера ---
  const [playerDbStatus, setPlayerDbStatus] = useState(null);
  const playerDatabase = useRef([]); 
  const isPlayerDbLoading = useRef(false);

  // --- Функция загрузки базы kinobd (без изменений) ---
  const loadPlayerDatabase = useCallback(async () => {
    if (isPlayerDbLoading.current || !NEW_PLAYER_API_ENDPOINT) {
      if (!NEW_PLAYER_API_ENDPOINT) console.log('NEW_PLAYER_API_ENDPOINT не указан, будет использоваться резервный метод YouTube.');
      return;
    }
    
    isPlayerDbLoading.current = true;
    setPlayerDbStatus('Загрузка базы плеера...');
    console.log('Загрузка базы плеера...');
    
    let currentPage = 1;
    let hasMore = true;
    let loadedItems = [];

    while (hasMore) {
      setPlayerDbStatus(`Загрузка базы плеера... (Страница ${currentPage})`);
      try {
        const response = await fetch(`${NEW_PLAYER_API_ENDPOINT}?page=${currentPage}`);
        
        if (!response.ok) {
          console.error(`Ошибка загрузки страницы ${currentPage} базы плеера. Статус: ${response.status}`);
          hasMore = false; 
          throw new Error(`API page ${currentPage} fetch failed`);
        }
        
        const result = await response.json();
        
        if (result.data && Array.isArray(result.data)) {
          loadedItems.push(...result.data);
        }
        
        hasMore = result.has_more || false; 
        currentPage++;
        
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100)); 
        }
      } catch (error) {
        console.error('Не удалось полностью загрузить базу плеера:', error.message);
        setPlayerDbStatus('Ошибка загрузки базы плеера.');
        hasMore = false;
      }
    }

    isPlayerDbLoading.current = false;
    
    if (loadedItems.length > 0) {
      playerDatabase.current = loadedItems;
      setPlayerDbStatus(`База плеера загружена (${loadedItems.length} фильмов).`);
      console.log(`База плеера загружена ${loadedItems.length} элементами.`);
      setTimeout(() => setPlayerDbStatus(null), 3000);
    }
  }, []);

  // --- Запускаем загрузку базы плеера (без изменений) ---
  useEffect(() => {
    loadPlayerDatabase();
  }, [loadPlayerDatabase]);

  
  // --- Функция открытия модала (без изменений) ---
  const handleShowTrailer = useCallback(async (movieId, mediaType = 'movie') => {
    setIsModalOpen(true);
    setModalIsLoading(true);

    if (isPlayerDbLoading.current) {
      setModalVideoHtml(`<div class="flex items-center justify-center w-full h-full"><p class="text-white text-xl p-8 text-center">База плеера еще загружается. Пожалуйста, подождите минуту.</p></div>`);
      setModalIsLoading(false);
      return;
    }

    let playerFound = false;
    // 1. Ищем в нашей базе kinobd
    if (playerDatabase.current.length > 0) {
      const movieData = playerDatabase.current.find(movie => movie.tmdb_id == movieId);

      if (movieData && movieData.kinopoisk_id) {
        const kinopoiskId = movieData.kinopoisk_id;
        
        setModalVideoHtml(`
          <div data-kinopoisk="${kinopoiskId}" id="kinobd" style="width:100%; height:100%;"></div>
        `);
        
        const oldScript = document.getElementById('kinobd-player-script');
        if (oldScript) oldScript.remove();
        
        const playerScript = document.createElement('script');
        playerScript.src = 'http://kinobd.net/js/player_.js';
        playerScript.id = 'kinobd-player-script';
        document.body.appendChild(playerScript); 

        playerFound = true;
      }
    }

    // 2. Fallback: (без изменений) Используем fetchData для YouTube
    if (!playerFound) {
      console.log(`Плеер не найден в локальной базе (TMDB ID: ${movieId}). Используем резервный метод YouTube.`);
      
      const data = await fetchData(`/${mediaType}/${movieId}/videos`);
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
  }, [fetchData]); // Добавили fetchData в зависимости

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

  // --- JSX (Рендеринг) (без изменений) ---
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
      
      {playerDbStatus && (
        <div className={`fixed bottom-4 left-4 ${playerDbStatus.includes('Ошибка') ? 'bg-red-600' : 'bg-blue-600'} text-white p-3 rounded-lg z-[150] text-sm shadow-lg`}>
          {playerDbStatus}
        </div>
      )}

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