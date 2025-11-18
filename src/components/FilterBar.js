// src/components/FilterBar.js (Компонент фильтрации)
import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function FilterBar() {
  const router = useRouter();
  
  // Состояния для фильтров
  const [type, setType] = useState('all');
  const [genre, setGenre] = useState('all');
  const [year, setYear] = useState('all');
  const [rating, setRating] = useState('all');
  const [country, setCountry] = useState('all');

  // Списки данных
  const genres = ["боевик", "комедия", "драма", "ужасы", "фантастика", "триллер", "приключения", "фэнтези", "криминал", "семейный", "мультфильм"];
  const countries = ["США", "Россия", "Великобритания", "Франция", "Япония", "Корея Южная", "Германия"];
  const years = Array.from({ length: 25 }, (_, i) => (2024 - i).toString()); // 2024-2000

  const handleFilter = () => {
    // Собираем параметры
    const query = {};
    if (type !== 'all') query.type = type;
    if (genre !== 'all') query.genre = genre;
    if (year !== 'all') query.year = year;
    if (rating !== 'all') query.rating = rating;
    if (country !== 'all') query.country = country;

    // Перенаправляем на страницу Discover
    router.push({
      pathname: '/discover',
      query: query,
    });
  };

  // Общие стили для селектов
  const selectClass = "bg-gray-800 text-white text-sm rounded-lg focus:ring-brand-red focus:border-brand-red block w-full p-2.5 cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700";

  return (
    <div className="w-full bg-[#141414] py-6 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          
          {/* Тип (Фильм/Сериал) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Тип</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
              <option value="all">Все</option>
              <option value="movie">Фильмы</option>
              <option value="tv">Сериалы</option>
            </select>
          </div>

          {/* Жанр */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Жанр</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className={selectClass}>
              <option value="all">Все жанры</option>
              {genres.map(g => (
                <option key={g} value={g} className="capitalize">{g}</option>
              ))}
            </select>
          </div>

          {/* Год */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Год</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
              <option value="all">Любой год</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Рейтинг */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Рейтинг (IMDb)</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)} className={selectClass}>
              <option value="all">Любой</option>
              <option value="9">От 9.0</option>
              <option value="8">От 8.0</option>
              <option value="7">От 7.0</option>
              <option value="6">От 6.0</option>
              <option value="5">От 5.0</option>
            </select>
          </div>

           {/* Страна */}
           <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Страна</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
              <option value="all">Все страны</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Кнопка Поиска */}
          <div className="flex flex-col gap-1">
             <label className="text-xs text-transparent select-none">Поиск</label>
             <button 
              onClick={handleFilter}
              className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
               Найти
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};