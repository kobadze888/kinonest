import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; 
import { IMAGE_BASE_URL } from '../lib/api';
import { slugify } from '../lib/utils';

export default function ActorCard({ actor }) {
  // ვიყენებთ w200-ს, რომ მსუბუქი იყოს
  const profilePath = actor.profile_path 
    ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` 
    : 'https://placehold.co/200x200/1f2937/6b7280?text=No+Photo';
    
  const actorSlug = slugify(actor.name);
  const linkHref = `/actor/${actor.id}-${actorSlug}`;

  return (
    <Link 
      href={linkHref} 
      className="group flex flex-col items-center text-center cursor-pointer w-full"
    >
      <div className="relative w-32 h-32 md:w-40 md:h-40 mb-3 mx-auto">
        <div className="w-full h-full rounded-full overflow-hidden border-4 border-gray-800 group-hover:border-brand-red transition-all duration-300 shadow-lg relative z-10">
          <Image 
            src={profilePath} 
            alt={actor.name} 
            fill
            style={{ objectFit: 'cover' }}
            className="transform group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            // ⚠️ სწრაფი ჩატვირთვისთვის:
            unoptimized={true}
          />
        </div>
      </div>

      <h3 className="text-sm md:text-base font-semibold text-gray-300 group-hover:text-white transition-colors line-clamp-2 leading-tight px-1">
        {actor.name}
      </h3>
    </Link>
  );
};