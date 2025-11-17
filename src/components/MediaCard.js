// src/components/MediaCard.js-ის განახლებული შიგთავსი
import React from 'react';
import Link from 'next/link';
// 💡 Убираем 'IMAGE_BASE_URL', т.к. мы будем использовать полный путь из нашей базы
// import { IMAGE_BASE_URL } from '../lib/api'; 
import { slugify } from '../lib/utils';

export default function MediaCard({ item, type = 'movie' }) {
  // 💡 'title' приходит из 'title_ru'
  const title = item.title_ru; 
  // 💡 'year' приходит из 'release_year'
  const year = item.release_year || 'N/A'; 
  
  // ВРЕМЕННОЕ РЕШЕНИЕ для постера (пока не обновим скрипт):
  const posterPath = item.poster_path 
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
    : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image';

  const titleSlug = slugify(title);
  const seoSuffix = 'smotret-onlain-besplatno';
  
  // 💡 'item.id' теперь 'item.tmdb_id'
  const linkHref = `/${type}/${item.tmdb_id}-${titleSlug}-${seoSuffix}`;

  return (
    <Link href={linkHref} className="block w-full">
      <div
        className="media-card rounded-lg overflow-hidden shadow-xl bg-gray-800 transition-shadow duration-300 hover:shadow-brand-red/30 cursor-pointer"
      >
        <div className="aspect-2-3">
          <img src={posterPath} alt={title} className="w-full h-full object-cover"/>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-white truncate">{title}</h3>
          
          {/* 💡 --- ВОТ ИСПРАВЛЕНИЕ --- 💡 */}
          <p className="text-sm text-gray-400">
            {year} • ⭐️ {item.rating_tmdb ? item.rating_tmdb : 'N/A'}
          </p>
          
        </div>
      </div>
    </Link>
  );
};