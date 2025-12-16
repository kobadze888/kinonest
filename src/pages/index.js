import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { query } from '../lib/db';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import MediaCarousel from '../components/MediaCarousel';
import Footer from '../components/Footer'; 
import TrailerModal from '../components/TrailerModal';
import SeoHead from '@/components/SeoHead';

// დამხმარე ფუნქცია მასივის ასარევად (Client-Side Shuffle)
const shuffle = (array) => {
  if (!array || array.length === 0) return [];
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export async function getStaticProps() {
  const currentYear = new Date().getFullYear(); 
  
  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp, trailer_url
  `;

  const strictCondition = `
    backdrop_path IS NOT NULL 
    AND poster_path IS NOT NULL
    AND title_ru IS NOT NULL AND title_ru != 'No Title'
    AND title_ru ~ '[а-яА-ЯёЁ]'
    AND kinopoisk_id IS NOT NULL 
    AND rating_imdb > 0
    AND release_year IS NOT NULL AND release_year > 0
  `;

  try {
    // 1. HERO SLIDER
    const heroQuery = query(`
      SELECT ${columns} FROM media 
      WHERE type = 'movie' 
        AND ${strictCondition}
        AND release_year = ${currentYear}
        AND rating_imdb > 6.0
      ORDER BY popularity DESC 
      LIMIT 50
    `);

    // 2. В кинотеатрах
    const nowPlayingQuery = query(`
      SELECT ${columns} FROM media 
      WHERE type = 'movie' 
        AND ${strictCondition}
        AND release_year = ${currentYear}
      ORDER BY popularity DESC
      LIMIT 50
    `);

    // 3. Свежие поступления (ვიღებთ ბოლო 60-ს, რომ მერე ავურიოთ)
    const newMoviesQuery = query(`
      SELECT ${columns} FROM media 
      WHERE type = 'movie' 
        AND ${strictCondition} 
      ORDER BY created_at DESC 
      LIMIT 60
    `);

    // 4. სერიალები
    const newSeriesQuery = query(`
      SELECT ${columns} FROM media 
      WHERE type = 'tv' 
        AND ${strictCondition} 
        AND release_year >= ${currentYear - 2} 
      ORDER BY created_at DESC 
      LIMIT 60
    `);

    // 5. ჟანრები
    const horrorQuery = query(`
      SELECT ${columns} FROM media
      WHERE type = 'movie' 
        AND genres_names && ARRAY['ужасы', 'Horror']
        AND ${strictCondition}
        AND release_year >= ${currentYear - 3} 
      ORDER BY popularity DESC
      LIMIT 40
    `);

    const comedyQuery = query(`
      SELECT ${columns} FROM media
      WHERE type = 'movie'
        AND genres_names && ARRAY['комедия', 'Comedy']
        AND ${strictCondition}
        AND release_year >= ${currentYear - 3} 
      ORDER BY popularity DESC
      LIMIT 40
    `);

    // 6. მსახიობები
    const actorsQuery = query(`
      SELECT * FROM (
        SELECT DISTINCT ON (a.id) a.id, a.name, a.profile_path, a.popularity 
        FROM actors a
        JOIN media_actors ma ON a.id = ma.actor_id
        JOIN media m ON ma.media_id = m.tmdb_id
        WHERE a.profile_path IS NOT NULL
          AND m.type = 'movie'
          AND m.rating_imdb > 6.0
        ORDER BY a.id, a.popularity DESC 
        LIMIT 200
      ) as top_actors
      ORDER BY RANDOM() 
      LIMIT 50
    `);

    const [heroRes, nowPlayingRes, newMoviesRes, newSeriesRes, horrorRes, comedyRes, actorsRes] = await Promise.all([
      heroQuery, nowPlayingQuery, newMoviesQuery, newSeriesQuery, horrorQuery, comedyQuery, actorsQuery
    ]);

    return {
      props: {
        poolHero: heroRes.rows || [],
        poolNowPlaying: nowPlayingRes.rows || [],
        poolFreshArrivals: newMoviesRes.rows || [], // შევცვალეთ სახელი (pool)
        poolSeries: newSeriesRes.rows || [],
        poolHorror: horrorRes.rows || [],
        poolComedy: comedyRes.rows || [],
        poolActors: actorsRes.rows || [],
        currentYear
      },
      revalidate: 600, 
    };
  } catch (error) {
    console.error("Build Error:", error.message);
    return { 
      props: { poolHero: [], poolNowPlaying: [], poolFreshArrivals: [], poolSeries: [], poolHorror: [], poolComedy: [], poolActors: [], currentYear }, 
      revalidate: 60 
    };
  }
}

export default function Home({ 
  poolHero = [], 
  poolNowPlaying = [], 
  poolFreshArrivals = [], 
  poolSeries = [], 
  poolHorror = [], 
  poolComedy = [], 
  poolActors = [], 
  currentYear 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // State-ები (თავიდან ცარიელი ან პირველი 15)
  const [heroMovies, setHeroMovies] = useState(poolHero.slice ? poolHero.slice(0, 10) : []); 
  const [nowPlaying, setNowPlaying] = useState(poolNowPlaying.slice ? poolNowPlaying.slice(0, 15) : []);
  const [freshArrivals, setFreshArrivals] = useState(poolFreshArrivals.slice ? poolFreshArrivals.slice(0, 15) : []); // აქაც ვურევთ
  const [newSeries, setNewSeries] = useState(poolSeries.slice ? poolSeries.slice(0, 15) : []);
  const [horrorMovies, setHorrorMovies] = useState(poolHorror.slice ? poolHorror.slice(0, 15) : []);
  const [comedyMovies, setComedyMovies] = useState(poolComedy.slice ? poolComedy.slice(0, 15) : []);
  const [popularActors, setPopularActors] = useState(poolActors.slice ? poolActors.slice(0, 15) : []);

  // Client-Side Shuffle - აურევს ყველა სექციას ჩატვირთვისას
  useEffect(() => {
    if (poolHero.length) setHeroMovies(shuffle(poolHero).slice(0, 10));
    if (poolNowPlaying.length) setNowPlaying(shuffle(poolNowPlaying).slice(0, 15));
    // 🎯 ახლა ახალ ფილმებსაც ვურევთ (ბოლო 60-დან ირჩევს 15-ს)
    if (poolFreshArrivals.length) setFreshArrivals(shuffle(poolFreshArrivals).slice(0, 15)); 
    if (poolSeries.length) setNewSeries(shuffle(poolSeries).slice(0, 15));
    if (poolHorror.length) setHorrorMovies(shuffle(poolHorror).slice(0, 15));
    if (poolComedy.length) setComedyMovies(shuffle(poolComedy).slice(0, 15));
    if (poolActors.length) setPopularActors(shuffle(poolActors).slice(0, 15));
  }, []); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIsLoading, setModalIsLoading] = useState(false);
  const [modalVideoHtml, setModalVideoHtml] = useState('');

  useEffect(() => {
    const start = (url) => { if (url === '/') setLoading(true); };
    const end = () => setLoading(false);
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', end);
    router.events.on('routeChangeError', end);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', end);
      router.events.off('routeChangeError', end);
    };
  }, [router]);

  const handleShowTrailer = useCallback(async (movie) => {
    setIsModalOpen(true);
    setModalIsLoading(true);
    
    if (movie.kinopoisk_id) {
        setModalVideoHtml(`
          <div id="yohoho" data-kinopoisk="${movie.kinopoisk_id}" data-player="videocdn,kodik,collaps" style="width:100%; height:100%;"></div>
        `);
        const oldScript = document.getElementById('yohoho-script');
        if (oldScript) oldScript.remove();
        const script = document.createElement('script');
        script.src = 'https://yohoho.cc/yo.js';
        script.id = 'yohoho-script';
        document.body.appendChild(script);
        setModalIsLoading(false);
        return;
    }
    
    if (movie.trailer_url) {
         let embedUrl = movie.trailer_url.replace('watch?v=', 'embed/');
         setModalVideoHtml(`<iframe class="absolute top-0 left-0 w-full h-full" src="${embedUrl}?autoplay=1" frameborder="0" allowfullscreen></iframe>`);
    } else {
         setModalVideoHtml(`<div class="flex items-center justify-center w-full h-full absolute inset-0"><p class="text-white text-xl">Трейлер не найден</p></div>`);
    }
    setModalIsLoading(false);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalVideoHtml(''); 
    const s = document.getElementById('yohoho-script');
    if (s) s.remove();
  }, []);

  return (
    <div className="bg-[#10141A] text-white font-sans">
      <SeoHead 
        title={`Фильмы и сериалы онлайн бесплатно`} 
        description={`KinoNest - новинки ${currentYear} года.`}
      />

      <Header />
      <TrailerModal isOpen={isModalOpen} onClose={closeModal} isLoading={modalIsLoading} videoHtml={modalVideoHtml} />

      <HeroSlider movies={heroMovies} /> 

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-20 pb-16">
        
        <MediaCarousel 
          title={`В кинотеатрах (${currentYear})`}
          items={nowPlaying}
          swiperKey="now-playing"
          cardType="movie"
          isLoading={loading}
          link={`/discover?year=${currentYear}&sort=rating_desc`} 
          onShowTrailer={handleShowTrailer}
        />

        <MediaCarousel 
          title="Свежие поступления"
          items={freshArrivals}
          swiperKey="new-movies"
          cardType="movie" 
          isLoading={loading}
          link="/discover?sort=year_desc&type=movie"
          onShowTrailer={handleShowTrailer}
        />

        <MediaCarousel 
          title="Новые сериалы"
          items={newSeries}
          swiperKey="new-series"
          cardType="movie"
          isLoading={loading}
          link="/discover?sort=year_desc&type=tv"
          onShowTrailer={handleShowTrailer}
        />

        <MediaCarousel 
          title="Ужасы"
          items={horrorMovies}
          swiperKey="horror"
          cardType="movie"
          isLoading={loading}
          link="/discover?genre=ужасы&sort=year_desc"
          onShowTrailer={handleShowTrailer}
        />

        <MediaCarousel 
          title="Комедии"
          items={comedyMovies}
          swiperKey="comedy"
          cardType="movie"
          isLoading={loading}
          link="/discover?genre=комедия&sort=year_desc"
          onShowTrailer={handleShowTrailer}
        />

        <MediaCarousel 
          title="Популярные актеры"
          items={popularActors}
          swiperKey="actors"
          cardType="actor" 
          isLoading={loading}
          link="/actors" 
        />

      </main>
      <Footer />
    </div>
  );
}