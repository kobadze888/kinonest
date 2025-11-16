// src/pages/movie/[slug].js (Postgres კავშირი ამოღებულია)
import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { fetchData, IMAGE_BASE_URL, BACKDROP_BASE_URL } from '../../lib/api';
// import { query } from '../../lib/db'; // <-- ამოღებულია!
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MediaCarousel from '../../components/MediaCarousel';
import TrailerModal from '../../components/TrailerModal';

// დროებით ვითიშავთ kinopoisk-ის ID-სთვის ბაზის ძებნას
export async function getServerSideProps(context) {
  const { slug } = context.params;
  const tmdbId = slug.split('-')[0];
  if (!tmdbId) return { notFound: true };

  const movieData = await fetchData(
    `/movie/${tmdbId}`, 
    '&append_to_response=videos,credits,recommendations'
  );

  if (!movieData) {
    return { notFound: true };
  }

  // kinopoisk_id დროებით null-ია, სანამ Vercel-ზე არ შევამოწმებთ სინქრონიზაციას
  let kinopoisk_id = null; 

  return {
    props: {
      movie: movieData,
      kinopoisk_id: kinopoisk_id, 
    },
  };
}

// ... (დანარჩენი კოდი უცვლელია, ისევ იყენებს movie და kinopoisk_id-ს) ...

// ... (SVG ხატულები) ...

export default function MoviePage({ movie, kinopoisk_id }) {
  
  if (!movie) { return <div>Фильм не найден.</div>; }
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIsLoading, setModalIsLoading] = useState(false);
  const [modalVideoHtml, setModalVideoHtml] = useState('');

  const handleShowTrailer = useCallback(async () => {
    setIsModalOpen(true);
    setModalIsLoading(true);
    let trailer = null;
    if (movie.videos && movie.videos.results) {
      trailer = movie.videos.results.find(vid => vid.site === 'YouTube' && vid.type === 'Trailer' && vid.iso_639_1 === 'ru') 
             || movie.videos.results.find(vid => vid.site === 'YouTube' && vid.type === 'Trailer');
    }
    if (trailer) {
      setModalVideoHtml(`<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);
    } else {
      setModalVideoHtml(`<div class="flex items-center justify-center w-full h-full absolute inset-0"><p class="text-white text-xl p-8 text-center">Трейлер не найден.</p></div>`);
    }
    setModalIsLoading(false);
  }, [movie.videos]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalVideoHtml(''); 
  }, []);

  const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image';
  const backdropPath = movie.backdrop_path ? `${BACKDROP_BASE_URL}${movie.backdrop_path}` : 'https://placehold.co/1280x720/10141A/6b7280?text=KinoNest';
  const actors = movie.credits?.cast?.slice(0, 10) || [];
  const director = movie.credits?.crew?.find(person => person.job === 'Director');
  const releaseYear = (movie.release_date || '').split('-')[0];
  const pageTitle = `${movie.title} (${releaseYear}, фильм) | ${movie.original_title} | смотреть онлайн бесплатно - KinoNest`;
  const genreKeywords = (movie.genres || []).map(g => g.name).join(', ');
  const keywords = [ movie.title, movie.original_title, `${movie.title} смотреть онлайн`, `${movie.title} смотреть онлайн бесплатно`, `${movie.title} ${releaseYear}`, `фильм ${movie.title}`, "смотреть фильм онлайн", genreKeywords ].filter(Boolean).join(', ');


  return (
    <div className="bg-[#10141A] text-white font-sans">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={movie.overview} />
        <meta name="keywords" content={keywords} />
      </Head>
      
      {/* ვტვირთავთ kinobd-ის პლეერის სკრიპტს *მხოლოდ* თუ kinopoisk_id არსებობს */}
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

      {/* --- 1. პლეერის სექცია (რომელიც არ ჩაიტვირთება, რადგან kinopoisk_id=null) --- */}
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

      {/* --- 2. Hero სექცია (დიდი ფონით) --- */}
      <section 
        className="relative h-[60vh] md:h-[80vh] min-h-[500px] w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${backdropPath})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#10141A] via-[#10141A]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#10141A] via-[#10141A]/20 to-transparent"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-16">
          <div className="w-full md:w-2/3 lg:w-1/2">
            <h1 className="text-4xl md:text-6xl font-black text-white shadow-lg">{movie.title}</h1>
            <div className="flex items-center space-x-4 mt-4 text-gray-300">
              <span>{releaseYear}</span>
              <span>•</span>
              <div className="flex items-center">
                <StarIcon />
                <span className="ml-1 font-semibold">{movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
              </div>
              <span>•</span>
              <span>{movie.runtime || 'N/A'} мин.</span>
            </div>
            <p className="max-w-xl text-md text-gray-200 mt-4 line-clamp-3">{movie.overview}</p>
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

      {/* --- 3. დანარჩენი კონტენტი --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <MediaCarousel 
              title="В ролях"
              items={actors}
              swiperKey="movie-actors"
              cardType="actor" 
            />
            <div className="mt-8 p-4 bg-gray-900/50 rounded-lg">
              <h3 className="text-2xl font-bold text-white mb-4">Детали</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-gray-300">
                <div>
                  <span className="font-semibold text-gray-500 block">Статус:</span>
                  {movie.status || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block">Режиссёр:</span>
                  {director ? director.name : 'N/A'}
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block">Бюджет:</span>
                  {movie.budget ? `$${movie.budget.toLocaleString()}` : 'N/A'}
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block">Сборы:</span>
                  {movie.revenue ? `$${movie.revenue.toLocaleString()}` : 'N/A'}
                </div>
                <div className="col-span-2 md:col-span-3">
                  <span className="font-semibold text-gray-500 block">Жанры:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(movie.genres || []).map(g => (
                      <span key={g.id} className="py-1 px-3 bg-gray-800 text-gray-300 rounded-full text-sm">
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
             <img 
               src={posterPath} 
               alt={movie.title}
               className="w-full rounded-lg shadow-xl"
             />
          </div>
        </div>
        {movie.recommendations?.results?.length > 0 && (
          <MediaCarousel 
            title="Рекомендации"
            items={movie.recommendations.results}
            swiperKey="movie-recommendations"
            cardType="movie"
          />
        )}
      </main>
      <Footer />
    </div>
  );
}