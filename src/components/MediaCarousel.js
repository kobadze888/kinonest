import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import Link from 'next/link'; // 💡 Link იმპორტი
import MediaCard from './MediaCard';
import ActorCard from './ActorCard';
import MediaCardSkeleton from './MediaCardSkeleton'; 

export default function MediaCarousel({ title, items, cardType, swiperKey, onShowTrailer, isLoading, link }) {
  if (!isLoading && (!items || items.length === 0)) {
    return null;
  }
  
  const CardComponent = cardType === 'actor' ? ActorCard : MediaCard;
  const slideWidthClass = cardType === 'actor' ? '!w-36 md:!w-44' : '!w-44 md:!w-52';
  const showSkeletons = isLoading;
  const skeletonItems = Array.from({ length: 10 });

  return (
    <section className="my-10">
      {/* 💡 სათაური ხდება ლინკი, თუ 'link' prop გადაცემულია */}
      <div className="flex items-center justify-between mb-4 ml-2 mr-2">
        {title && (
            link ? (
                <Link href={link} className="group flex items-center gap-2 cursor-pointer">
                    <h2 className="text-2xl font-bold text-white group-hover:text-brand-red transition-colors">
                        {title}
                    </h2>
                    {/* პატარა ისარი */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400 group-hover:text-brand-red group-hover:translate-x-1 transition-all">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                </Link>
            ) : (
                <h2 className="text-2xl font-bold text-white">{title}</h2>
            )
        )}
      </div>

      <div className={`swiper sub-swiper ${swiperKey}-swiper`}>
        <Swiper
          modules={[Navigation]}
          slidesPerView="auto" 
          spaceBetween={16}
          navigation={{
            nextEl: `.swiper-button-next-${swiperKey}`,
            prevEl: `.swiper-button-prev-${swiperKey}`,
          }}
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
                <SwiperSlide key={item.id || item.tmdb_id} className={`${slideWidthClass} transition-all duration-300`}>
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
        
        <div className={`swiper-button-next swiper-button-next-${swiperKey}`}></div>
        <div className={`swiper-button-prev swiper-button-prev-${swiperKey}`}></div>
      </div>
    </section>
  );
};