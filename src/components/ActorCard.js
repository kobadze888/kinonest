// --- НОВЫЙ ФАЙЛ ---
import React from 'react';
import Link from 'next/link';
import { IMAGE_BASE_URL } from '../lib/api';

export default function ActorCard({ actor }) {
  const profilePath = actor.profile_path 
    ? `${IMAGE_BASE_URL}${actor.profile_path}` 
    : 'https://placehold.co/500x500/1f2937/6b7280?text=No+Photo';

  return (
    // TODO: Сделаем ссылку на /actor/[id] в будущем
    // <Link href={`/actor/${actor.id}`} legacyBehavior>
      <a className="block w-36 md:w-44 text-center cursor-pointer transform transition-transform duration-300 hover:scale-105">
        <div className="aspect-square relative"> {/* aspect-square для 1:1 */}
          <img 
            src={profilePath} 
            alt={actor.name} 
            className="w-full h-full object-cover rounded-full border-4 border-gray-800 hover:border-brand-red transition-colors"
          />
        </div>
        <h3 className="font-semibold text-white mt-3 truncate">{actor.name}</h3>
      </a>
    // </Link>
  );
};