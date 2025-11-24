// src/components/MediaCard.js
import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; 
import { slugify } from '../lib/utils';
import { useWatchlist } from '@/lib/useWatchlist'; 

const PlayIcon = () => (
  <svg className="w-12 h-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
  </svg>
);

const ImdbBadge = ({ rating }) => (
  <div className="bg-[#F5C518] text-black px-1.5 py-0.5 rounded flex items-center gap-1 font-bold text-xs shadow-md border border-yellow-500">
    <span className="font-black tracking-tighter">IMDb</span>
    <span>{rating}</span>
  </div>
);

const HeartIcon = ({ isFilled }) => (
    <svg className={`w-6 h-6 transition-colors duration-200`} xmlns="http://www.w3.org/2000/svg" 
         viewBox="0 0 24 24" fill={isFilled ? "#e50914" : "rgba(0,0,0,0.5)"} stroke={isFilled ? "none" : "white"} strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
);

export default function MediaCard({ item }) {
  if (!item) return null; 

  const { toggleItem, isInWatchlist } = useWatchlist(); 
  
  const title = item.title_ru || item.title_en; 
  const year = item.release_year || 'N/A';
  const type = item.type === 'movie' ? 'Фильм' : 'Сериал';
  
  const showRating = item.rating_imdb > 0 ? item.rating_imdb : null;
  
  const posterPath = item.poster_path 
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
    : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image';

  const titleSlug = slugify(title);
  const seoSuffix = 'smotret-onlain-besplatno';
  const linkHref = `/${item.type}/${item.tmdb_id}-${titleSlug}-${seoSuffix}`;

  const isFavorite = isInWatchlist(item.tmdb_id);

  return (
    <div className="block w-full group relative"> 
      {/* 💡 FIX: დაემატა style={{ willChange: 'transform' ... }} ციმციმის მოსაგვარებლად */}
      <div 
        className="media-card rounded-lg overflow-hidden shadow-xl bg-gray-800 transition-all duration-300 ease-out hover:shadow-brand-red/10 hover:-translate-y-1"
        style={{ 
            willChange: 'transform', 
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d'
        }}
      >
        
        {/* 💡 CLS/Aspect Ratio Fix: min-height fallback და aspect-ratio თანამედროვე CSS */}
        <div className="relative w-full bg-gray-800" style={{ aspectRatio: '2 / 3', minHeight: '250px' }}>
          <Link href={linkHref} className="block absolute inset-0 z-10">
             <Image 
                src={posterPath} 
                alt={title} 
                width={500}     
                height={750}    
                style={{ objectFit: 'cover' }} 
                className="w-full h-full transition-opacity duration-300"
                sizes="(max-width: 768px) 30vw, (max-width: 1200px) 20vw, 15vw"
                priority={false}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                <PlayIcon />
              </div>
          </Link>
          
          {showRating && (
            <div className="absolute top-2 left-2 z-20 pointer-events-none">
              <ImdbBadge rating={showRating} />
            </div>
          )}
          
          <div className="absolute top-2 right-2 z-20 pointer-events-none">
            <div className="bg-brand-red rounded-md px-2 py-1 text-xs font-bold text-white shadow-md uppercase tracking-wider">
              {type}
            </div>
          </div>
          
          <div className="absolute bottom-2 left-2 z-20 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-bold text-white border border-white/10">
              {year}
            </div>
          </div>

          <button 
            onClick={(e) => { 
               e.preventDefault(); 
               e.stopPropagation(); 
               toggleItem(item.tmdb_id); 
            }} 
            className="absolute bottom-2 right-2 z-30 p-2 rounded-full hover:scale-110 transition-transform active:scale-95 focus:outline-none"
            title={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
          >
            <div className="bg-black/60 backdrop-blur-sm rounded-full p-1.5 flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10">
               <HeartIcon isFilled={isFavorite} />
            </div>
          </button>

        </div>
        
        <Link href={linkHref} className="block p-3 bg-gray-800 relative z-20">
          <h3 className="font-semibold text-white truncate hover:text-brand-red transition-colors text-sm md:text-base">{title}</h3>
        </Link>

      </div>
    </div>
  );
};