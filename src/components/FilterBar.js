// src/components/FilterBar.js (სრული სიებით - მყარად ჩაწერილი)
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function FilterBar({ initialFilters = {}, genres: propGenres = [], countries: propCountries = [] }) {
  const router = useRouter();
  
  // --- 1. სრული ჟანრების სია (შენი ბაზიდან) ---
  const fallbackGenres = [
      "Боевик", "Вестерн", "Военный", "Детектив", "Документальный",
      "Драма", "История", "Комедия", "Криминал", "Мелодрама", 
      "Музыка", "Мультфильм", "Приключения", "Семейный", 
      "Телевизионный фильм", "Триллер", "Ужасы", "Фантастика", "Фэнтези"
  ];

  // --- 2. სრული ქვეყნების სია (შენი JSON-დან) ---
  // აქ ჩავწერე ყველაზე პოპულარული და ხშირად გამოყენებადი ქვეყნები
  const fallbackCountries = [
      { en: "United States of America", ru: "США" },
      { en: "Russian Federation", ru: "Россия" },
      { en: "United Kingdom", ru: "Великобритания" },
      { en: "France", ru: "Франция" },
      { en: "Japan", ru: "Япония" },
      { en: "South Korea", ru: "Южная Корея" },
      { en: "Germany", ru: "Германия" },
      { en: "China", ru: "Китай" },
      { en: "Canada", ru: "Канада" },
      { en: "Australia", ru: "Австралия" },
      { en: "India", ru: "Индия" },
      { en: "Spain", ru: "Испания" },
      { en: "Italy", ru: "Италия" },
      { en: "Mexico", ru: "Мексика" },
      { en: "Brazil", ru: "Бразилия" },
      { en: "Turkey", ru: "Турция" },
      { en: "Sweden", ru: "Швеция" },
      { en: "Denmark", ru: "Дания" },
      { en: "Norway", ru: "Норвегия" },
      { en: "Ukraine", ru: "Украина" },
      { en: "Belarus", ru: "Беларусь" },
      { en: "Kazakhstan", ru: "Казахстан" }
  ];
  
  const years = Array.from({ length: 25 }, (_, i) => (2024 - i).toString()); 
  
  // ვიყენებთ ამ სიებს პირდაპირ (აღარ ველოდებით API-ს)
  const genreList = propGenres.length > 0 ? propGenres : fallbackGenres;
  const countryList = propCountries.length > 0 ? propCountries : fallbackCountries;

  // სთეითები
  const [type, setType] = useState(initialFilters.type || 'all');
  const [genre, setGenre] = useState(initialFilters.genre || 'all');
  const [year, setYear] = useState(initialFilters.year || 'all');
  const [rating, setRating] = useState(initialFilters.rating || 'all');
  const [country, setCountry] = useState(initialFilters.country || 'all');
  const [sort, setSort] = useState(initialFilters.sort || 'year_desc');

  // ეფექტი URL-ის ცვლილებისას
  useEffect(() => {
    const currentQuery = router.query;
    setType(currentQuery.type || 'all');
    
    const countryInUrl = countryList.find(c => c.en === currentQuery.country);
    setCountry(countryInUrl ? countryInUrl.ru : currentQuery.country || 'all');
    
    setGenre(currentQuery.genre ? (currentQuery.genre.charAt(0).toUpperCase() + currentQuery.genre.slice(1)) : 'all');
    setYear(currentQuery.year || 'all');
    setRating(currentQuery.rating || 'all');
    setSort(currentQuery.sort || 'year_desc');
  }, [router.query, countryList]);


  const handleFilter = () => {
    const newQuery = {};
    
    if (type !== 'all') newQuery.type = type;
    if (year !== 'all') newQuery.year = year;
    if (rating !== 'all') newQuery.rating = rating;
    if (sort !== 'year_desc') newQuery.sort = sort;
    
    if (genre !== 'all') newQuery.genre = genre.toLowerCase(); 

    if (country !== 'all') {
      const selectedCountryObj = countryList.find(c => c.ru === country);
      newQuery.country = selectedCountryObj ? selectedCountryObj.en : country; 
    }

    newQuery.page = 1;
    
    router.push({
      pathname: '/discover',
      query: newQuery,
    });
  };

  const selectClass = "bg-gray-800 text-white text-sm rounded-lg focus:ring-brand-red focus:border-brand-red block w-full p-2.5 cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700";

  return (
    <div className="w-full bg-[#141414] py-6 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          
          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Тип</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
              <option value="all">Все</option>
              <option value="movie">Фильмы</option>
              <option value="tv">Сериалы</option>
            </select>
          </div>

          {/* Genre (სრული სია) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Жанр</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className={selectClass}>
              <option value="all">Все жанры</option>
              {genreList.map(g => (
                <option key={g} value={g} className="capitalize">{g}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Год</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
              <option value="all">Любой год</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          {/* Country (სრული სია) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Страна</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
              <option value="all">Все страны</option>
              {countryList.map(c => (
                <option key={c.en} value={c.ru}>{c.ru}</option> 
              ))}
            </select>
          </div>

          {/* Rating */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Мин. Рейтинг (IMDb)</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)} className={selectClass}>
              <option value="all">Любой</option>
              <option value="9.0">От 9.0</option>
              <option value="8.0">От 8.0</option>
              <option value="7.0">От 7.0</option>
              <option value="6.0">От 6.0</option>
              <option value="5.0">От 5.0</option>
            </select>
          </div>
          
          {/* Sort */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 ml-1">Сортировать по</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
              <option value="year_desc">Году (Новые)</option>
              <option value="year_asc">Году (Старые)</option>
              <option value="rating_desc">Рейтингу IMDb (Высший)</option>
              <option value="rating_asc">Рейтингу IMDb (Низший)</option>
            </select>
          </div>

          {/* Button */}
          <div className="col-span-2 md:col-span-3 lg:col-span-6 flex justify-end mt-4">
             <button 
              onClick={handleFilter}
              className="w-full md:w-auto bg-brand-red hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
               Применить фильтр
             </button>
          </div>

        </div>
      </div>
      
      {/* ნავიგაციის ღილაკები (ჟანრები) - ახლა ეგრევე გამოჩნდება */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <h3 className="text-sm text-gray-400 mb-2">Навигация по жанрам:</h3>
        <div className="flex flex-wrap gap-2">
          {genreList.map(g => (
            <button
              key={g}
              onClick={() => {
                router.push({
                  pathname: '/discover',
                  query: { 
                    ...router.query, 
                    genre: g.toLowerCase(), 
                    page: 1,
                  }, 
                });
              }}
              className="px-3 py-1 bg-gray-800 text-sm rounded-full text-gray-300 hover:bg-brand-red hover:text-white transition-colors"
            >
              {g}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};