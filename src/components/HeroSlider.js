import React from 'react';
// ვიყენებთ Swiper-ის React კომპონენტებს
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules'; // <-- ИЗМЕНЕНИЕ ЗДЕСЬ
import { BACKDROP_BASE_URL } from '../lib/api';

export default function HeroSlider({ movies, onShowTrailer }) {
  if (!movies || movies.length === 0) {
    return <div className="hero-slider"></div>; // ცარიელი ადგილი, სანამ ჩაიტვირთება
  }

  return (
    <section className="hero-slider">
      <Swiper
        // ვიყენებთ Swiper-ის მოდულებს
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
        {movies.map(movie => (
          <SwiperSlide className="relative" key={movie.id}>
            <img src={`${BACKDROP_BASE_URL}${movie.backdrop_path}`} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="slider-gradient absolute inset-0"></div>
            <div className="relative z-10 flex flex-col justify-end h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-32">
              <h2 className="text-3xl md:text-5xl font-black text-white shadow-lg">{movie.title}</h2>
              <p className="max-w-xl text-md md:text-lg text-gray-200 mt-4 line-clamp-3">{movie.overview}</p>
              <button 
                onClick={() => onShowTrailer(movie.id, 'movie')}
                className="trailer-button mt-6 bg-brand-red text-white font-bold py-3 px-6 rounded-lg w-auto max-w-xs hover:bg-red-700 transition-colors focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2 -mt-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Смотреть фильм
              </button>
            </div>
          </SwiperSlide>
        ))}
        
        {/* Swiper-ის ნავიგაციის ელემენტები */}
        <div className="swiper-pagination"></div>
        <div className="swiper-button-next hero-nav-next"></div>
        <div className="swiper-button-prev hero-nav-prev"></div>
      </Swiper>
    </section>
  );
};