// --- ОБНОВЛЕННЫЙ ФАЙЛ (с внутренним состоянием поиска) ---
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router'; // 💡 1. Импортируем useRouter

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  
  // 💡 2. Header теперь сам управляет состоянием поиска
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 💡 3. Новая логика поиска
  const handleSearchSubmit = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      // Перенаправляем на новую страницу /search
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  // 💡 4. (Бонус) Очищаем поле поиска, если мы ушли со страницы поиска
  useEffect(() => {
    if (!router.pathname.startsWith('/search')) {
      setSearchQuery('');
    }
  }, [router.asPath]);


  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#10141A]/90 backdrop-blur-sm' : 'bg-gradient-to-b from-[#10141A]/90 to-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div>
            <Link href="/" className="text-3xl font-black text-brand-red tracking-wider cursor-pointer">
              KinoNest
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-white font-semibold hover:text-brand-red transition-colors">
              Главная
            </Link>
            <a href="#" className="text-gray-300 hover:text-brand-red transition-colors">Фильмы</a>
            <a href="#" className="text-gray-300 hover:text-brand-red transition-colors">Сериалы</a>
            <a href="#" className="text-gray-300 hover:text-brand-red transition-colors">Актеры</a>
          </nav>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Поиск фильма..." 
                value={searchQuery} // 💡 Используем внутренний state
                onChange={(e) => setSearchQuery(e.target.value)} // 💡 Используем внутренний state
                onKeyPress={handleSearchKey}
                className="bg-gray-800/50 border border-gray-700 rounded-full py-2 px-4 pl-10 text-sm text-white focus:outline-none focus:bg-gray-700 focus:border-brand-red transition-all w-40 md:w-64"
              />
              <svg 
                onClick={handleSearchSubmit} // 💡 Используем новую логику
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button className="md:hidden text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};