// src/components/HeroSlider.js
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import Image from 'next/image';
import Link from 'next/link'; 
import { BACKDROP_BASE_URL } from '../lib/api';
import { slugify } from '../lib/utils'; 

const ImdbBadgeSlider = ({ rating }) => (
  <div className="bg-[#F5C518] text-black px-2 py-0.5 rounded flex items-center gap-1.5 font-bold text-sm shadow-md border border-yellow-500">
    <span className="font-black tracking-tighter">IMDb</span>
    <span>{rating}</span>
  </div>
);

// დიდი ისრები Hero სლაიდერისთვის
const ChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export default function HeroSlider({ movies }) {
  if (!movies || movies.length === 0) {
    return <div className="hero-slider w-full h-[60vh] bg-gray-900"></div>; 
  }

  return (
    <section className="hero-slider relative group w-full overflow-hidden">
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        loop={true}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        navigation={{
          nextEl: '.custom-hero-next',
          prevEl: '.custom-hero-prev',
        }}
        className="h-full w-full"
      >
        {movies.map((movie, index) => {
          const title = movie.title_ru;
          const backdropPath = movie.backdrop_path 
            ? `${BACKDROP_BASE_URL}${movie.backdrop_path}`
            : 'https://placehold.co/1280x720/10141A/6b7280?text=KinoNest';
          const year = movie.release_year || 'N/A';
          const rating = movie.rating_imdb > 0 ? movie.rating_imdb : null;
          const genres = (movie.genres_names || []).slice(0, 3);
          const titleSlug = slugify(title);
          const linkHref = `/${movie.type}/${movie.tmdb_id}-${titleSlug}-smotret-onlain-besplatno`;

          return (
            <SwiperSlide className="relative h-full w-full" key={movie.tmdb_id}>
              {/* სურათი */}
              <Image 
                src={backdropPath} 
                alt={title} 
                fill
                style={{ objectFit: 'cover' }}
                priority={index === 0}
                className="z-0"
              />
              
              {/* გრადიენტი */}
              <div className="slider-gradient absolute inset-0 z-10"></div>
              
              {/* კონტენტი */}
              <div className="relative z-20 flex flex-col justify-end h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-28">
                
                {/* მეტა ინფორმაცია */}
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4 opacity-0 animate-fadeIn" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
                  {rating && <ImdbBadgeSlider rating={rating} />}
                  <div className="text-white font-semibold text-sm border-2 border-white/30 backdrop-blur-md rounded-md px-2 py-0.5">
                    {year}
                  </div>
                  {genres.map((genre) => (
                    <span key={genre} className="text-gray-300 font-medium text-sm capitalize shadow-black drop-shadow-md">
                      {genre}
                    </span>
                  ))}
                </div>
                
                {/* სათაური */}
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white shadow-lg mb-6 max-w-3xl leading-tight drop-shadow-2xl opacity-0 animate-fadeIn" style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}>
                  {title}
                </h2>
                
                {/* ღილაკი */}
                <div className="opacity-0 animate-fadeIn" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
                    <Link href={linkHref} className="inline-block w-auto">
                    <button className="bg-brand-red text-white font-bold py-3.5 px-8 rounded-xl hover:bg-red-700 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 text-lg shadow-[0_4px_20px_rgba(229,9,20,0.5)] border border-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Смотреть фильм
                    </button>
                    </Link>
                </div>
              </div>
            </SwiperSlide>
          )
        })}
      </Swiper>

      {/* Custom Navigation Buttons (მხოლოდ Desktop-ზე) */}
      <div className="custom-hero-prev absolute left-4 md:left-8 top-1/2 z-30 -translate-y-1/2 cursor-pointer text-white/70 hover:text-white transition-all hidden md:flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/30 hover:bg-brand-red/90 backdrop-blur-md border border-white/10 group-hover:opacity-100 opacity-0 duration-300 translate-x-4 group-hover:translate-x-0">
        <ChevronLeft />
      </div>
      <div className="custom-hero-next absolute right-4 md:right-8 top-1/2 z-30 -translate-y-1/2 cursor-pointer text-white/70 hover:text-white transition-all hidden md:flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/30 hover:bg-brand-red/90 backdrop-blur-md border border-white/10 group-hover:opacity-100 opacity-0 duration-300 -translate-x-4 group-hover:translate-x-0">
        <ChevronRight />
      </div>
      
      {/* Pagination dots style override */}
      <div className="swiper-pagination !bottom-6 z-30"></div>
    </section>
  );
};