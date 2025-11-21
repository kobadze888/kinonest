// src/components/MediaCarousel.js
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import Link from 'next/link';
import MediaCard from './MediaCard';
import ActorCard from './ActorCard';
import MediaCardSkeleton from './MediaCardSkeleton'; 

// ლამაზი, წვრილი ისრები
const ArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ArrowRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export default function MediaCarousel({ title, items, cardType, swiperKey, onShowTrailer, isLoading, link }) {
  if (!isLoading && (!items || items.length === 0)) {
    return null;
  }
  
  // ზომები დარეგულირებულია, რომ ლამაზად ჩაჯდეს
  const slideWidthClass = cardType === 'actor' ? '!w-32 md:!w-40' : '!w-40 md:!w-48';
  const showSkeletons = isLoading;
  const skeletonItems = Array.from({ length: 10 });

  // უნიკალური კლასები ნავიგაციისთვის, რომ სხვა სლაიდერებს არ შეეხოს
  const prevClass = `js-prev-${swiperKey}`;
  const nextClass = `js-next-${swiperKey}`;

  return (
    <section className="my-12 w-full relative group/section">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex items-center justify-between mb-6 px-1"> {/* ოდნავი px-1 გასწორებისთვის */}
        
        {/* სათაური + წითელი აქცენტი */}
        <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-brand-red rounded-full shadow-[0_0_12px_rgba(229,9,20,0.6)]"></div>
            
            {title && (
                link ? (
                    <Link href={link} className="group flex items-center gap-2 cursor-pointer">
                        <h2 className="text-xl md:text-2xl font-bold text-white group-hover:text-brand-red transition-colors">
                            {title}
                        </h2>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-gray-500 group-hover:text-brand-red group-hover:translate-x-1 transition-all mt-0.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </Link>
                ) : (
                    <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
                )
            )}
        </div>

        {/* ნავიგაციის ღილაკები (Header-ში) */}
        <div className="flex items-center gap-2">
            <button className={`${prevClass} nav-btn-custom disabled:opacity-30 disabled:cursor-not-allowed`}>
                <ArrowLeft />
            </button>
            <button className={`${nextClass} nav-btn-custom disabled:opacity-30 disabled:cursor-not-allowed`}>
                <ArrowRight />
            </button>
        </div>
      </div>

      {/* --- CAROUSEL SECTION --- */}
      <div className="w-full">
        <Swiper
          modules={[Navigation]}
          slidesPerView="auto" 
          spaceBetween={16} // დაშორება კარტებს შორის
          navigation={{
            nextEl: `.${nextClass}`,
            prevEl: `.${prevClass}`,
          }}
          // overflow-visible გვჭირდება რომ ჩრდილები არ მოიჭრას, მაგრამ _app.js-ში body-ზე overflow-x: hidden გვაქვს, ამიტომ უსაფრთხოა.
          className="!overflow-visible !pb-4" 
        >
          {showSkeletons 
            ? skeletonItems.map((_, index) => (
                <SwiperSlide key={`skeleton-${index}`} className={`${slideWidthClass}`}>
                  {cardType === 'actor' ? (
                     <div className="w-full aspect-square bg-gray-800 rounded-full animate-pulse"></div>
                  ) : (
                     <MediaCardSkeleton />
                  )}
                </SwiperSlide>
              ))
            : items.map(item => (
                <SwiperSlide key={item.id || item.tmdb_id} className={`${slideWidthClass} group/slide transition-transform duration-300`}>
                  {cardType === 'actor' ? (
                    <ActorCard actor={item} />
                  ) : (
                    <MediaCard 
                      item={item} 
                      type={cardType} 
                      onShowTrailer={onShowTrailer} 
                    />
                  )}
                </SwiperSlide>
              ))
          }
        </Swiper>
      </div>
    </section>
  );
};