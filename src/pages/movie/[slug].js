// src/pages/movie/[slug].js
import React, { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { IMAGE_BASE_URL, BACKDROP_BASE_URL } from '@/lib/api'; 
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCarousel from '@/components/MediaCarousel';
import TrailerModal from '@/components/TrailerModal';
import PlayerContainer from '@/components/PlayerContainer'; 
import { useWatchlist } from '@/lib/useWatchlist'; 

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
                  AND poster_path IS NOT NULL
                  AND kinopoisk_id IS NOT NULL
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
const FilmIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg> );

export default function MoviePage({ movie, kinopoisk_id, actors, recommendations }) {
  const { toggleItem, isInWatchlist } = useWatchlist();
  const isFavorite = isInWatchlist(movie.tmdb_id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalVideoHtml, setModalVideoHtml] = useState('');

  const handleShowTrailerModal = () => {
     if (movie.trailer_url) {
        let embedUrl = movie.trailer_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
        setModalVideoHtml(`<iframe class="w-full h-full" src="${embedUrl}?autoplay=1" frameborder="0" allowfullscreen></iframe>`);
        setIsModalOpen(true);
     }
  };

  const title = movie.title_ru;
  const releaseYear = movie.release_year || 'N/A';
  const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image';
  const backdropPath = movie.backdrop_path ? `${BACKDROP_BASE_URL}${movie.backdrop_path}` : 'https://placehold.co/1280x720/10141A/6b7280?text=KinoNest';
  
  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Head><title>{title} | смотреть онлайн</title></Head>
      <Header />
      <TrailerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} videoHtml={modalVideoHtml} />

      <div className="flex-grow">
        {kinopoisk_id && (
          <section className="bg-[#10141A] pt-24 pb-6"> 
             <PlayerContainer kinopoisk_id={kinopoisk_id} imdb_id={movie.imdb_id} tmdb_id={movie.tmdb_id} title={title} trailer_url={movie.trailer_url} type="movie" />
          </section>
        )}

        <section className="relative h-[60vh] md:h-[70vh] min-h-[400px] w-full">
          <Image src={backdropPath} alt={title} fill style={{ objectFit: 'cover' }} priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10141A] via-[#10141A]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#10141A] via-[#10141A]/20 to-transparent"></div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-12">
            <div className="w-full md:w-2/3 lg:w-1/2">
              <h1 className="text-4xl md:text-5xl font-black text-white">{title}</h1>
              <div className="flex items-center space-x-4 mt-3 text-gray-300 text-sm">
                <span>{releaseYear}</span>
                <div className="flex items-center"><StarIcon /><span className="ml-1 font-bold">{movie.rating_tmdb}</span></div>
                {movie.runtime && <span>{movie.runtime} мин.</span>}
                {movie.age_restriction && <span className="border border-gray-400 px-1 rounded text-xs">{movie.age_restriction}+</span>}
              </div>
              
              {/* 💡 შესწორება: აღწერა ახლა სრულად ჩანს (line-clamp-3 წაშლილია) */}
              <p className="max-w-2xl text-sm md:text-base text-gray-200 mt-4 leading-relaxed drop-shadow-md">
                {movie.overview}
              </p>
              
              <div className="flex items-center space-x-3 mt-5">
                <button onClick={handleShowTrailerModal} className="bg-brand-red text-white font-bold py-2.5 px-6 rounded-lg hover:bg-red-700 transition flex items-center gap-2"><PlayIcon /> Трейлер</button>
                <button onClick={() => toggleItem(movie.tmdb_id)} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition border-2 ${isFavorite ? 'bg-white/10 border-brand-red text-brand-red' : 'border-gray-500 text-gray-300 hover:text-white'}`}><HeartIcon isFilled={isFavorite} /> {isFavorite ? 'В избранном' : 'В избранное'}</button>
                
                <Link href="/movies" className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition border-2 border-gray-500 text-gray-300 hover:text-white hover:border-white hover:bg-white/5 cursor-pointer">
                    <FilmIcon />
                    ФИЛЬМ
                </Link>
              </div>

            </div>
          </div>
        </section>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            <div className="lg:col-span-8 flex flex-col h-full">
              <div className="w-full mb-6">
                 <MediaCarousel title="В ролях" items={actors} swiperKey="movie-actors" cardType="actor" />
              </div>
              <div className="bg-[#151a21] border border-gray-800 rounded-xl p-6 shadow-lg flex-grow flex flex-col justify-center">
                <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-800 pb-3">Детали</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4 text-sm">
                  {movie.rating_imdb > 0 && (<div><span className="text-gray-500 block mb-1">Рейтинг IMDb</span><span className="text-white font-bold text-lg">{movie.rating_imdb}</span></div>)}
                  {movie.rating_kp > 0 && (<div><span className="text-gray-500 block mb-1">Рейтинг КП</span><span className="text-white font-bold text-lg">{movie.rating_kp}</span></div>)}
                  {movie.budget > 0 && (<div><span className="text-gray-500 block mb-1">Бюджет</span><span className="text-white font-medium">${Number(movie.budget).toLocaleString('en-US')}</span></div>)}
                  {movie.countries && (<div><span className="text-gray-500 block mb-1">Страна</span><span className="text-white font-medium">{movie.countries.join(', ')}</span></div>)}
                  {movie.premiere_world && (<div><span className="text-gray-500 block mb-1">Премьера</span><span className="text-white font-medium">{movie.premiere_world}</span></div>)}
                  
                  <div className="col-span-2 sm:col-span-3 pt-2">
                    <span className="text-gray-500 block mb-2">Жанры</span>
                    <div className="flex flex-wrap gap-2">
                      {(movie.genres_names || []).map((g, i) => (
                        <Link 
                          key={i} 
                          href={`/discover?genre=${g.toLowerCase()}`}
                          className="px-3 py-1 bg-gray-800 text-gray-300 rounded-md border border-gray-700 hover:bg-brand-red hover:text-white hover:border-brand-red transition-colors"
                        >
                          {g}
                        </Link>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-4 h-full">
              <div className="sticky top-24 mt-12">
                <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-gray-800/50 w-full aspect-[2/3]">
                    <Image src={posterPath} alt={title} fill className="object-cover object-top" priority />
                </div>
              </div>
            </div>

          </div>
          
          {recommendations?.length > 0 && (
            <div className="mt-12 border-t border-gray-800 pt-8">
               <MediaCarousel title="Рекомендации" items={recommendations} swiperKey="movie-recommendations" cardType="movie" />
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}