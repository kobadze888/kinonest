// src/pages/admin/sync.js (სწორი ლოგიკით)
import React, { useState } from 'react';
// import { fetchData } from '@/lib/api'; // TMDB აღარ გვჭირდება აქ
import Header from '@/components/Header';

const PLAYER_API_ENDPOINT = 'https://kinobd.net/api/films';

export default function SyncPage() {
  const [log, setLog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message, isError = false) => {
    setLog(prev => [{ message, isError }, ...prev]); // ახალი ლოგები გამოჩნდეს ზემოთ
  };

  const handleSync = async () => {
    setIsLoading(true);
    setLog([]); // ლოგის გასუფთავება
    addLog('--- Начат процесс синхронизации (Клиент) ---');
    
    let kinobdMovies = [];
    try {
      // 1. ვიღებთ ფილმებს პირდაპირ KINOBD-დან (რაც მუშაობს თქვენს ბრაუზერში)
      const response = await fetch(`${PLAYER_API_ENDPOINT}?page=1`);
      if (!response.ok) throw new Error(`kinobd.net API Error: ${response.status}`);
      
      const playerData = await response.json();
      kinobdMovies = playerData?.data || [];
      addLog(`Загружено ${kinobdMovies.length} фильмов с kinobd.net...`);

    } catch (e) {
      addLog(`[КРИТИЧЕСКАЯ ОШИБКА] Не удалось загрузить список плееров: ${e.message}`, true);
      setIsLoading(false);
      return;
    }

    let successCount = 0;
    let skippedCount = 0;

    for (const movie of kinobdMovies) {
      
      if (!movie.tmdb_id || !movie.kinopoisk_id) {
        addLog(`[ПРОПУСК] Фильм "${movie.name_russian}" не имеет TMDB_ID или Kinopoisk_ID.`, true);
        skippedCount++;
        continue;
      }

      // 2. ვაგზავნით ჩვენს სერვერზე Supabase-ში ჩასაწერად
      try {
        const apiResponse = await fetch('/api/admin/add-movie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movie: movie }), // ვაგზავნით kinobd ობიექტს
        });

        if (!apiResponse.ok) {
          throw new Error(`Server returned ${apiResponse.status}`);
        }
        
        addLog(`[УСПЕХ] TMDB ID ${movie.tmdb_id} (${movie.name_russian}) добавлен в базу.`);
        successCount++;

      } catch (e) {
        addLog(`[ОШИBKA БАЗЫ] TMDB ID ${movie.tmdb_id}: ${e.message}`, true);
        skippedCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300)); // თავაზიანობა
    }

    addLog(`--- Синхронизация завершена ---`);
    addLog(`Успешно добавлено: ${successCount} | Пропущено/Ошибка: ${skippedCount}`);
    setIsLoading(false);
  };

  return (
    <div className="bg-[#10141A] text-white min-h-screen">
      <Header onSearchSubmit={() => {}} />
      <div className="max-w-4xl mx-auto pt-32 px-4">
        <h1 className="text-3xl font-bold mb-4">Панель синхронизации</h1>
        <p className="text-gray-400 mb-6">
          Этот инструмент загружает данные из kinobd.net (через ваш браузер) и сохраняет их в базу данных Vercel/Supabase (через сервер).
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
          {isLoading ? 'Идет синхронизация...' : 'Синхронизировать 1-ю страницу Kinobd'}
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