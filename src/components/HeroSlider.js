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

export default function HeroSlider({ movies }) {
  if (!movies || movies.length === 0) {
    return <div className="hero-slider"></div>; 
  }

  return (
    <section className="hero-slider">
      <Swiper
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
        {movies.map((movie, index) => {
          const title = movie.title_ru;
          const backdropPath = movie.backdrop_path 
            ? `${BACKDROP_BASE_URL}${movie.backdrop_path}`
            : 'https://placehold.co/1280x720/10141A/6b7280?text=KinoNest';
          const year = movie.release_year || 'N/A';
          
          // 💡 IMDb რეიტინგი პრიორიტეტულია
          const rating = movie.rating_imdb > 0 ? movie.rating_imdb : null;
          const genres = (movie.genres_names || []).slice(0, 3);

          const titleSlug = slugify(title);
          const seoSuffix = 'smotret-onlain-besplatno';
          const linkHref = `/${movie.type}/${movie.tmdb_id}-${titleSlug}-${seoSuffix}`;

          return (
            <SwiperSlide className="relative" key={movie.tmdb_id}>
              <Image 
                src={backdropPath} 
                alt={title} 
                fill
                style={{ objectFit: 'cover' }}
                sizes="100vw"
                priority={index === 0}
              />

              <div className="slider-gradient absolute inset-0"></div>
              <div className="relative z-10 flex flex-col justify-end h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-32">
                
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-3">
                  {rating && <ImdbBadgeSlider rating={rating} />}
                  
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
                
                <Link href={linkHref} className="mt-6 inline-block w-auto max-w-xs">
                  <button 
                    className="trailer-button bg-brand-red text-white font-bold py-3 px-6 rounded-lg w-full hover:bg-red-700 transition-colors focus:outline-none flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Смотреть фильм
                  </button>
                </Link>

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