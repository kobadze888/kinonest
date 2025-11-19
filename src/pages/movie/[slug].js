// src/pages/movie/[slug].js
import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';

import { fetchData, IMAGE_BASE_URL, BACKDROP_BASE_URL } from '@/lib/api'; 
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCarousel from '@/components/MediaCarousel';
import TrailerModal from '@/components/TrailerModal';
import { useWatchlist } from '@/lib/useWatchlist'; // 💡 ახალი იმპორტი

export async function getServerSideProps(context) {
  const { slug } = context.params;
  const tmdbId = slug.split('-')[0];
  if (!tmdbId) return { notFound: true };

  let movie = null;
  let kinopoisk_id = null;
  let actors = [];
  
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
        `, [tmdbId]);
        actors = actorsRes.rows;
      } catch (err) {
        console.error("Error fetching actors:", err.message);
      }
    }
  } catch (e) {
    console.error("Database Error:", e.message);
  }

  if (!movie) {
    return { notFound: true };
  }

  const serializedMovie = JSON.parse(JSON.stringify(movie));

  return {
    props: {
      movie: serializedMovie,
      kinopoisk_id: kinopoisk_id, 
      actors: actors,
      recommendations: []
    },
  };
}

// --- Icons ---
const PlayIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2 -mt-1" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /> </svg> );
const StarIcon = () => ( <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"> <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.168c.969 0 1.371 1.24.588 1.81l-3.373 2.449a1 1 0 00-.364 1.118l1.287 3.959c.3.921-.755 1.688-1.54 1.118l-3.373-2.449a1 1 0 00-1.175 0l-3.373 2.449c-.784.57-1.839-.197-1.54-1.118l1.287-3.959a1 1 0 00-.364-1.118L2.053 9.386c-.783-.57-.38-1.81.588-1.81h4.168a1 1 0 00.95-.69L9.049 2.927z"></path> </svg> );
const HeartIcon = ({ isFilled }) => ( <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill={isFilled ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /> </svg> );


export default function MoviePage({ movie, kinopoisk_id, actors, recommendations }) {
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIsLoading, setModalIsLoading] = useState(false);
  const [modalVideoHtml, setModalVideoHtml] = useState('');
  
  // 💡 Watchlist Hook
  const { toggleItem, isInWatchlist } = useWatchlist();
  const isFavorite = isInWatchlist(movie.tmdb_id);
  
  const router = useRouter();

  useEffect(() => {
    if (kinopoisk_id) {
      const oldScript = document.getElementById('kinobd-player-script');
      if (oldScript) oldScript.remove();
      const playerScript = document.createElement('script');
      playerScript.src = 'https://kinobd.net/js/player_.js';
      playerScript.id = 'kinobd-player-script';
      playerScript.async = true;
      document.body.appendChild(playerScript);
      return () => {
        const script = document.getElementById('kinobd-player-script');
        if (script) script.remove();
      };
    }
  }, [kinopoisk_id, router.asPath]);

  const handleShowTrailer = useCallback(async () => {
    setIsModalOpen(true);
    setModalIsLoading(true);
    
    if (movie.trailer_url) {
      setModalVideoHtml(`<iframe class="absolute top-0 left-0 w-full h-full" src="${movie.trailer_url}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);
      setModalIsLoading(false);
      return; 
    }

    const data = await fetchData(`/movie/${movie.tmdb_id}/videos`);
    let trailer = null;
    if (data && data.results) {
      trailer = data.results.find(vid => vid.site === 'YouTube' && vid.type === 'Trailer' && vid.iso_639_1 === 'ru') 
             || data.results.find(vid => vid.site === 'YouTube' && vid.type === 'Trailer');
    }
    if (trailer) {
      setModalVideoHtml(`<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);
    } else {
      setModalVideoHtml(`<div class="flex items-center justify-center w-full h-full absolute inset-0"><p class="text-white text-xl p-8 text-center">Трейлер не найден.</p></div>`);
    }
    setModalIsLoading(false);
  }, [movie, fetchData]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalVideoHtml(''); 
  }, []);

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

      <TrailerModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        isLoading={modalIsLoading}
        videoHtml={modalVideoHtml}
      />

      <div className="flex-grow">
        {kinopoisk_id && (
          <section className="bg-[#10141A] pt-16 md:pt-20"> 
            <div className="max-w-7xl mx-auto"> 
              <div className="relative w-full overflow-hidden" style={{ paddingBottom: '42.55%' }}> 
                <div data-kinopoisk={kinopoisk_id} id="kinobd" className="absolute top-0 left-0 w-full h-full"></div>
              </div>
            </div>
          </section>
        )}

        <section className="relative h-[60vh] md:h-[80vh] min-h-[500px] w-full">
          <Image
            src={backdropPath}
            alt={title}
            fill
            style={{ objectFit: 'cover' }}
            priority={true}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10141A] via-[#10141A]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#10141A] via-[#10141A]/20 to-transparent"></div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-16">
            <div className="w-full md:w-2/3 lg:w-1/2">
              <h1 className="text-4xl md:text-6xl font-black text-white shadow-lg">{title}</h1>
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
                <button onClick={handleShowTrailer} className="trailer-button bg-brand-red text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors focus:outline-none flex items-center gap-2">
                  <PlayIcon /> Трейлер
                </button>

                {/* 💡 Кнопка "В избранное" */}
                <button 
                  onClick={() => toggleItem(movie.tmdb_id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all border-2 
                    ${isFavorite 
                      ? 'bg-white/10 border-brand-red text-brand-red hover:bg-brand-red hover:text-white' 
                      : 'bg-transparent border-gray-500 text-gray-300 hover:border-white hover:text-white'
                    }`}
                >
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
                  
                  {movie.rating_imdb > 0 && ( <div><span className="font-semibold text-gray-500 block">Рейтинг IMDb:</span>{movie.rating_imdb} ({movie.rating_imdb_count ? movie.rating_imdb_count.toLocaleString('en-US') : 0})</div> )}
                  {movie.rating_kp > 0 && ( <div><span className="font-semibold text-gray-500 block">Рейтинг КП:</span>{movie.rating_kp} ({movie.rating_kp_count ? movie.rating_kp_count.toLocaleString('en-US') : 0})</div> )}
                  {movie.budget > 0 && ( <div><span className="font-semibold text-gray-500 block">Бюджет:</span>${Number(movie.budget).toLocaleString('en-US')}</div> )}
                  {movie.countries && movie.countries.length > 0 && ( <div><span className="font-semibold text-gray-500 block">Страна:</span>{movie.countries.join(', ')}</div> )}
                  {movie.premiere_world && ( <div><span className="font-semibold text-gray-500 block">Премьера в мире:</span>{movie.premiere_world}</div> )}
                  {movie.premiere_ru && ( <div><span className="font-semibold text-gray-500 block">Премьера в РФ:</span>{movie.premiere_ru}</div> )}

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
          {recommendations?.length > 0 && (
            <MediaCarousel title="Рекомендации" items={recommendations} swiperKey="movie-recommendations" cardType="movie" />
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}