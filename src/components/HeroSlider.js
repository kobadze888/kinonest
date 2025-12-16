import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import Image from 'next/image';
import Link from 'next/link'; 
import { BACKDROP_BASE_URL } from '../lib/api';
import { slugify } from '../lib/utils'; 

const ImdbBadgeSlider = ({ rating }) => (
  <div className="bg-[#F5C518] text-black px-2 py-0.5 rounded flex items-center gap-1.5 font-bold text-sm shadow-md border border-yellow-500">
    <span className="font-black tracking-tighter">IMDb</span><span>{rating}</span>
  </div>
);
const ChevronLeft = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>);
const ChevronRight = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>);

export default function HeroSlider({ movies }) {
  if (!movies || movies.length === 0) return <div className="hero-slider w-full h-[70vh] bg-gray-900"></div>; 

  return (
    <section className="hero-slider relative group w-full">
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        loop={true}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        pagination={{ clickable: true, el: '.swiper-pagination' }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        navigation={{ nextEl: '.custom-hero-next', prevEl: '.custom-hero-prev' }}
        className="h-full w-full"
      >
        {movies.map((movie, index) => {
          const title = movie.title_ru;
          const backdropPath = movie.backdrop_path ? `${BACKDROP_BASE_URL}${movie.backdrop_path}` : 'https://placehold.co/1280x720/10141A/6b7280?text=KinoNest';
          const linkHref = `/${movie.type}/${movie.tmdb_id}-${slugify(title)}-smotret-onlain-besplatno`;

          return (
            <SwiperSlide className="relative h-full w-full bg-black" key={movie.tmdb_id}>
              <Image 
                src={backdropPath} 
                alt={title} 
                fill
                style={{ objectFit: 'cover' }}
                priority={index === 0}
                className="opacity-100"
                sizes="100vw"
                fetchPriority={index === 0 ? "high" : "auto"}
              />
              <div className="slider-gradient absolute inset-0 z-10"></div>
              <div className="relative z-20 flex flex-col justify-end h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-28">
                <div className="max-w-3xl">
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4">
                    {movie.rating_imdb > 0 && <ImdbBadgeSlider rating={movie.rating_imdb} />}
                    <div className="text-white font-bold text-sm border border-white/40 rounded px-2 py-0.5 backdrop-blur-sm">{movie.release_year}</div>
                    {movie.genres_names?.slice(0, 3).map((genre) => (<span key={genre} className="text-gray-200 font-medium text-sm capitalize shadow-sm">{genre}</span>))}
                    </div>
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight drop-shadow-lg">{title}</h2>
                    <div className="flex gap-4">
                        {/* ✅ prefetch={false} */}
                        <Link href={linkHref} prefetch={false} className="bg-brand-red hover:bg-red-700 text-white font-bold py-3.5 px-8 rounded-xl transition-transform transform hover:scale-105 flex items-center gap-3 text-lg shadow-lg shadow-red-900/50 inline-flex">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                            Смотреть фильм
                        </Link>
                    </div>
                </div>
              </div>
            </SwiperSlide>
          )
        })}
        <div className="swiper-pagination"></div>
      </Swiper>
      <div className="custom-hero-prev absolute left-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer text-white/70 hover:text-white transition-all hidden md:flex items-center justify-center w-14 h-14 rounded-full bg-white/10 hover:bg-brand-red backdrop-blur-md border border-white/10"><ChevronLeft /></div>
      <div className="custom-hero-next absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer text-white/70 hover:text-white transition-all hidden md:flex items-center justify-center w-14 h-14 rounded-full bg-white/10 hover:bg-brand-red backdrop-blur-md border border-white/10"><ChevronRight /></div>
    </section>
  );
};