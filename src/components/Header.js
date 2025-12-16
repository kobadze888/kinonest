import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useWatchlist } from '@/lib/useWatchlist';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [isSearchFocused, setIsSearchFocused] = useState(false); 
  const router = useRouter();
  const searchInputRef = useRef(null);

  const { watchlist } = useWatchlist();
  const hasItems = watchlist.length > 0;

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
    if (trimmedQuery) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      setIsSearchFocused(false); 
      if (searchInputRef.current) searchInputRef.current.blur();
    }
  };

  const handleSearchKey = (e) => { if (e.key === 'Enter') { handleSearchSubmit(); } };

  useEffect(() => {
    if (router.isReady && !router.pathname.startsWith('/search')) { setSearchQuery(''); }
    else if (router.isReady && router.query.q) { setSearchQuery(router.query.q); }
    setIsMobileMenuOpen(false); 
  }, [router.isReady, router.pathname, router.query.q]);

  const jsonLd = { "@context": "https://schema.org", "@type": "WebSite", "url": "https://kinonest.vercel.app/", "potentialAction": { "@type": "SearchAction", "target": { "@type": "EntryPoint", "urlTemplate": "https://kinonest.vercel.app/search?q={search_term_string}" }, "query-input": "required name=search_term_string" } };

  const navLinks = [
    { href: "/", label: "Главная", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { href: "/movies", label: "Фильмы", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg> },
    { href: "/tv-shows", label: "Сериалы", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
    { href: "/kids", label: "Детям", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { href: "/actors", label: "Актеры", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { href: "/top", label: "Топ", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
  ];

  return (
    <>
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#10141A]/95 backdrop-blur-md shadow-lg py-2' : 'bg-gradient-to-b from-[#10141A]/90 to-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            <div className="flex-shrink-0 flex items-center gap-2">
              {/* ✅ prefetch={false} */}
              <Link href="/" prefetch={false} className="group flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center shadow-lg shadow-red-600/30 transform group-hover:rotate-12 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                </div>
                <span className="text-2xl font-black text-white tracking-wider group-hover:text-gray-200 transition-colors">
                  Kino<span className="text-brand-red">Nest</span>
                </span>
              </Link>
            </div>

            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-4">
              {navLinks.map((link) => (
                // ✅ prefetch={false}
                <Link key={link.href} href={link.href} prefetch={false} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${router.pathname === link.href ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
                  <span className={`${router.pathname === link.href ? 'text-brand-red' : 'text-gray-400 group-hover:text-brand-red transition-colors'}`}>
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {/* ✅ prefetch={false} */}
              <Link href="/watchlist" prefetch={false} className="relative group hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/20">
                <div className={`transition-colors ${hasItems ? 'text-brand-red' : 'text-gray-400 group-hover:text-white'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill={hasItems ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {hasItems && (
                    <span className="absolute -top-1 -right-1 bg-brand-red text-white text-[9px] font-bold px-1.5 rounded-full min-w-[16px] h-4 flex items-center justify-center shadow-sm border border-[#10141A]">
                      {watchlist.length}
                    </span>
                  )}
                </div>
              </Link>

              <div className={`relative group flex items-center transition-all duration-300 ${isSearchFocused ? 'w-full md:w-72' : 'w-40 md:w-56'}`}>
                <div className={`absolute left-0 inset-y-0 pl-3 flex items-center pointer-events-none transition-colors ${isSearchFocused ? 'text-brand-red' : 'text-gray-400'}`}>
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={isSearchFocused ? "Введите название..." : (placeholder || "Поиск...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKey}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className={`bg-white/5 border border-white/10 hover:border-white/20 text-white text-base md:text-sm rounded-full block w-full pl-10 p-2.5 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red focus:bg-[#1a1f26] transition-all shadow-inner`}
                />
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
              >
                {isMobileMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                )}
              </button>
            </div>

          </div>
        </div>

        <div className={`lg:hidden bg-[#10141A] border-b border-gray-800 overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => (
              // ✅ prefetch={false}
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${router.pathname === link.href ? 'bg-brand-red text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
              >
                <span className={`${router.pathname === link.href ? 'text-white' : 'text-gray-500'}`}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            ))}
            {/* ✅ prefetch={false} */}
            <Link
              href="/watchlist"
              prefetch={false}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${router.pathname === '/watchlist' ? 'bg-brand-red text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
            >
              <span className={`${router.pathname === '/watchlist' ? 'text-white' : 'text-gray-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </span>
              Избранное
              {hasItems && <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{watchlist.length}</span>}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
};