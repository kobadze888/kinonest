import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const years = Array.from({ length: 35 }, (_, i) => (2026 - i).toString());

// დამხმარე კომპონენტი: Custom Dropdown
const CustomDropdown = ({ label, value, options, onChange, hasSearch = false, searchPlaceholder = "Поиск..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = hasSearch
    ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const selectedLabel = options.find(opt => opt.value === value)?.label || label;

  return (
    // 💡 შესწორება: როცა ღიაა, ვიყენებთ z-[999]-ს, რომ ყველაფერს გადაფაროს. 
    // როცა დახურულია, z-10 საკმარისია.
    <div className={`relative w-full ${isOpen ? 'z-[999]' : 'z-10'}`} ref={dropdownRef}>
      <div className="text-xs text-gray-400 mb-1.5 ml-1">{label}</div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#1F1F1F] hover:bg-[#2a2a2a] text-left text-white text-sm rounded-lg py-3 px-4 flex items-center justify-between transition-all border ${isOpen ? 'border-brand-red' : 'border-transparent'}`}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        // 💡 დამატებითი z-index თვითონ მენიუსთვისაც
        <div className="absolute top-full mt-2 w-full bg-[#1F1F1F] border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-[1000]">
          {hasSearch && (
            <div className="p-2 border-b border-gray-700 sticky top-0 bg-[#1F1F1F] z-[1001]">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                // მობილურის ზუმის ფიქსი (text-base)
                className="w-full bg-[#141414] text-white text-base md:text-xs rounded-md p-2 outline-none focus:ring-1 focus:ring-brand-red border border-gray-700"
                autoFocus
              />
            </div>
          )}
          
          <div className="max-h-60 overflow-y-auto custom-scrollbar relative z-[1001]">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2
                    ${value === opt.value ? 'bg-brand-red text-white' : 'text-gray-300 hover:bg-white/10'}
                  `}
                >
                  <div className={`w-2 h-2 rounded-full ${value === opt.value ? 'bg-white' : 'bg-gray-600'}`}></div>
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-gray-500 text-xs">Ничего не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function FilterBar({ initialFilters = {}, genres = [], countries = [] }) {
  const router = useRouter();

  const [type, setType] = useState(initialFilters.type || 'all');
  const [genre, setGenre] = useState(initialFilters.genre || 'all');
  const [year, setYear] = useState(initialFilters.year || 'all');
  const [rating, setRating] = useState(initialFilters.rating || 'all');
  const [country, setCountry] = useState(initialFilters.country || 'all');
  const [sort, setSort] = useState(initialFilters.sort || 'year_desc');

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    
    if (router.pathname === '/kids') setType('kids');
    else if (router.pathname === '/top') setType('top');
    else if (router.pathname === '/tv-shows') setType('tv');
    else if (router.pathname === '/movies') setType('movie');
    else if (q.type) setType(q.type);
    else setType('all');

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
  }, [router.query, router.isReady, router.pathname, countries]);

  const handleFilter = () => {
    if (type === 'kids') { router.push('/kids'); return; }
    if (type === 'top') { router.push('/top'); return; }

    const newQuery = {};
    if (router.pathname === '/search' && router.query.q) { newQuery.q = router.query.q; }
    if (type === 'movie' || type === 'tv') newQuery.type = type;
    if (year !== 'all') newQuery.year = year;
    if (rating !== 'all') newQuery.rating = rating;
    if (sort !== 'year_desc') newQuery.sort = sort;
    if (genre !== 'all') newQuery.genre = genre.toLowerCase(); 
    if (country !== 'all') {
      const cObj = countries.find(c => c.ru === country);
      newQuery.country = cObj ? cObj.en : country; 
    }
    newQuery.page = 1;
    
    const targetPath = router.pathname === '/search' ? '/search' : '/discover';
    router.push({ pathname: targetPath, query: newQuery });
  };

  const typeOptions = [
    { label: 'Все', value: 'all' },
    { label: 'Фильмы', value: 'movie' },
    { label: 'Сериалы', value: 'tv' },
    { label: 'Детям', value: 'kids' },
    { label: 'Топ', value: 'top' },
  ];

  const genreOptions = [{ label: 'Все жанры', value: 'all' }, ...genres.map(g => ({ label: g, value: g }))];
  const yearOptions = [{ label: 'Любой год', value: 'all' }, ...years.map(y => ({ label: y, value: y }))];
  const countryOptions = [{ label: 'Все страны', value: 'all' }, ...countries.map(c => ({ label: c.ru, value: c.ru }))];
  
  const ratingOptions = [
    { label: 'Любой', value: 'all' },
    { label: 'От 9.0', value: '9.0' },
    { label: 'От 8.0', value: '8.0' },
    { label: 'От 7.0', value: '7.0' },
    { label: 'От 6.0', value: '6.0' },
    { label: 'От 5.0', value: '5.0' },
  ];

  return (
    // მთავარ კონტეინერს აქვს z-40, რაც საკმარისია ჰედერისთვის, 
    // მაგრამ დროპდაუნები მას "გაარღვევენ" თავიანთი z-999-ით
    <div className="w-full bg-[#141414] py-8 border-b border-gray-800 relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          
          <div className="lg:col-span-1">
            <CustomDropdown label="Тип" value={type} options={typeOptions} onChange={setType} />
          </div>

          <div className="lg:col-span-1">
            <CustomDropdown label="Жанр" value={genre} options={genreOptions} onChange={setGenre} hasSearch={true} searchPlaceholder="Поиск жанра..." />
          </div>

          <div className="lg:col-span-1">
            <CustomDropdown label="Год" value={year} options={yearOptions} onChange={setYear} />
          </div>
          
          <div className="lg:col-span-1">
            <CustomDropdown label="Страна" value={country} options={countryOptions} onChange={setCountry} hasSearch={true} searchPlaceholder="Поиск страны..." />
          </div>

          <div className="lg:col-span-1">
             <CustomDropdown label="Рейтинг" value={rating} options={ratingOptions} onChange={setRating} />
          </div>
          
          <div className="lg:col-span-1">
             <div className="text-xs text-transparent mb-1.5 select-none">Button</div>
             <button onClick={handleFilter} className="w-full bg-gradient-to-r from-brand-red to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 h-[46px]">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
               Начать поиск
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};