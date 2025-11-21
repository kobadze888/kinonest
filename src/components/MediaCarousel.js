// src/components/MediaCarousel.js (განახლებული სკელეტონებით)
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import MediaCard from './MediaCard';
import ActorCard from './ActorCard';
import MediaCardSkeleton from './MediaCardSkeleton'; // 💡 იმპორტი

export default function MediaCarousel({ title, items, cardType, swiperKey, onShowTrailer, isLoading }) {
  // თუ არ იტვირთება და არც აიტემებია, არაფერი ვაჩვენოთ
  if (!isLoading && (!items || items.length === 0)) {
    return null;
  }
  
  const CardComponent = cardType === 'actor' ? ActorCard : MediaCard;
  const slideWidthClass = cardType === 'actor' ? '!w-36 md:!w-44' : '!w-44 md:!w-52';

  // თუ იტვირთება, ვაჩვენებთ 10 სკელეტონს
  const showSkeletons = isLoading;
  const skeletonItems = Array.from({ length: 10 });

  return (
    <section className="my-10">
      {title && <h2 className="text-2xl font-bold text-white mb-4 ml-2">{title}</h2>}
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
                  {/* მსახიობებისთვის სხვა ზომის სკელეტონი შეიძლება დაგვჭირდეს, მაგრამ ჯერჯერობით ამას გამოვიყენებთ ან წრეს */}
                  {cardType === 'actor' ? (
                     <div className="w-full aspect-square bg-gray-800 rounded-full animate-pulse"></div>
                  ) : (
                     <MediaCardSkeleton />
                  )}
                </SwiperSlide>
              ))
            : items.map(item => (
                <SwiperSlide key={item.id || item.tmdb_id} className={`${slideWidthClass} transition-all duration-300 hover:z-20`}>
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