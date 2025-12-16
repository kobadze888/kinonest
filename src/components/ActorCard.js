import React from 'react';
import Link from 'next/link';
import { IMAGE_BASE_URL } from '../lib/api';
import { slugify } from '../lib/utils';

export default function ActorCard({ actor }) {
  const profilePath = actor.profile_path 
    ? `${IMAGE_BASE_URL}${actor.profile_path}` 
    : 'https://placehold.co/500x500/1f2937/6b7280?text=No+Photo';
    
  const actorSlug = slugify(actor.name);
  const linkHref = `/actor/${actor.id}-${actorSlug}`;

  return (
    // ✅ შესწორება: დაემატა prefetch={false}
    <Link 
      href={linkHref} 
      prefetch={false}
      className="group flex flex-col items-center text-center cursor-pointer w-full"
    >
      <div className="relative w-32 h-32 md:w-40 md:h-40 mb-3 mx-auto">
        <div className="w-full h-full rounded-full overflow-hidden border-4 border-gray-800 group-hover:border-brand-red transition-all duration-300 shadow-lg relative z-10">
          <img 
            src={profilePath} 
            alt={actor.name} 
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </div>

      <h3 className="text-sm md:text-base font-semibold text-gray-300 group-hover:text-white transition-colors line-clamp-2 leading-tight px-1">
        {actor.name}
      </h3>
    </Link>
  );
};