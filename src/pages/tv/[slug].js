// src/pages/tv/[slug].js (Final version)
import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { fetchData, IMAGE_BASE_URL, BACKDROP_BASE_URL } from '@/lib/api'; // ვიყენებთ @/ გზას
import { query } from '@/lib/db'; // ვიყენებთ @/ გზას
import Header from '@/components/Header'; // ვიყენებთ @/ გზას
import Footer from '@/components/Footer'; // ვიყენებთ @/ გზას
import MediaCarousel from '@/components/MediaCarousel'; // ვიყენებთ @/ გზას
import TrailerModal from '@/components/TrailerModal'; // ვიყენებთ @/ გზას

export async function getServerSideProps(context) {
  const { slug } = context.params;
  const tmdbId = slug.split('-')[0];
  if (!tmdbId) return { notFound: true };

  const tvData = await fetchData(
    `/tv/${tmdbId}`, 
    '&append_to_response=videos,credits,recommendations'
  );

  if (!tvData) {
    return { notFound: true };
  }

  // --- Postgres ბაზის Lookup ---
  let kinopoisk_id = null;
  try {
    const dbResult = await query('SELECT kinopoisk_id FROM movies WHERE tmdb_id = $1', [tmdbId]);
    if (dbResult.rows.length > 0) {
      kinopoisk_id = dbResult.rows[0].kinopoisk_id;
    }
  } catch (e) {
    console.error("Database lookup failed during SSR:", e.message);
  }
  // --- დასასრული ---

  return {
    props: {
      tvShow: tvData,
      kinopoisk_id: kinopoisk_id,
    },
  };
}

// --- ხატულების დეკლარაცია (სწორი ადგილი) ---
const PlayIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2 -mt-1" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /> </svg> );
const StarIcon = () => ( <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"> <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.168c.969 0 1.371 1.24.588 1.81l-3.373 2.449a1 1 0 00-.364 1.118l1.287 3.959c.3.921-.755 1.688-1.54 1.118l-3.373-2.449a1 1 0 00-1.175 0l-3.373 2.449c-.784.57-1.839-.197-1.54-1.118l1.287-3.959a1 1 0 00-.364-1.118L2.053 9.386c-.783-.57-.38-1.81.588-1.81h4.168a1 1 0 00.95-.69L9.049 2.927z"></path> </svg> );
// --- დასასრული ---


export default function TVPage({ tvShow, kinopoisk_id }) {
  
  if (!tvShow) { return <div>Сериал не найден.</div>; }
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIsLoading, setModalIsLoading] = useState(false);
  const [modalVideoHtml, setModalVideoHtml] = useState('');

  const handleShowTrailer = useCallback(async () => {
    setIsModalOpen(true);
    setModalIsLoading(true);
    let trailer = null;
    if (tvShow.videos && tvShow.videos.results) {
      trailer = tvShow.videos.results.find(vid => vid.site === 'YouTube' && vid.type === 'Trailer' && vid.iso_639_1 === 'ru') 
             || tvShow.videos.results.find(vid => vid.site === 'YouTube' && vid.type === 'Trailer');
    }
    if (trailer) {
      setModalVideoHtml(`<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);
    } else {
      setModalVideoHtml(`<div class="flex items-center justify-center w-full h-full absolute inset-0"><p class="text-white text-xl p-8 text-center">Трейлер не найден.</p></div>`);
    }
    setModalIsLoading(false);
  }, [tvShow.videos]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalVideoHtml(''); 
  }, []);

  const posterPath = tvShow.poster_path ? `${IMAGE_BASE_URL}${tvShow.poster_path}` : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image';
  const backdropPath = tvShow.backdrop_path ? `${BACKDROP_BASE_URL}${tvShow.backdrop_path}` : 'https://placehold.co/1280x720/10141A/6b7280?text=KinoNest';
  const actors = tvShow.credits?.cast?.slice(0, 10) || [];
  const title = tvShow.name;
  const originalTitle = tvShow.original_name;
  const releaseYear = (tvShow.first_air_date || '').split('-')[0];
  const genreKeywords = (tvShow.genres || []).map(g => g.name).join(', ');
  const pageTitle = `${title} (${releaseYear}, сериал) | ${originalTitle} | смотреть онлайн бесплатно - KinoNest`;
  const keywords = [ title, originalTitle, `${title} смотреть онлайн`, `${title} смотреть онлайн бесплатно`, `${title} ${releaseYear}`, `сериал ${title}`, "смотреть сериал онлайн", genreKeywords ].filter(Boolean).join(', ');

  return (
    <div className="bg-[#10141A] text-white font-sans">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={tvShow.overview} />
        <meta name="keywords" content={keywords} />
      </Head>
      
      {kinopoisk_id && (
        <Script 
          src="http://kinobd.net/js/player_.js"
          strategy="lazyOnload"
        />
      )}
      
      <Header onSearchSubmit={() => alert('Поиск скоро будет!')} />

      <TrailerModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        isLoading={modalIsLoading}
        videoHtml={modalVideoHtml}
      />

      {kinopoisk_id && (
        <section className="bg-[#10141A] pt-16 md:pt-20">
          <div className="max-w-7xl mx-auto"> 
            <div className="relative w-full overflow-hidden" style={{ paddingBottom: '42.55%' }}> 
              <div 
                data-kinopoisk={kinopoisk_id} 
                id="kinobd" 
                className="absolute top-0 left-0 w-full h-full"
              ></div>
            </div>
          </div>
        </section>
      )}

      <section 
        className="relative h-[60vh] md:h-[80vh] min-h-[500px] w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${backdropPath})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#10141A] via-[#10141A]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#10141A] via-[#10141A]/20 to-transparent"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-16">
          <div className="w-full md:w-2/3 lg:w-1/A">
            <h1 className="text-4xl md:text-6xl font-black text-white shadow-lg">{title}</h1>
            <div className="flex items-center space-x-4 mt-4 text-gray-300">
              <span>{releaseYear}</span>
              <span>•</span>
              <div className="flex items-center">
                <StarIcon />
                <span className="ml-1 font-semibold">{tvShow.vote_average ? tvShow.vote_average.toFixed(1) : 'N/A'}</span>
              </div>
              <span>•</span>
              <span>{tvShow.number_of_seasons || 'N/A'} {tvShow.number_of_seasons > 1 || tvShow.number_of_seasons === 0 ? 'сезонов' : 'сезон'}</span>
            </div>
            <p className="max-w-xl text-md text-gray-200 mt-4 line-clamp-3">{tvShow.overview}</p>
            <div className="flex items-center space-x-4 mt-6">
              <button 
                onClick={handleShowTrailer} 
                className="trailer-button bg-brand-red text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors focus:outline-none"
              >
                <PlayIcon />
                Трейлер
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <MediaCarousel 
              title="В ролях"
              items={actors}
              swiperKey="tv-actors"
              cardType="actor" 
            />
          </div>
          <div className="hidden md:block">
             <img 
               src={posterPath} 
               alt={title}
               className="w-full rounded-lg shadow-xl"
             />
          </div>
        </div>
        {tvShow.recommendations?.results?.length > 0 && (
          <MediaCarousel 
            title="Рекомендации"
            items={tvShow.recommendations.results}
            swiperKey="tv-recommendations"
            cardType="tv"
          />
        )}
      </main>
      <Footer />
    </div>
  );
}