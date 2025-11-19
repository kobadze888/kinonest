// src/components/MediaCard.js (ფიქსი: გულის პოზიცია ქვემოთ-მარჯვნივ)
import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; 
import { slugify } from '../lib/utils';
import { useWatchlist } from '@/lib/useWatchlist'; 

// --- Icons ---
const PlayIcon = () => (
  <svg className="w-12 h-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
  </svg>
);
const StarIcon = () => (
  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.168c.969 0 1.371 1.24.588 1.81l-3.373 2.449a1 1 0 00-.364 1.118l1.287 3.959c.3.921-.755 1.688-1.54 1.118l-3.373-2.449a1 1 0 00-1.175 0l-3.373 2.449c-.784.57-1.839-.197-1.54-1.118l1.287-3.959a1 1 0 00-.364-1.118L2.053 9.386c-.783-.57-.38-1.81.588-1.81h4.168a1 1 0 00.95-.69L9.049 2.927z"></path>
  </svg>
);

const HeartIcon = ({ isFilled }) => (
    <svg className={`w-6 h-6 transition-colors duration-200`} xmlns="http://www.w3.org/2000/svg" 
         viewBox="0 0 24 24" fill={isFilled ? "#e50914" : "rgba(0,0,0,0.5)"} stroke={isFilled ? "none" : "white"} strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
);
// --- End Icons ---

export default function MediaCard({ item }) {
  const { toggleItem, isInWatchlist } = useWatchlist(); 
  
  const title = item.title_ru; 
  const year = item.release_year || 'N/A';
  const type = item.type === 'movie' ? 'Фильм' : 'Сериал';
  
  const posterPath = item.poster_path 
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
    : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image';

  const titleSlug = slugify(title);
  const seoSuffix = 'smotret-onlain-besplatno';
  const linkHref = `/${item.type}/${item.tmdb_id}-${titleSlug}-${seoSuffix}`;

  const isFavorite = isInWatchlist(item.tmdb_id);

  return (
    <div className="block w-full group relative"> {/* relative აქ გვჭირდება */}
      <div className="media-card rounded-lg overflow-hidden shadow-xl bg-gray-800 transition-all duration-300 transform-gpu hover:shadow-brand-red/30 hover:-translate-y-1">
        
        <div className="aspect-2-3 relative">
          
          {/* მთავარი ლინკი (სურათზე დაჭერა) */}
          <Link href={linkHref} className="block absolute inset-0 z-10">
             <Image 
                src={posterPath} 
                alt={title} 
                fill 
                style={{ objectFit: 'cover' }} 
                sizes="(max-width: 768px) 30vw, (max-width: 1200px) 20vw, 15vw"
                priority={true} 
              />
              {/* Play Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <PlayIcon />
              </div>
          </Link>
          
          {/* --- ბეიჯები --- */}
          
          {/* 1. Rating (ზევით მარცხნივ) */}
          <div className="absolute top-2 left-2 z-20 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-semibold text-white flex items-center gap-1">
              <StarIcon />
              <span>{item.rating_tmdb ? item.rating_tmdb : 'N/A'}</span>
            </div>
          </div>
          
          {/* 2. Type (ზევით მარჯვნივ) */}
          <div className="absolute top-2 right-2 z-20 pointer-events-none">
            <div className="bg-brand-red rounded-md px-2 py-1 text-xs font-bold text-white shadow-md">
              {type}
            </div>
          </div>
          
          {/* 3. Year (ქვემოთ მარცხნივ) */}
          <div className="absolute bottom-2 left-2 z-20 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-bold text-white">
              {year}
            </div>
          </div>

          {/* 4. HEART BUTTON (ქვემოთ მარჯვნივ - შესწორებული პოზიცია) */}
          <button 
            onClick={(e) => { 
               e.preventDefault(); // არ გადავიდეს ლინკზე
               e.stopPropagation(); 
               toggleItem(item.tmdb_id); 
            }} 
            className="absolute bottom-2 right-2 z-30 p-2 rounded-full hover:scale-110 transition-transform active:scale-95 focus:outline-none"
            title={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
          >
            {/* დავამატეთ თეთრი ფონი რომ უკეთ გამოჩნდეს */}
            <div className="bg-black/60 backdrop-blur-sm rounded-full p-1.5 flex items-center justify-center hover:bg-white/20 transition-colors">
               <HeartIcon isFilled={isFavorite} />
            </div>
          </button>

        </div>
        
        {/* სათაური - ესეც ლინკია */}
        <Link href={linkHref} className="block p-3">
          <h3 className="font-semibold text-white truncate hover:text-brand-red transition-colors">{title}</h3>
        </Link>

      </div>
    </div>
  );
};