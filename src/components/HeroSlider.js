// src/components/HeroSlider.js (НОВЫЙ ПРОФЕССИОНАЛЬНЫЙ ДИЗАЙН)
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import Image from 'next/image'; // 💡 1. ИМПОРТИРУЕМ 'Image'
import { BACKDROP_BASE_URL } from '../lib/api';

// ... (Иконка StarIcon остается без изменений)
const StarIcon = () => (
  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.168c.969 0 1.371 1.24.588 1.81l-3.373 2.449a1 1 0 00-.364 1.118l1.287 3.959c.3.921-.755 1.688-1.54 1.118l-3.373-2.449a1 1 0 00-1.175 0l-3.373 2.449c-.784.57-1.839-.197-1.54-1.118l1.287-3.959a1 1 0 00-.364-1.118L2.053 9.386c-.783-.57-.38-1.81.588-1.81h4.168a1 1 0 00.95-.69L9.049 2.927z"></path>
  </svg>
);
// ...

export default function HeroSlider({ movies, onShowTrailer }) {
  if (!movies || movies.length === 0) {
    return <div className="hero-slider"></div>; 
  }

  return (
    <section className="hero-slider">
      <Swiper
        // ... (все 'modules', 'loop', 'autoplay' и т.д. остаются)
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        loop={true}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
        }}
        navigation={{
          nextEl: '.hero-nav-next',
          prevEl: '.hero-nav-prev',
        }}
        effect="fade"
        fadeEffect={{
          crossFade: true
        }}
        className="h-full"
      >
        {movies.map((movie, index) => { // 💡 Добавили 'index'
          const title = movie.title_ru;
          const backdropPath = movie.backdrop_path 
            ? `${BACKDROP_BASE_URL}${movie.backdrop_path}`
            : 'https://placehold.co/1280x720/10141A/6b7280?text=KinoNest';
          const year = movie.release_year || 'N/A';
          const rating = movie.rating_tmdb ? movie.rating_tmdb : 'N/A';
          const genres = (movie.genres_names || []).slice(0, 3);

          return (
            <SwiperSlide className="relative" key={movie.tmdb_id}>
              
              {/* 💡 2. ЗАМЕНЯЕМ <img> НА <Image> */}
              <Image 
                src={backdropPath} 
                alt={title} 
                fill
                style={{ objectFit: 'cover' }}
                sizes="100vw"
                priority={index === 0} // 💡 Загружаем первый слайд с приоритетом
              />

              <div className="slider-gradient absolute inset-0"></div>
              <div className="relative z-10 flex flex-col justify-end h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-32">
                
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-3">
                  <div className="bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-white flex items-center gap-1.5">
                    <StarIcon />
                    <span>{rating}</span>
                  </div>
                  <div className="text-white font-semibold text-sm border-2 border-white/50 rounded-md px-2 py-0.5">
                    {year}
                  </div>
                  {genres.map((genre) => (
                    <span key={genre} className="text-gray-300 font-medium text-sm">
                      {genre}
                    </span>
                  ))}
                </div>
                
                <h2 className="text-3xl md:text-5xl font-black text-white shadow-lg">{title}</h2>
                <p className="max-w-xl text-md md:text-lg text-gray-200 mt-4 line-clamp-3">{movie.overview}</p>
                <button 
                  onClick={() => onShowTrailer(movie)} 
                  className="trailer-button mt-6 bg-brand-red text-white font-bold py-3 px-6 rounded-lg w-auto max-w-xs hover:bg-red-700 transition-colors focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2 -mt-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Смотреть фильм
                </button>
              </div>
            </SwiperSlide>
          )
        })}
        
        <div className="swiper-pagination"></div>
        <div className="swiper-button-next hero-nav-next"></div>
        <div className="swiper-button-prev hero-nav-prev"></div>
      </Swiper>
    </section>
  );
};