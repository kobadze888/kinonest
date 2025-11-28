import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SeoHead from '@/components/SeoHead';

export default function Custom404() {
  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <SeoHead 
        title="Страница не найдена - 404 | KinoNest"
        description="К сожалению, запрашиваемая страница не существует."
      />
      
      <Header />
      
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 pt-20">
        <div className="relative">
          <h1 className="text-9xl font-black text-brand-red opacity-20 select-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
             <span className="text-3xl md:text-4xl font-bold text-white">Страница не найдена</span>
          </div>
        </div>
        
        <p className="text-gray-400 mt-4 mb-8 max-w-md text-lg">
          Похоже, вы зашли не туда. Возможно, страница была удалена или ссылка устарела.
        </p>
        
        <Link 
          href="/" 
          className="bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-brand-red/20 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
             <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          На главную
        </Link>
      </main>
      
      <Footer />
    </div>
  );
}