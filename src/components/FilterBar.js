// src/components/FilterBar.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const years = Array.from({ length: 25 }, (_, i) => (2026 - i).toString()); 

export default function FilterBar({ initialFilters = {}, genres = [], countries = [] }) {
  const router = useRouter();

  const [type, setType] = useState(initialFilters.type || 'all');
  const [genre, setGenre] = useState(initialFilters.genre || 'all');
  const [year, setYear] = useState(initialFilters.year || 'all');
  const [rating, setRating] = useState(initialFilters.rating || 'all');
  const [country, setCountry] = useState(initialFilters.country || 'all');
  const [sort, setSort] = useState(initialFilters.sort || 'year_desc');

  // სინქრონიზაცია URL-თან
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    
    if (q.type) setType(q.type);
    if (q.year) setYear(q.year);
    if (q.rating) setRating(q.rating);
    if (q.sort) setSort(q.sort);
    if (q.country) {
       const found = countries.find(c => c.en === q.country);
       setCountry(found ? found.ru : q.country);
    }
    if (q.genre) {
       setGenre(q.genre.charAt(0).toUpperCase() + q.genre.slice(1));
    }
  }, [router.query, router.isReady, countries]);

  const handleFilter = () => {
    const newQuery = {};

    // 💡 თუ ძებნის გვერდზე ვართ, არ ვკარგავთ საძიებო სიტყვას!
    if (router.pathname === '/search' && router.query.q) {
        newQuery.q = router.query.q;
    }

    if (type !== 'all') newQuery.type = type;
    if (year !== 'all') newQuery.year = year;
    if (rating !== 'all') newQuery.rating = rating;
    if (sort !== 'year_desc') newQuery.sort = sort;
    
    if (genre !== 'all') newQuery.genre = genre.toLowerCase(); 
    if (country !== 'all') {
      const cObj = countries.find(c => c.ru === country);
      newQuery.country = cObj ? cObj.en : country; 
    }

    newQuery.page = 1;
    
    // 💡 სად გადავიდეთ: თუ უკვე ძებნაზე ვართ -> search, თუ არა -> discover
    const targetPath = router.pathname === '/search' ? '/search' : '/discover';
    
    router.push({ pathname: targetPath, query: newQuery });
  };

  const selectClass = "bg-gray-800 text-white text-sm rounded-lg focus:ring-brand-red focus:border-brand-red block w-full p-2.5 cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700";

  return (
    <div className="w-full bg-[#141414] py-6 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Тип</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
              <option value="all">Все</option>
              <option value="movie">Фильмы</option>
              <option value="tv">Сериалы</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Жанр</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className={selectClass}>
              <option value="all">Все жанры</option>
              {genres.map(g => ( <option key={g} value={g}>{g}</option> ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Год</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
              <option value="all">Любой год</option>
              {years.map(y => ( <option key={y} value={y}>{y}</option> ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Страна</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
              <option value="all">Все страны</option>
              {countries.map(c => ( <option key={c.en} value={c.ru}>{c.ru}</option> ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Мин. Рейтинг</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)} className={selectClass}>
              <option value="all">Любой</option>
              <option value="8.0">От 8.0</option>
              <option value="7.0">От 7.0</option>
              <option value="6.0">От 6.0</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Сортировка</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
              <option value="year_desc">Новые</option>
              <option value="year_asc">Старые</option>
              <option value="rating_desc">Высокий рейтинг</option>
            </select>
          </div>

          <div className="col-span-2 md:col-span-3 lg:col-span-6 flex justify-end mt-4">
             <button onClick={handleFilter} className="w-full md:w-auto bg-brand-red hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
               Применить
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};