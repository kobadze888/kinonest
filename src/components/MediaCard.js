// src/components/MediaCard.js-ის განახლებული შიგთავსი
import React from 'react';
import Link from 'next/link';
import { IMAGE_BASE_URL } from '../lib/api';
import { slugify } from '../lib/utils'; // დავაიმპორტეთ ჩვენი ახალი ფუნქცია

export default function MediaCard({ item, type = 'movie' }) {
  const title = type === 'movie' ? item.title : item.name;
  const releaseDate = (type === 'movie' ? item.release_date : item.first_air_date) || 'N/A';
  const year = releaseDate.split('-')[0];
  const posterPath = item.poster_path 
    ? `${IMAGE_BASE_URL}${item.poster_path}` 
    : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image';

  // --- SEO URL-ის გენერაცია ---
  // ვქმნით slug-ს (მაგ: "frankenshteyn")
  const titleSlug = slugify(title); 
  // ვაერთიანებთ ID-ს და slug-ს (მაგ: "/movie/12345-frankenshteyn")
  // ეს არის საუკეთესო პრაქტიკა: ID გვჭირდება მონაცემების მოსაძებნად, slug კი SEO-სთვის.
  const linkHref = `/${type}/${item.id}-${titleSlug}`;
  // --- დასასრული ---

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
          <p className="text-sm text-gray-400">{year} • ⭐️ {item.vote_average.toFixed(1)}</p>
        </div>
      </div>
    </Link>
  );
};