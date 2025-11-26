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

      movie.formattedBudget = movie.budget > 0
        ? `$${Number(movie.budget).toLocaleString('en-US')}`
        : '-';

      movie.formattedPremiere = movie.premiere_world
        ? new Date(movie.premiere_world).toLocaleDateString('ru-RU')
        : '-';

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
      } catch (err) {
        console.error("Error fetching actors:", err.message);
      }

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
                  AND release_year = $3
                  ${genreFilter}
                  AND genres_names && $2::text[]
                ORDER BY rating_tmdb DESC, popularity DESC
                LIMIT 15
            `, [tmdbId, movie.genres_names, movie.release_year]);

          recommendations = recRes.rows;
        } catch (err) {
          console.error("Error fetching recommendations:", err.message);
        }
      }
    }
  } catch (e) {
    console.error("Database Error:", e.message);
  }

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

// Icons
const PlayIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /> </svg>);
const StarIcon = () => (<svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"> <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.168c.969 0 1.371 1.24.588 1.81l-3.373 2.449a1 1 0 00-.364 1.118l1.287 3.959c.3.921-.755 1.688-1.54 1.118l-3.373-2.449a1 1 0 00-1.175 0l-3.373 2.449c-.784.57-1.839-.197-1.54-1.118l1.287-3.959a1 1 0 00-.364-1.118L2.053 9.386c-.783-.57-.38-1.81.588-1.81h4.168a1 1 0 00.95-.69L9.049 2.927z"></path> </svg>);
const HeartIcon = ({ isFilled }) => (<svg className="w-5 h-5 md:w-6 md:h-6" xmlns="http://www.w3.org/2000/svg" fill={isFilled ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /> </svg>);
const FilmIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>);

export default function MoviePage({ movie, kinopoisk_id, actors, recommendations }) {
  const { toggleItem, isInWatchlist } = useWatchlist();
  const isFavorite = isInWatchlist(movie.tmdb_id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalVideoHtml, setModalVideoHtml] = useState('');
  const [modalIsLoading, setModalIsLoading] = useState(false);

  const handleShowTrailerModal = () => {
    setIsModalOpen(true);
    setModalIsLoading(true);

    if (movie.trailer_url) {
      let embedUrl = movie.trailer_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
      setModalVideoHtml(`<iframe class="absolute top-0 left-0 w-full h-full" src="${embedUrl}?autoplay=1" frameborder="0" allowfullscreen></iframe>`);
    } else {
      setModalVideoHtml(`<div class="flex items-center justify-center w-full h-full"><p class="text-white">Трейлер не найден</p></div>`);
    }
    setModalIsLoading(false);
  };

  const title = movie.title_ru;
  const releaseYear = movie.release_year || 'N/A';
  const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image';
  const backdropPath = movie.backdrop_path ? `${BACKDROP_BASE_URL}${movie.backdrop_path}` : 'https://placehold.co/1280x720/10141A/6b7280?text=KinoNest';

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Head><title>{title} | Фильм</title></Head>
      <Header />
      <TrailerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} isLoading={modalIsLoading} videoHtml={modalVideoHtml} />

      {/* Player Section */}
      {kinopoisk_id && (
        <section className="bg-[#10141A] pt-24 md:pt-32 pb-0 relative z-20">
          <PlayerContainer kinopoisk_id={kinopoisk_id} imdb_id={movie.imdb_id} tmdb_id={movie.tmdb_id} title={title} trailer_url={movie.trailer_url} type="movie" />
        </section>
      )}

      {/* ================= MOBILE LAYOUT START ================= */}
      {/* -mt-2: მცირე უარყოფითი მარჯინი, რომ "თეთრი ხაზი" გაქრეს */}
      <section className="relative h-[45vh] w-full lg:hidden -mt-2 z-10">
        <Image src={backdropPath} alt={title} fill style={{ objectFit: 'cover' }} priority sizes="100vw" />
        
        {/* ✨ TOP GRADIENT: რბილი გადასვლა პლეერიდან სურათზე.
           - h-40: საკმარისი სიმაღლე, რომ არ იყოს "მოჭრილი"
           - from-[#10141A] to-transparent: ყველაზე სუფთა გადასვლა
        */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#10141A] to-transparent z-20"></div>
        
        {/* BOTTOM GRADIENT */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#10141A] via-transparent to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10 bg-gradient-to-t from-[#10141A] to-transparent pt-12">
          <h1 className="text-3xl font-black text-white leading-tight drop-shadow-lg">{title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-300">
            {movie.age_restriction && <span className="border border-gray-500 px-1 rounded text-xs">{movie.age_restriction}+</span>}
            <span>{releaseYear}</span>
            <span>{movie.runtime ? `${movie.runtime} мин` : ''}</span>
          </div>
        </div>
      </section>

      <div className="lg:hidden px-4 pb-10 space-y-6 -mt-2 relative z-20">
        {/* Mobile Info Block */}
        <div className="flex gap-4">
          <div className="w-28 flex-shrink-0 rounded-lg overflow-hidden shadow-lg border border-gray-800 relative aspect-[2/3]">
            <Image src={posterPath} alt={title} fill className="object-cover" />
          </div>
          <div className="flex-grow flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2">
              {movie.rating_imdb > 0 && (
                <span className="bg-[#F5C518] text-black px-1.5 py-0.5 rounded font-bold text-xs">IMDb {movie.rating_imdb}</span>
              )}
              {movie.rating_kp > 0 && (
                <span className="bg-[#f50] text-white px-1.5 py-0.5 rounded font-bold text-xs">KP {movie.rating_kp}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 text-xs text-gray-400">
              {(movie.countries || []).slice(0, 2).join(', ')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(movie.genres_names || []).slice(0, 2).map((g, i) => (
                <Link key={i} href={`/discover?genre=${g.toLowerCase()}`} className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 border border-gray-700 hover:bg-brand-red hover:text-white hover:border-brand-red transition-colors">
                  {g}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Full Width Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleShowTrailerModal} className="col-span-2 bg-brand-red text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <PlayIcon /> Смотреть трейлер
          </button>
          <button onClick={() => toggleItem(movie.tmdb_id)} className={`py-3 rounded-xl font-bold border flex items-center justify-center gap-2 active:scale-95 transition-transform ${isFavorite ? 'bg-white/10 border-brand-red text-brand-red' : 'border-gray-600 text-gray-300'}`}>
            <HeartIcon isFilled={isFavorite} /> {isFavorite ? 'В избранном' : 'В избранное'}
          </button>
          <Link href="/movies" className="py-3 rounded-xl font-bold border border-gray-600 text-gray-300 flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <FilmIcon /> ФИЛЬМ
          </Link>
        </div>

        {/* Overview */}
        <div className="text-sm text-gray-300 leading-relaxed">
          <h3 className="text-white font-bold mb-2">Описание</h3>
          {movie.overview}
        </div>

        {/* Details Grid Mobile */}
        <div className="bg-[#151a21] rounded-xl p-4 border border-gray-800">
          <div className="grid grid-cols-2 gap-y-4 text-xs">
            <div>
              <span className="block text-gray-500 mb-1">Бюджет</span>
              <span className="text-white">{movie.formattedBudget}</span>
            </div>
            <div>
              <span className="block text-gray-500 mb-1">Премьера</span>
              <span className="text-white">{movie.formattedPremiere}</span>
            </div>
          </div>
        </div>

        {/* Actors Mobile */}
        <div>
          <MediaCarousel title="Актеры" items={actors} swiperKey="mobile-actors" cardType="actor" />
        </div>

        {/* Recommendations Mobile */}
        {recommendations?.length > 0 && (
          <div>
            <MediaCarousel title="Похожие" items={recommendations} swiperKey="mobile-recs" cardType="movie" />
          </div>
        )}
      </div>
      {/* ================= MOBILE LAYOUT END ================= */}


      {/* ================= DESKTOP LAYOUT START ================= */}
      <div className="hidden lg:block">
        {/* -mt-2: მცირე გადაფარვა ხაზების მოსაშორებლად */}
        <section className="relative h-[70vh] w-full -mt-2 z-10">
          <Image src={backdropPath} alt={title} fill style={{ objectFit: 'cover' }} priority sizes="100vw" />
          
          {/* ✨ TOP GRADIENT: უფრო მაღალი (h-64) და ძალიან რბილი დესკტოპისთვის */}
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#10141A] to-transparent z-20"></div>

          {/* BOTTOM GRADIENTS */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#10141A] via-[#10141A]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#10141A] via-[#10141A]/20 to-transparent"></div>

          <div className="relative z-10 max-w-7xl mx-auto px-8 h-full flex items-end pb-12">
            <div className="w-1/2">
              <h1 className="text-5xl font-black text-white">{title}</h1>
              <div className="flex items-center space-x-4 mt-3 text-gray-300 text-sm">
                <span>{releaseYear}</span>
                <div className="flex items-center"><StarIcon /><span className="ml-1 font-bold">{movie.rating_tmdb}</span></div>
                {movie.runtime && <span>{movie.runtime} мин.</span>}
                {movie.age_restriction && <span className="border border-gray-400 px-1 rounded text-xs">{movie.age_restriction}+</span>}
              </div>
              <p className="text-base text-gray-200 mt-3 line-clamp-3">{movie.overview}</p>

              <div className="flex items-center space-x-3 mt-5">
                <button onClick={handleShowTrailerModal} className="bg-brand-red text-white font-bold py-2.5 px-6 rounded-lg hover:bg-red-700 transition flex items-center gap-2"><PlayIcon /> Трейлер</button>
                <button onClick={() => toggleItem(movie.tmdb_id)} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition border-2 ${isFavorite ? 'bg-white/10 border-brand-red text-brand-red' : 'border-gray-500 text-gray-300 hover:text-white'}`}>
                  <HeartIcon isFilled={isFavorite} /> {isFavorite ? 'В избранном' : 'В избранное'}
                </button>
                <Link href="/movies" className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition border-2 border-gray-500 text-gray-300 hover:text-white hover:border-white hover:bg-white/5 cursor-pointer">
                  <FilmIcon /> ФИЛЬМ
                </Link>
              </div>
            </div>
          </div>
        </section>

        <main className="max-w-7xl mx-auto px-8 -mt-6 relative z-20 pb-16">
          <div className="grid grid-cols-12 gap-8 items-stretch">
            <div className="col-span-8 flex flex-col h-full">
              <div className="w-full mb-6">
                <MediaCarousel title="В ролях" items={actors} swiperKey="desktop-actors" cardType="actor" />
              </div>
              <div className="bg-[#151a21] border border-gray-800 rounded-xl p-6 shadow-lg flex-grow flex flex-col justify-center">
                <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-800 pb-3">Детали</h3>
                <div className="grid grid-cols-3 gap-y-6 gap-x-4 text-sm">
                  {movie.rating_imdb > 0 && (<div><span className="text-gray-500 block mb-1">Рейтинг IMDb</span><span className="text-white font-bold text-lg">{movie.rating_imdb}</span></div>)}
                  {movie.rating_kp > 0 && (<div><span className="text-gray-500 block mb-1">Рейтинг КП</span><span className="text-white font-bold text-lg">{movie.rating_kp}</span></div>)}

                  <div><span className="text-gray-500 block mb-1">Бюджет</span><span className="text-white font-medium">{movie.formattedBudget}</span></div>
                  {movie.countries && (<div><span className="text-gray-500 block mb-1">Страна</span><span className="text-white font-medium">{movie.countries.join(', ')}</span></div>)}
                  <div><span className="text-gray-500 block mb-1">Премьера</span><span className="text-white font-medium">{movie.formattedPremiere}</span></div>

                  <div className="col-span-3 pt-2">
                    <span className="text-gray-500 block mb-2">Жанры</span>
                    <div className="flex flex-wrap gap-2">
                      {(movie.genres_names || []).map((g, i) => (
                        <Link key={i} href={`/discover?genre=${g.toLowerCase()}`} className="px-3 py-1 bg-gray-800 text-gray-300 rounded-md border border-gray-700 hover:bg-brand-red hover:text-white hover:border-brand-red transition-colors cursor-pointer">
                          {g}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-4 h-full">
              <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-gray-800/50 w-full h-full min-h-[500px]">
                <Image src={posterPath} alt={title} fill className="object-cover" priority />
              </div>
            </div>
          </div>
          {recommendations?.length > 0 && (
            <div className="mt-12 border-t border-gray-800 pt-8">
              <MediaCarousel title="Рекомендации" items={recommendations} swiperKey="desktop-recs" cardType="movie" />
            </div>
          )}
        </main>
      </div>
      {/* ================= DESKTOP LAYOUT END ================= */}

      <Footer />
    </div>
  );
}