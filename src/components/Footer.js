import React from 'react';
import Link from 'next/link';

export default function Footer() {
  // იღებს მიმდინარე წელს ავტომატურად (2025, 2026 და ა.შ.)
  const currentYear = new Date().getFullYear();

  // ეს slug-ები ზუსტად უნდა ემთხვეოდეს src/pages/genre/[slug].js-ში გაწერილ map-ს
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* სვეტი 1: ლოგო (მხოლოდ ტექსტი) და აღწერა */}
          <div>
            <Link href="/" className="inline-block mb-4 hover:opacity-80 transition-opacity">
               <span className="text-2xl font-black text-white tracking-wider">
                 Kino<span className="text-brand-red">Nest</span>
               </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Смотрите новинки кино и лучшие сериалы {currentYear} года онлайн бесплатно в хорошем качестве HD. Без регистрации.
            </p>
          </div>

          {/* სვეტი 2: ნავიგაცია */}
          <div>
            <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Разделы</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/movies" className="hover:text-brand-red transition">Фильмы</Link></li>
              <li><Link href="/tv-shows" className="hover:text-brand-red transition">Сериалы</Link></li>
              <li><Link href="/kids" className="hover:text-brand-red transition">Детям</Link></li>
              <li><Link href="/top" className="hover:text-brand-red transition">Топ 100</Link></li>
            </ul>
          </div>

          {/* სვეტი 3: პოპულარული ჟანრები (სწორი ბმულებით) */}
          <div>
            <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Жанры</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {genres.map(g => (
                <li key={g.slug}>
                  {/* ვიყენებთ /genre/[slug] მარშრუტს, რომელიც სწორად ეძებს ბაზაში */}
                  <Link href={`/genre/${g.slug}`} className="hover:text-brand-red transition">
                    {g.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* სვეტი 4: ინფო */}
          <div>
            <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Инфо</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><span className="text-gray-500 cursor-pointer hover:text-white transition">Правообладателям (DMCA)</span></li>
              <li><span className="text-gray-500 cursor-pointer hover:text-white transition">Контакты</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600">
          <p>&copy; 2023-{currentYear} KinoNest.TV. Все права защищены.</p>
          <p className="mt-2 md:mt-0">
            Видеофайлы не хранятся на сервере.
          </p>
        </div>
      </div>
    </footer>
  );
};