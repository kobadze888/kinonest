import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { fetchData, IMAGE_BASE_URL, BACKDROP_BASE_URL, MOBILE_BACKDROP_BASE_URL } from '@/lib/api';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCarousel from '@/components/MediaCarousel';
import { useWatchlist } from '@/lib/useWatchlist';
import SeoHead from '@/components/SeoHead';
import { getSession } from 'next-auth/react';

const TrailerModal = dynamic(() => import('@/components/TrailerModal'), { ssr: false });
const PlayerContainer = dynamic(() => import('@/components/PlayerContainer'), { 
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-[#151a21] animate-pulse rounded-xl border border-gray-800" />
});

export async function getServerSideProps(context) {
  const { slug } = context.params;
  const tmdbId = slug.split('-')[0];
  if (!tmdbId) return { notFound: true };
  const session = await getSession(context);
  const isAdmin = !!session;
  let tvShow = null, kinopoisk_id = null, actors = [], recommendations = [];

  try {
    const dbResult = await query(`SELECT * FROM media WHERE tmdb_id = $1`, [tmdbId]);
    if (dbResult.rows.length > 0) {
      tvShow = dbResult.rows[0];
      kinopoisk_id = tvShow.kinopoisk_id;
      tvShow.formattedPremiere = tvShow.premiere_world ? new Date(tvShow.premiere_world).toLocaleDateString('ru-RU') : '-';
      const actorsRes = await query(`SELECT a.id, a.name, a.profile_path, ma.character FROM actors a JOIN media_actors ma ON a.id = ma.actor_id WHERE ma.media_id = $1 ORDER BY ma."order" ASC LIMIT 20`, [tmdbId]);
      actors = actorsRes.rows;
      if (tvShow.genres_names && tvShow.genres_names.length > 0) {
          const isAnimation = tvShow.genres_names.includes('мультфильм') || tvShow.genres_names.includes('Animation');
          let genreFilter = isAnimation ? "AND 'мультфильм' = ANY(genres_names)" : "AND NOT ('мультфильм' = ANY(genres_names))";
          const recRes = await query(`SELECT tmdb_id, title_ru, poster_path, rating_tmdb, release_year, type FROM media WHERE type = 'tv' AND tmdb_id != $1 AND title_ru ~ '[а-яА-ЯёЁ]' ${genreFilter} AND genres_names && $2::text[] ORDER BY rating_tmdb DESC, popularity DESC LIMIT 15`, [tmdbId, tvShow.genres_names]);
          recommendations = recRes.rows;
      }
    }
  } catch (e) {}

  if (!tvShow) return { notFound: true };
  return { props: { tvShow: JSON.parse(JSON.stringify(tvShow)), kinopoisk_id, actors, recommendations, isAdmin } };
}

const PlayIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>);
const StarIcon = () => (<svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.168c.969 0 1.371 1.24.588 1.81l-3.373 2.449a1 1 0 00-.364 1.118l1.287 3.959c.3.921-.755 1.688-1.54 1.118l-3.373-2.449a1 1 0 00-1.175 0l-3-3l1.287-3.959a1 1 0 00-.364-1.118L2.053 9.386c-.783-.57-.38-1.81.588-1.81h4.168a1 1 0 00.95-.69L9.049 2.927z"></path></svg>);
const HeartIcon = ({ isFilled }) => (<svg className="w-5 h-5 md:w-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill={isFilled ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>);
const TvIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" /></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 17.173a2.88 2.88 0 01-1.59 1.137c-1.285.345-2.288.665-2.288.665s-.64-.997-.985-2.282a2.88 2.88 0 011.137-1.59l11.458-11.46z" /></svg>);

export default function TVPage({ tvShow, kinopoisk_id, actors, recommendations, isAdmin }) {
  if (!tvShow) return <div>Сериал не найден.</div>;
  const { toggleItem, isInWatchlist } = useWatchlist();
  const isFavorite = isInWatchlist(tvShow.tmdb_id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalVideoHtml, setModalVideoHtml] = useState('');
  const [modalIsLoading, setModalIsLoading] = useState(false);

  const handleShowTrailer = async () => {
    setIsModalOpen(true);
    setModalIsLoading(true);
    if (tvShow.trailer_url) {
      setModalVideoHtml(`<iframe class="absolute top-0 left-0 w-full h-full" src="${tvShow.trailer_url}" frameborder="0" allowfullscreen></iframe>`);
      setModalIsLoading(false);
      return;
    }
    const data = await fetchData(`/tv/${tvShow.tmdb_id}/videos`);
    let trailer = data?.results?.find(v => v.type === 'Trailer');
    if (trailer) {
      setModalVideoHtml(`<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${trailer.key}?autoplay=1" frameborder="0" allowfullscreen></iframe>`);
    } else {
      setModalVideoHtml(`<div class="flex items-center justify-center w-full h-full"><p class="text-white">Трейлер не найден</p></div>`);
    }
    setModalIsLoading(false);
  };

  const title = tvShow.title_ru;
  const backdropPath = tvShow.backdrop_path ? `${BACKDROP_BASE_URL}${tvShow.backdrop_path}` : 'https://placehold.co/1280x720/10141A/6b7280?text=KinoNest';
  const posterPath = tvShow.poster_path ? `${IMAGE_BASE_URL}${tvShow.poster_path}` : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image';
  const mobileBackdropPath = tvShow.backdrop_path ? `${MOBILE_BACKDROP_BASE_URL}${tvShow.backdrop_path}` : backdropPath;

  const schemaData = { "@context": "https://schema.org", "@type": "TVSeries", "name": title, "alternativeHeadline": tvShow.title_en, "image": posterPath, "description": tvShow.overview, "startDate": tvShow.premiere_world || `${tvShow.release_year}-01-01`, "aggregateRating": { "@type": "AggregateRating", "ratingValue": tvShow.rating_tmdb || tvShow.rating_kp || 0, "bestRating": "10", "ratingCount": tvShow.rating_imdb_count > 0 ? tvShow.rating_imdb_count : 50 }, "actor": actors.slice(0, 5).map(actor => ({ "@type": "Person", "name": actor.name })), "genre": tvShow.genres_names, "offers": { "@type": "Offer", "availability": "https://schema.org/InStock", "price": "0", "priceCurrency": "RUB" } };

  return (
    <div className="bg-[#10141A] text-white font-sans">
      <SeoHead title={title} description={tvShow.overview} image={posterPath} type="video.tv_show" releaseYear={tvShow.release_year} rating={tvShow.rating_tmdb} />
      <Head><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} /></Head>
      <Header />
      {isModalOpen && <TrailerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} isLoading={modalIsLoading} videoHtml={modalVideoHtml} />}
      {kinopoisk_id && <section className="bg-[#10141A] pt-24 md:pt-32 pb-0 relative z-20"><PlayerContainer kinopoisk_id={kinopoisk_id} imdb_id={tvShow.imdb_id} tmdb_id={tvShow.tmdb_id} title={title} trailer_url={tvShow.trailer_url} type="tv" /></section>}

      <section className="relative h-[45vh] w-full lg:hidden -mt-4 z-10">
        <Image src={mobileBackdropPath} alt={title} fill style={{ objectFit: 'cover' }} priority fetchPriority="high" sizes="100vw" />
        <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-[#10141A] to-transparent z-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#10141A] via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10 bg-gradient-to-t from-[#10141A] to-transparent pt-12">
          <h1 className="text-3xl font-black text-white leading-tight drop-shadow-lg">{title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-300">
            {tvShow.age_restriction && <span className="border border-gray-500 px-1 rounded text-xs">{tvShow.age_restriction}+</span>}
            <span>{tvShow.release_year}</span><span>{tvShow.runtime ? `~ ${tvShow.runtime} мин` : ''}</span>
          </div>
        </div>
      </section>

      <div className="lg:hidden px-4 pb-10 space-y-6 -mt-2 relative z-20">
        <div className="flex gap-4">
          <div className="w-28 flex-shrink-0 rounded-lg overflow-hidden shadow-lg border border-gray-800 relative aspect-[2/3]">
            <Image src={posterPath} alt={title} fill className="object-cover" sizes="7rem" />
            {isAdmin && <Link href={`/admin/edit/${tvShow.tmdb_id}`} target="_blank" className="absolute top-2 right-2 z-20 flex items-center justify-center p-1.5 rounded-full bg-red-800/80 text-white hover:bg-brand-red transition-colors shadow-md border border-white/10"><EditIcon /></Link>}
          </div>
          <div className="flex-grow flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2">
              {tvShow.rating_imdb > 0 && <span className="bg-[#F5C518] text-black px-1.5 py-0.5 rounded font-bold text-xs">IMDb {tvShow.rating_imdb}</span>}
              {tvShow.rating_kp > 0 && <span className="bg-[#f50] text-white px-1.5 py-0.5 rounded font-bold text-xs">KP {tvShow.rating_kp}</span>}
            </div>
            <div className="flex flex-wrap gap-1 text-xs text-gray-400">{(tvShow.countries || []).slice(0, 2).join(', ')}</div>
            <div className="flex flex-wrap gap-1.5">{(tvShow.genres_names || []).slice(0, 2).map((g, i) => (<Link key={i} href={`/discover?genre=${g.toLowerCase()}`} className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 border border-gray-700 hover:bg-brand-red hover:text-white hover:border-brand-red transition-colors">{g}</Link>))}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleShowTrailer} className="col-span-2 bg-brand-red text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"><PlayIcon /> Трейлер</button>
          <button onClick={() => toggleItem(tvShow.tmdb_id)} className={`py-3 rounded-xl font-bold border flex items-center justify-center gap-2 active:scale-95 transition-transform ${isFavorite ? 'bg-white/10 border-brand-red text-brand-red' : 'border-gray-600 text-gray-300'}`}><HeartIcon isFilled={isFavorite} /> {isFavorite ? 'В избранном' : 'В избранное'}</button>
          <Link href="/tv-shows" className="py-3 rounded-xl font-bold border border-gray-600 text-gray-300 flex items-center justify-center gap-2 active:scale-95 transition-transform"><TvIcon /> Сериал</Link>
        </div>
        <div className="text-sm text-gray-300 leading-relaxed"><h3 className="text-white font-bold mb-2">Описание</h3>{tvShow.overview}</div>
        <div className="bg-[#151a21] rounded-xl p-4 border border-gray-800"><div className="grid grid-cols-2 gap-y-4 text-xs"><div><span className="block text-gray-500 mb-1">Премьера</span><span className="text-white">{tvShow.formattedPremiere}</span></div></div></div>
        <div><MediaCarousel title="Актеры" items={actors} swiperKey="mobile-tv-actors" cardType="actor" /></div>
        {recommendations?.length > 0 && <div><MediaCarousel title="Похожие" items={recommendations} swiperKey="mobile-tv-recs" cardType="tv" /></div>}
      </div>

      <div className="hidden lg:block">
        <section className="relative h-[70vh] w-full -mt-4 z-10">
          <Image src={backdropPath} alt={title} fill style={{ objectFit: 'cover' }} priority fetchPriority="high" sizes="100vw" />
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#10141A] to-transparent z-20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#10141A] via-[#10141A]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#10141A] via-[#10141A]/20 to-transparent"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-8 h-full flex items-end pb-12">
            <div className="w-1/2">
              <h1 className="text-5xl font-black text-white">{title}</h1>
              <div className="flex items-center space-x-4 mt-3 text-gray-300 text-sm">
                <span>{tvShow.release_year}</span>
                <div className="flex items-center"><StarIcon /><span className="ml-1 font-bold">{tvShow.rating_tmdb}</span></div>
                {tvShow.runtime && <span>~ {tvShow.runtime} мин.</span>}
              </div>
              <p className="text-base text-gray-200 mt-3 line-clamp-3">{tvShow.overview}</p>
              <div className="flex items-center space-x-3 mt-5">
                <button onClick={handleShowTrailer} className="bg-brand-red text-white font-bold py-2.5 px-6 rounded-lg hover:bg-red-700 transition flex items-center gap-2"><PlayIcon /> Трейлер</button>
                <button onClick={() => toggleItem(tvShow.tmdb_id)} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition border-2 ${isFavorite ? 'bg-white/10 border-brand-red text-brand-red' : 'border-gray-500 text-gray-300 hover:text-white'}`}><HeartIcon isFilled={isFavorite} /> {isFavorite ? 'В избранном' : 'В избранное'}</button>
                <Link href="/tv-shows" className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition border-2 border-gray-500 text-gray-300 hover:text-white hover:border-white hover:bg-white/5 cursor-pointer"><TvIcon /> Сериал</Link>
              </div>
            </div>
          </div>
        </section>
        <main className="max-w-7xl mx-auto px-8 -mt-6 relative z-20 pb-16">
          <div className="grid grid-cols-12 gap-8 items-stretch">
            <div className="col-span-8 flex flex-col h-full">
              <div className="w-full mb-6"><MediaCarousel title="В ролях" items={actors} swiperKey="desktop-tv-actors" cardType="actor" /></div>
              <div className="bg-[#151a21] border border-gray-800 rounded-xl p-6 shadow-lg flex-grow flex flex-col justify-center">
                <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-800 pb-3">Детали</h3>
                <div className="grid grid-cols-3 gap-y-6 gap-x-4 text-sm">
                  {tvShow.rating_imdb > 0 && (<div><span className="text-gray-500 block mb-1">Рейтинг IMDb</span><span className="text-white font-bold text-lg">{tvShow.rating_imdb}</span></div>)}
                  {tvShow.rating_kp > 0 && (<div><span className="text-gray-500 block mb-1">Рейтинг КП</span><span className="text-white font-bold text-lg">{tvShow.rating_kp}</span></div>)}
                  {tvShow.countries && (<div><span className="text-gray-500 block mb-1">Страна</span><span className="text-white font-medium">{tvShow.countries.join(', ')}</span></div>)}
                  <div><span className="text-gray-500 block mb-1">Премьера</span><span className="text-white font-medium">{tvShow.formattedPremiere}</span></div>
                  <div className="col-span-3 pt-2">
                    <span className="text-gray-500 block mb-2">Жанры</span>
                    <div className="flex flex-wrap gap-2">{(tvShow.genres_names || []).map((g, i) => (<Link key={i} href={`/discover?genre=${g.toLowerCase()}`} className="px-3 py-1 bg-gray-800 text-gray-300 rounded-md border border-gray-700 hover:bg-brand-red hover:text-white hover:border-brand-red transition-colors cursor-pointer">{g}</Link>))}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-4 h-full">
              <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-gray-800/50 w-full h-full min-h-[500px]">
                <Image src={posterPath} alt={title} fill className="object-cover" priority sizes="(max-width: 1280px) 50vw, 33vw" />
                {isAdmin && <Link href={`/admin/edit/${tvShow.tmdb_id}`} target="_blank" className="absolute top-4 right-4 z-20 flex items-center justify-center p-2.5 rounded-full bg-red-800/80 text-white hover:bg-brand-red transition-colors shadow-xl border border-white/20"><EditIcon /></Link>}
              </div>
            </div>
          </div>
          {recommendations?.length > 0 && <div className="mt-12 border-t border-gray-800 pt-8"><MediaCarousel title="Рекомендации" items={recommendations} swiperKey="desktop-tv-recs" cardType="tv" /></div>}
        </main>
      </div>
      <Footer />
    </div>
  );
}