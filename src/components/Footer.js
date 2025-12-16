import React from 'react';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const genres = [
    { name: 'Боевики', slug: 'action' },
    { name: 'Комедии', slug: 'comedy' },
    { name: 'Драмы', slug: 'drama' },
    { name: 'Ужасы', slug: 'horror' },
    { name: 'Фантастика', slug: 'scifi' },
    { name: 'Триллеры', slug: 'thriller' },
    { name: 'Мультфильмы', slug: 'animation' },
  ];

  return (
    <footer className="mt-20 border-t border-gray-800 bg-[#0d1116] pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          
          <div className="col-span-2 md:col-span-1">
            {/* ✅ LOGO: prefetch={false} */}
            <Link href="/" prefetch={false} className="inline-block mb-4 hover:opacity-80 transition-opacity">
               <span className="text-2xl font-black text-white tracking-wider">
                 Kino<span className="text-brand-red">Nest</span>
               </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Смотрите новинки кино и лучшие сериалы {currentYear} года онлайн бесплатно в хорошем качестве HD. Без регистрации.
            </p>
          </div>

          <div className="col-span-1">
            <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Разделы</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {/* ✅ LINKS: prefetch={false} */}
              <li><Link href="/discover?sort=year_desc&type=movie" prefetch={false} className="hover:text-brand-red transition">Свежие поступления</Link></li>
              <li><Link href="/movies" prefetch={false} className="hover:text-brand-red transition">Фильмы</Link></li>
              <li><Link href="/tv-shows" prefetch={false} className="hover:text-brand-red transition">Сериалы</Link></li>
              <li><Link href="/kids" prefetch={false} className="hover:text-brand-red transition">Детям</Link></li>
              <li><Link href="/top" prefetch={false} className="hover:text-brand-red transition">Топ 100</Link></li>
            </ul>
          </div>

          <div className="col-span-1">
            <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Жанры</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {genres.map(g => (
                <li key={g.slug}>
                  {/* ✅ GENRE LINKS: prefetch={false} */}
                  <Link href={`/genre/${g.slug}`} prefetch={false} className="hover:text-brand-red transition">
                    {g.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1 mt-4 md:mt-0">
            <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Инфо</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><span className="text-gray-500 cursor-pointer hover:text-white transition">Правообладателям (DMCA)</span></li>
              <li><span className="text-gray-500 cursor-pointer hover:text-white transition">Контакты</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 text-center md:text-left">
          <p>&copy; 2023-{currentYear} KinoNest.TV. Все права защищены.</p>
          <p className="mt-2 md:mt-0">
            Видеофайлы не хранятся на сервере.
          </p>
        </div>
      </div>
    </footer>
  );
};