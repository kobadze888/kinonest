// --- ОБНОВЛЕННЫЙ ФАЙЛ ---
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules'; // <-- ИЗМЕНЕНИЕ ЗДЕСЬ
import MediaCard from './MediaCard';
import ActorCard from './ActorCard'; // <-- Импортируем ActorCard

export default function MediaCarousel({ title, items, cardType, swiperKey, onShowTrailer }) {
  if (!items || items.length === 0) {
    return null;
  }
  
  // Теперь мы выбираем, какую карточку показать, в зависимости от cardType
  const CardComponent = cardType === 'actor' ? ActorCard : MediaCard;
  // Определяем ширину слайда
  const slideWidthClass = cardType === 'actor' ? '!w-36 md:!w-44' : '!w-44 md:!w-52';

  return (
    <section className="my-10">
      <h2 className="text-2xl font-bold text-white mb-4 ml-2">{title}</h2>
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
          {items.map(item => (
            <SwiperSlide key={item.id} className={slideWidthClass}> {/* Устанавливаем ширину */}
              
              {/* Рендерим нужный компонент */}
              {cardType === 'actor' ? (
                <ActorCard actor={item} />
              ) : (
                <MediaCard 
                  item={item} 
                  type={cardType} // "movie" or "tv"
                  onShowTrailer={onShowTrailer} 
                />
              )}

            </SwiperSlide>
          ))}
        </Swiper>
        
        <div className={`swiper-button-next swiper-button-next-${swiperKey}`}></div>
        <div className={`swiper-button-prev swiper-button-prev-${swiperKey}`}></div>
      </div>
    </section>
  );
};