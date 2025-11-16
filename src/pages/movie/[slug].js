// src/pages/movie/[slug].js (სრულიად რუსულ ენაზე)
import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import { fetchData, IMAGE_BASE_URL, BACKDROP_BASE_URL } from '../../lib/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MediaCarousel from '../../components/MediaCarousel';
import TrailerModal from '../../components/TrailerModal';

export async function getServerSideProps(context) {
  const { slug } = context.params;
  const id = slug.split('-')[0];
  if (!id) return { notFound: true }; 

  const movieData = await fetchData(
    `/movie/${id}`, 
    '&append_to_response=videos,credits,recommendations'
  );

  if (!movieData) {
    return { notFound: true };
  }

  return {
    props: {
      movie: movieData,
    },
  };
}

// SVG ხატულები (არ ითარგმნება)
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2 -mt-1" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
  </svg>
);
const StarIcon = () => (
  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.168c.969 0 1.371 1.24.588 1.81l-3.373 2.449a1 1 0 00-.364 1.118l1.287 3.959c.3.921-.755 1.688-1.54 1.118l-3.373-2.449a1 1 0 00-1.175 0l-3.373 2.449c-.784.57-1.839-.197-1.54-1.118l1.287-3.959a1 1 0 00-.364-1.118L2.053 9.386c-.783-.57-.38-1.81.588-1.81h4.168a1 1 0 00.95-.69L9.049 2.927z"></path>
  </svg>
);

export default function MoviePage({ movie }) {
  
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
      setModalVideoHtml(`
        <iframe 
          class="absolute top-0 left-0 w-full h-full" 
          src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      `);
    } else {
      setModalVideoHtml(`<div class="flex items-center justify-center w-full h-full absolute inset-0"><p class="text-white text-xl p-8 text-center">Трейлер не найден.</p></div>`);
    }

    setModalIsLoading(false);
  }, [movie.videos]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalVideoHtml(''); 
  }, []);

  const posterPath = movie.poster_path 
    ? `${IMAGE_BASE_URL}${movie.poster_path}` 
    : 'https://placehold.co/500x750/1f2937/6b7280?text=No+Image';

  const backdropPath = movie.backdrop_path 
    ? `${BACKDROP_BASE_URL}${movie.backdrop_path}`
    : 'https://placehold.co/1280x720/10141A/6b7280?text=KinoNest';

  const actors = movie.credits?.cast?.slice(0, 10) || [];
  const director = movie.credits?.crew?.find(person => person.job === 'Director');

  return (
    <div className="bg-[#10141A] text-white font-sans">
      <Head>
        <title>{movie.title} ({movie.release_date?.split('-')[0]}) - KinoNest</title>
        <meta name="description" content={movie.overview} />
        {/* TODO: დავამატოთ OpenGraph თეგები SEO-სთვის */}
      </Head>
      
      <Header onSearchSubmit={() => alert('Поиск скоро будет!')} />

      <TrailerModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        isLoading={modalIsLoading}
        videoHtml={modalVideoHtml}
      />

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
              <span>{movie.release_date?.split('-')[0]}</span>
              <span>•</span>
              <div className="flex items-center">
                <StarIcon />
                <span className="ml-1 font-semibold">{movie.vote_average.toFixed(1)}</span>
              </div>
              <span>•</span>
              <span>{movie.runtime} мин.</span>
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
                  {movie.status}
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
                    {movie.genres.map(g => (
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