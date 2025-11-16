// --- ОБНОВЛЕННЫЙ ФАЙЛ ---
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchData } from '../lib/api';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import MediaCarousel from '../components/MediaCarousel';
import Footer from '../components/Footer'; 
import TrailerModal from '../components/TrailerModal'; 

// --- Конфиг для API плеера ---
const NEW_PLAYER_API_ENDPOINT = 'https://kinobd.net/api/films'; 

/**
 * Серверная функция
 */
export async function getServerSideProps() {
  const [
    heroData,
    topData,
    tvData,
    horrorData,
    actorsData 
  ] = await Promise.all([
    fetchData('/movie/popular'),
    fetchData('/movie/top_rated'),
    fetchData('/tv/popular'),
    fetchData('/discover/movie', '&with_genres=27'),
    fetchData('/person/popular') 
  ]);

  return {
    props: {
      heroMovies: heroData?.results?.slice(0, 5) || [],
      topMovies: topData?.results || [],
      popularTv: tvData?.results || [],
      horrorMovies: horrorData?.results || [],
      popularActors: actorsData?.results || [], 
    },
  };
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
  
  // --- Состояния для базы плеера ---
  const [playerDbStatus, setPlayerDbStatus] = useState(null);
  const playerDatabase = useRef([]); 
  const isPlayerDbLoading = useRef(false);

  // --- Функция загрузки базы kinobd (из прототипа) ---
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

    // --- ИЗМЕНЕНИЕ ЗДЕСЬ (Добавили try...catch внутрь цикла) ---
    // Это предотвратит "краш" всего сайта из-за ошибки 429
    while (hasMore) {
      setPlayerDbStatus(`Загрузка базы плеера... (Страница ${currentPage})`);
      try {
        const response = await fetch(`${NEW_PLAYER_API_ENDPOINT}?page=${currentPage}`);
        
        // Если ответ НЕ 'ok' (например, 429 Too Many Requests)
        if (!response.ok) {
          // Не выбрасываем ошибку, а просто логируем и выходим из цикла
          console.error(`Ошибка загрузки страницы ${currentPage} базы плеера. Статус: ${response.status}`);
          hasMore = false; // Прекращаем попытки
          throw new Error(`API page ${currentPage} fetch failed`); // Бросаем ошибку, чтобы ее поймал catch
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
        // Ловим ошибку (включая 429) и выходим из цикла
        console.error('Не удалось полностью загрузить базу плеера:', error.message);
        setPlayerDbStatus('Ошибка загрузки базы плеера.');
        hasMore = false; // Прекращаем цикл
      }
    }
    // --- Конец ИЗМЕНЕНИЯ ---

    isPlayerDbLoading.current = false;
    
    // Если мы что-то загрузили, обновляем статус
    if (loadedItems.length > 0) {
      playerDatabase.current = loadedItems;
      setPlayerDbStatus(`База плеера загружена (${loadedItems.length} фильмов).`);
      console.log(`База плеера загружена ${loadedItems.length} элементами.`);
      setTimeout(() => setPlayerDbStatus(null), 3000);
    }
  }, []);

  // --- Запускаем загрузку базы плеера один раз при загрузке страницы ---
  useEffect(() => {
    loadPlayerDatabase();
  }, [loadPlayerDatabase]);

  
  // --- Новая функция для открытия модала ---
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

    // 2. Fallback: Если не нашли, ищем трейлер на YouTube
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
  }, []); 

  // --- Функция закрытия модала ---
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalVideoHtml(''); 
    
    const oldScript = document.getElementById('kinobd-player-script');
    if (oldScript) oldScript.remove();
  }, []);

  // --- Поиск (пока просто) ---
  const handleSearch = () => {
     console.log('Searching for:', searchQuery);
     alert(`(дровременно) Поиск: ${searchQuery}.`);
  }

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
            onShowTrailer={handleShowTrailer}
            cardType="movie"
          />
          <MediaCarousel 
            title="Популярные сериалы"
            items={popularTv}
            swiperKey="popular-tv"
            onShowTrailer={handleShowTrailer}
            cardType="tv"
          />
          <MediaCarousel 
            title="Фильмы ужасов"
            items={horrorMovies}
            swiperKey="horror-movies"
            onShowTrailer={handleShowTrailer}
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