// src/components/Header.js (С РАБОЧИМИ ССЫЛКАМИ)
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head'; 

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholder, setPlaceholder] = useState(''); 
  const router = useRouter();

  // --- Анимация (без изменений) ---
  useEffect(() => {
    const phrases = ["Поиск фильма...", "Матрица", "Криминальное чтиво", "shrek", "Зеленая миля", "boec"];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId;
    const type = () => {
      const currentPhrase = phrases[phraseIndex];
      if (isDeleting) { setPlaceholder(currentPhrase.substring(0, charIndex - 1)); charIndex--; } 
      else { setPlaceholder(currentPhrase.substring(0, charIndex + 1)); charIndex++; }
      let typeSpeed = 100;
      if (isDeleting) typeSpeed /= 2; 
      if (!isDeleting && charIndex === currentPhrase.length) { typeSpeed = 2000; isDeleting = true; } 
      else if (isDeleting && charIndex === 0) { isDeleting = false; phraseIndex = (phraseIndex + 1) % phrases.length; typeSpeed = 500; }
      timeoutId = setTimeout(type, typeSpeed);
    };
    type(); 
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handleScroll = () => { setIsScrolled(window.scrollY > 50); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) { router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`); }
  };

  const handleSearchKey = (e) => { if (e.key === 'Enter') { handleSearchSubmit(); } };

  useEffect(() => {
    if (router.isReady && !router.pathname.startsWith('/search')) { setSearchQuery(''); } 
    else if (router.isReady && router.query.q) { setSearchQuery(router.query.q); }
  }, [router.isReady, router.pathname, router.query.q]);

  const jsonLd = { "@context": "https://schema.org", "@type": "WebSite", "url": "https://kinonest.vercel.app/", "potentialAction": { "@type": "SearchAction", "target": { "@type": "EntryPoint", "urlTemplate": "https://kinonest.vercel.app/search?q={search_term_string}" }, "query-input": "required name=search_term_string" } };

  return (
    <>
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#10141A]/95 backdrop-blur-md shadow-lg' : 'bg-gradient-to-b from-[#10141A]/90 to-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            <div className="flex-shrink-0">
              <Link href="/" className="text-3xl font-black text-brand-red tracking-wider cursor-pointer hover:opacity-80 transition-opacity">
                KinoNest
              </Link>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-white font-medium hover:text-brand-red transition-colors">
                Главная
              </Link>
              {/* 💡 --- ОБНОВЛЕННЫЕ ССЫЛКИ --- 💡 */}
              <Link href="/movies" className="text-gray-300 font-medium hover:text-brand-red transition-colors">
                Фильмы
              </Link>
              <Link href="/tv-shows" className="text-gray-300 font-medium hover:text-brand-red transition-colors">
                Сериалы
              </Link>
              <Link href="/kids" className="text-gray-300 font-medium hover:text-brand-red transition-colors">
                Детям
              </Link>
              <Link href="/actors" className="text-gray-300 font-medium hover:text-brand-red transition-colors">
                Актеры
              </Link>
              <Link href="/top" className="text-gray-300 font-medium hover:text-brand-red transition-colors">
                Топ
              </Link>
            </nav>

            <div className="flex items-center">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder={placeholder || "Поиск..."} 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  onKeyPress={handleSearchKey}
                  className="bg-gray-800/80 border border-gray-700 rounded-full py-2 px-4 pl-11 text-sm text-white placeholder-gray-400 focus:outline-none focus:bg-gray-900 focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all w-40 md:w-64 group-hover:border-gray-600"
                />
                <button onClick={handleSearchSubmit} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1">
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              
              <button className="md:hidden ml-4 text-white p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </header>
    </>
  );
};