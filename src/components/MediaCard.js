import React from 'react';
import { IMAGE_BASE_URL } from '../lib/api';

export default function MediaCard({ item, type = 'movie', onShowTrailer }) {
  const title = type === 'movie' ? item.title : item.name;
  const releaseDate = (type === 'movie' ? item.release_date : item.first_air_date) || 'N/A';
  const year = releaseDate.split('-')[0];
  const posterPath = item.poster_path 
    ? `${IMAGE_BASE_URL}${item.poster_path}` 
    : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image'; // გაუმჯობესებული placeholder

  return (
    <div 
      onClick={() => onShowTrailer(item.id, type)}
      className="media-card w-full rounded-lg overflow-hidden shadow-xl bg-gray-800 transform transition-transform duration-300 hover:scale-105 hover:shadow-brand-red/30 cursor-pointer"
    >
      <div className="aspect-2-3">
        <img src={posterPath} alt={title} className="w-full h-full object-cover"/>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-white truncate">{title}</h3>
        <p className="text-sm text-gray-400">{year} • ⭐️ {item.vote_average.toFixed(1)}</p>
      </div>
    </div>
  );
};