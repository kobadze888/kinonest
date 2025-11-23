// src/pages/movie/[slug].js
import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { fetchData, IMAGE_BASE_URL, BACKDROP_BASE_URL } from '@/lib/api'; 
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCarousel from '@/components/MediaCarousel';
import TrailerModal from '@/components/TrailerModal';
import PlayerContainer from '@/components/PlayerContainer'; // 💡 იმპორტი
import { useWatchlist } from '@/lib/useWatchlist'; 
import { slugify } from '@/lib/utils';

export async function getServerSideProps(context) {
  const { slug } = context.params;
  const tmdbId = slug.split('-')[0];
  if (!tmdbId) return { notFound: true };

  let movie = null;
  let kinopoisk_id = null;
  let actors = [];
  let recommendations = [];
  
  try {
    const columns = `
      tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
      poster_path, backdrop_path, release_year, rating_tmdb,
      genres_ids, genres_names,
      to_char(created_at, 'YYYY-MM-DD') as created_at, 
      to_char(updated_at, 'YYYY-MM-DD') as updated_at,
      trailer_url, runtime, budget, countries, rating_kp, rating_imdb,
      kinobd_item_id, imdb_id, rating_kp_count, rating_imdb_count,
      age_restriction, slogan, 
      to_char(premiere_ru, 'YYYY-MM-DD') as premiere_ru, 
      to_char(premiere_world, 'YYYY-MM-DD') as premiere_world, 
      popularity
    `;
    
    const movieRes = await query(`SELECT ${columns} FROM media WHERE tmdb_id = $1`, [tmdbId]);
    
    if (movieRes.rows.length > 0) {
      movie = movieRes.rows[0];
      kinopoisk_id = movie.kinopoisk_id;
      
      // მსახიობები
      try {
        const actorsRes = await query(`
          SELECT a.id, a.name, a.profile_path, ma.character
          FROM actors a
          JOIN media_actors ma ON a.id = ma.actor_id
          WHERE ma.media_id = $1
          ORDER BY ma."order" ASC
          LIMIT 20
        `, [tmdbId]);
        actors = actorsRes.rows;
      } catch (err) { }

      // რეკომენდაციები
      if (movie.genres_names && movie.genres_names.length > 0) {
        try {
            const isAnimation = movie.genres_names.includes('мультфильм') || movie.genres_names.includes('Animation');
            let genreFilter = isAnimation ? "AND 'мультфильм' = ANY(genres_names)" : "AND NOT ('мультфильм' = ANY(genres_names))";

            const recRes = await query(`
                SELECT tmdb_id, title_ru, poster_path, rating_tmdb, release_year, type
                FROM media
                WHERE type = 'movie'
                  AND tmdb_id != $1
                  AND title_ru ~ '[а-яА-ЯёЁ]'
                  ${genreFilter}
                  AND genres_names && $2::text[]
                ORDER BY rating_tmdb DESC, popularity DESC
                LIMIT 15
            `, [tmdbId, movie.genres_names]);
            recommendations = recRes.rows;
        } catch (err) { }
      }
    }
  } catch (e) { }

  if (!movie) return { notFound: true };

  return {
    props: {
      movie: JSON.parse(JSON.stringify(movie)),
      kinopoisk_id, 
      actors,
      recommendations
    },
  };
}

const PlayIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2 -mt-1" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /> </svg> );
const StarIcon = () => ( <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"> <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.168c.969 0 1.371 1.24.588 1.81l-3.373 2.449a1 1 0 00-.364 1.118l1.287 3.959c.3.921-.755 1.688-1.54 1.118l-3.373-2.449a1 1 0 00-1.175 0l-3.373 2.449c-.784.57-1.839-.197-1.54-1.118l1.287-3.959a1 1 0 00-.364-1.118L2.053 9.386c-.783-.57-.38-1.81.588-1.81h4.168a1 1 0 00.95-.69L9.049 2.927z"></path> </svg> );
const HeartIcon = ({ isFilled }) => ( <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill={isFilled ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /> </svg> );

export default function MoviePage({ movie, kinopoisk_id, actors, recommendations }) {
  
  const { toggleItem, isInWatchlist } = useWatchlist();
  const isFavorite = isInWatchlist(movie.tmdb_id);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalVideoHtml, setModalVideoHtml] = useState('');

  const handleShowTrailerModal = () => {
     if (movie.trailer_url) {
        let embedUrl = movie.trailer_url;
        if (embedUrl.includes('watch?v=')) embedUrl = embedUrl.replace('watch?v=', 'embed/');
        else if (embedUrl.includes('youtu.be/')) embedUrl = embedUrl.replace('youtu.be/', 'youtube.com/embed/');
        
        setModalVideoHtml(`<iframe class="w-full h-full" src="${embedUrl}?autoplay=1" frameborder="0" allowfullscreen></iframe>`);
        setIsModalOpen(true);
     }
  };

  const title = movie.title_ru;
  const originalTitle = movie.title_en;
  const releaseYear = movie.release_year || 'N/A';
  const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image';
  const backdropPath = movie.backdrop_path ? `${BACKDROP_BASE_URL}${movie.backdrop_path}` : 'https://placehold.co/1280x720/10141A/6b7280?text=KinoNest';
  const genreKeywords = (movie.genres_names || []).join(', ');
  const pageTitle = `${title} (${releaseYear}, фильм) | ${originalTitle} | смотреть онлайн бесплатно - KinoNest`;
  const keywords = [ title, originalTitle, `${title} смотреть онлайн`, `${title} смотреть онлайн бесплатно`, `${title} ${releaseYear}`, `фильм ${title}`, "смотреть фильм онлайн", genreKeywords ].filter(Boolean).join(', ');

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={movie.overview} />
        <meta name="keywords" content={keywords} />
      </Head>
      
      <Header />
      <TrailerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} videoHtml={modalVideoHtml} />

      <div className="flex-grow">
        
        {/* 💡 1. Player Container */}
        {kinopoisk_id && (
          <section className="bg-[#10141A] pt-24 pb-6"> 
             <PlayerContainer 
                kinopoisk_id={kinopoisk_id} 
                imdb_id={movie.imdb_id}
                tmdb_id={movie.tmdb_id}
                title={title}
                trailer_url={movie.trailer_url}
                type="movie"
             />
          </section>
        )}

        <section className="relative h-[60vh] md:h-[80vh] min-h-[500px] w-full">
          <Image src={backdropPath} alt={title} fill style={{ objectFit: 'cover' }} priority={true} sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10141A] via-[#10141A]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#10141A] via-[#10141A]/20 to-transparent"></div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-16">
            <div className="w-full md:w-2/3 lg:w-1/2">
              <h1 className="text-4xl md:text-6xl font-black text-white">{title}</h1>
              <div className="flex items-center space-x-4 mt-4 text-gray-300">
                <span>{releaseYear}</span>
                <span>•</span>
                <div className="flex items-center">
                  <StarIcon />
                  <span className="ml-1 font-semibold">{movie.rating_tmdb ? movie.rating_tmdb : 'N/A'}</span>
                </div>
                {movie.runtime && ( <> <span>•</span> <span>{movie.runtime} мин.</span> </> )}
                {movie.age_restriction && ( <> <span>•</span> <span className="border border-gray-400 px-1.5 rounded text-xs">{movie.age_restriction}+</span> </> )}
              </div>
              {movie.slogan && (<p className="max-w-xl text-md text-gray-400 italic mt-2">«{movie.slogan}»</p>)}
              <p className="max-w-xl text-md text-gray-200 mt-4 line-clamp-3">{movie.overview}</p>
              
              <div className="flex items-center space-x-4 mt-6">
                <button onClick={handleShowTrailerModal} className="trailer-button bg-brand-red text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors focus:outline-none flex items-center gap-2">
                  <PlayIcon /> Трейлер
                </button>
                <button onClick={() => toggleItem(movie.tmdb_id)} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all border-2 ${isFavorite ? 'bg-white/10 border-brand-red text-brand-red hover:bg-brand-red hover:text-white' : 'bg-transparent border-gray-500 text-gray-300 hover:border-white hover:text-white'}`}>
                  <HeartIcon isFilled={isFavorite} />
                  {isFavorite ? 'В избранном' : 'В избранное'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <MediaCarousel title="В ролях" items={actors} swiperKey="movie-actors" cardType="actor" />
              
              <div className="mt-8 p-4 bg-gray-900/50 rounded-lg">
                <h3 className="text-2xl font-bold text-white mb-4">Детали</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-gray-300">
                  {movie.rating_imdb > 0 && ( <div><span className="font-semibold text-gray-500 block">Рейтинг IMDb:</span>{movie.rating_imdb}</div> )}
                  {movie.rating_kp > 0 && ( <div><span className="font-semibold text-gray-500 block">Рейтинг КП:</span>{movie.rating_kp}</div> )}
                  {movie.budget > 0 && ( <div><span className="font-semibold text-gray-500 block">Бюджет:</span>${Number(movie.budget).toLocaleString('en-US')}</div> )}
                  {movie.countries && movie.countries.length > 0 && ( <div><span className="font-semibold text-gray-500 block">Страна:</span>{movie.countries.join(', ')}</div> )}
                  {movie.premiere_world && ( <div><span className="font-semibold text-gray-500 block">Премьера в мире:</span>{movie.premiere_world}</div> )}
                  <div className="col-span-2 md:col-span-3">
                    <span className="font-semibold text-gray-500 block">Жанры:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(movie.genres_names || []).map((genreName, index) => ( <span key={index} className="py-1 px-3 bg-gray-800 text-gray-300 rounded-full text-sm">{genreName}</span> ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <Image src={posterPath} alt={title} width={500} height={750} className="w-full h-auto rounded-lg shadow-xl" />
            </div>
          </div>
          
          {recommendations && recommendations.length > 0 && (
            <MediaCarousel title="Рекомендации" items={recommendations} swiperKey="movie-recommendations" cardType="movie" />
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}