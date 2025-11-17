// src/pages/admin/sync.js
import React, { useState, useEffect } from 'react';
import { fetchData } from '@/lib/api';
import Header from '@/components/Header';

const PLAYER_API_ENDPOINT = 'https://kinobd.net/api/films';

export default function SyncPage() {
  const [log, setLog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message, isError = false) => {
    setLog(prev => [...prev, { message, isError }]);
  };

  const handleSync = async () => {
    setIsLoading(true);
    addLog('--- Начат процесс синхронизации (Клиент) ---');
    
    // 1. ვიღებთ პოპულარულ ფილმებს (TMDB)
    const tmdbList = await fetchData('/movie/popular', '&page=1');
    const tmdbMovies = tmdbList?.results || [];
    addLog(`Загружено ${tmdbMovies.length} популярных фильмов с TMDB...`);

    let successCount = 0;
    let skippedCount = 0;

    for (const tmdbMovie of tmdbMovies) {
      const tmdbId = tmdbMovie.id;
      
      // 2. ვეძებთ პლეერს kinobd-ზე (თქვენი ბრაუზერიდან)
      const playerUrl = `${PLAYER_API_ENDPOINT}/${tmdbId}`;
      let movieData = null;

      try {
        const playerResponse = await fetch(playerUrl);
        if (playerResponse.ok) {
          const playerData = await playerResponse.json();
          movieData = playerData?.data ? playerData.data[0] : null;
        }
      } catch (e) {
        addLog(`[ОШИБКА API] TMDB ID ${tmdbId}: Не удалось связаться с kinobd.net.`, true);
        skippedCount++;
        continue;
      }

      if (movieData && movieData.kinopoisk_id) {
        // 3. თუ ვიპოვეთ, ვაგზავნით ჩვენს სერვერზე ჩასაწერად
        try {
          const apiResponse = await fetch('/api/admin/add-movie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movie: movieData, tmdbData: tmdbMovie }),
          });

          if (!apiResponse.ok) {
            throw new Error(`Server returned ${apiResponse.status}`);
          }
          
          addLog(`[УСПЕХ] TMDB ID ${tmdbId} (${tmdbMovie.title}) добавлен в базу.`);
          successCount++;

        } catch (e) {
          addLog(`[ОШИBKA БАЗЫ] TMDB ID ${tmdbId}: ${e.message}`, true);
          skippedCount++;
        }
      } else {
        addLog(`[ПРОПУСК] TMDB ID ${tmdbId} (${tmdbMovie.title}): Плеер не найден.`);
        skippedCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500)); // თავაზიანობა
    }

    addLog(`--- Синхронизация завершена ---`);
    addLog(`Успешно добавлено/обновлено: ${successCount} | Пропущено/Ошибка: ${skippedCount}`);
    setIsLoading(false);
  };

  return (
    <div className="bg-[#10141A] text-white min-h-screen">
      <Header onSearchSubmit={() => {}} />
      <div className="max-w-4xl mx-auto pt-32 px-4">
        <h1 className="text-3xl font-bold mb-4">Панель синхронизации</h1>
        <p className="text-gray-400 mb-6">
          Этот инструмент загружает данные из TMDB и kinobd.net в вашу базу данных Postgres.
          Процесс выполняется в вашем браузере.
        </p>
        <button
          onClick={handleSync}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg font-bold text-white transition-colors ${
            isLoading
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-brand-red hover:bg-red-700'
          }`}
        >
          {isLoading ? 'Идет синхронизация...' : 'Начать синхронизацию (1-я страница)'}
        </button>

        <div className="mt-8 bg-black/50 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
          {log.map((entry, index) => (
            <p key={index} className={entry.isError ? 'text-red-400' : 'text-green-400'}>
              {entry.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}