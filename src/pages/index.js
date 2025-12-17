import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { query } from '../lib/db';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import MediaCarousel from '../components/MediaCarousel';
import Footer from '../components/Footer'; 
import TrailerModal from '../components/TrailerModal';
import SeoHead from '@/components/SeoHead';

export async function getServerSideProps() {
  const currentYear = new Date().getFullYear(); 
  const minYear = 2015; // მინიმალური წელი სექციებისთვის
  
  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names, created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp, search_slug, trailer_url, countries
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
    // 1. HERO SECTION (2015+ და RANDOM)
    const heroQuery = query(`
      SELECT ${columns} FROM media 
      WHERE type = 'movie' 
        AND ${strictCondition}
        AND release_year >= ${minYear}
        AND rating_imdb > 6.0
        AND ('США' = ANY(countries) OR 'Великобритания' = ANY(countries))
      ORDER BY RANDOM() 
      LIMIT 10
    `);

    // 2. "В кинотеатрах" (მიმდინარე წელი და RANDOM)
    const nowPlayingQuery = query(`
      SELECT ${columns} FROM media 
      WHERE type = 'movie' 
        AND ${strictCondition}
        AND release_year = ${currentYear}
      ORDER BY RANDOM()
      LIMIT 15
    `);

   // 3. "Свежие поступления"
    const newMoviesQuery = query(`
      SELECT ${columns} FROM media 
      WHERE poster_path IS NOT NULL 
        AND title_ru IS NOT NULL 
        AND title_ru != ''
      ORDER BY created_at DESC
      LIMIT 15
    `);

    // 4. "Сериалы" (2015+ და RANDOM)
    const newSeriesQuery = query(`
      SELECT ${columns} FROM media 
      WHERE type = 'tv' 
        AND ${strictCondition} 
        AND release_year >= ${minYear} 
      ORDER BY RANDOM() 
      LIMIT 15
    `);

    // 5. "Ужасы" (2015+ და RANDOM)
    const horrorQuery = query(`
      SELECT ${columns} FROM media
      WHERE type = 'movie' 
        AND genres_names && ARRAY['ужасы', 'Horror']
        AND ${strictCondition}
        AND release_year >= ${minYear} 
      ORDER BY RANDOM()
      LIMIT 15
    `);

    // 6. "Комедия" (2015+ და RANDOM)
    const comedyQuery = query(`
      SELECT ${columns} FROM media
      WHERE type = 'movie'
        AND genres_names && ARRAY['комедия', 'Comedy']
        AND ${strictCondition}
        AND release_year >= ${minYear} 
      ORDER BY RANDOM()
      LIMIT 15
    `);

    // 7. "Популярные актеры" (შემთხვევითი შერჩევა პოპულარულებიდან)
    const actorsQuery = query(`
      SELECT * FROM (
        SELECT id, name, profile_path, popularity 
        FROM actors 
        WHERE profile_path IS NOT NULL 
        ORDER BY popularity DESC 
        LIMIT 100
      ) as top_actors
      ORDER BY RANDOM() 
      LIMIT 15
    `);

    const [heroRes, nowPlayingRes, newMoviesRes, newSeriesRes, horrorRes, comedyRes, actorsRes] = await Promise.all([
      heroQuery, nowPlayingQuery, newMoviesQuery, newSeriesQuery, horrorQuery, comedyQuery, actorsQuery
    ]);

    return {
      props: {
        heroMovies: heroRes.rows,
        nowPlaying: nowPlayingRes.rows,
        newMovies: newMoviesRes.rows,
        newSeries: newSeriesRes.rows,
        horrorMovies: horrorRes.rows,
        comedyMovies: comedyRes.rows,
        popularActors: actorsRes.rows,
        currentYear
      },
    };
  } catch (error) {
    console.error("Home Page SSR Error:", error.message);
    return { props: { heroMovies: [], nowPlaying: [], newMovies: [], newSeries: [], horrorMovies: [], comedyMovies: [], popularActors: [], currentYear } };
  }
}

export default function Home({ 
  heroMovies, nowPlaying, newMovies, newSeries, 
  horrorMovies, comedyMovies, popularActors, currentYear 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIsLoading, setModalIsLoading] = useState(false);
  const [modalVideoHtml, setModalVideoHtml] = useState('');
  
  const handleShowTrailer = useCallback(async (movie) => {
    setIsModalOpen(true);
    setModalIsLoading(true);
    
    if (movie.kinopoisk_id) {
        setModalVideoHtml(`<div id="yohoho" data-kinopoisk="${movie.kinopoisk_id}" data-player="videocdn,kodik,collaps" style="width:100%; height:100%;"></div>`);
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
        title="Фильмы и сериалы онлайн бесплатно" 
        description={`KinoNest - ваш онлайн кинотеатр. Смотрите новинки ${currentYear} года.`}
      />

      <Header />
      <TrailerModal isOpen={isModalOpen} onClose={closeModal} isLoading={modalIsLoading} videoHtml={modalVideoHtml} />

      <HeroSlider movies={heroMovies} /> 

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-20 pb-16">
        
        <MediaCarousel 
          title={`В кинотеатрах (${currentYear})`}
          items={nowPlaying}
          swiperKey="now-playing"
          isLoading={loading}
          onShowTrailer={handleShowTrailer}
          link={`/discover?year=${currentYear}&sort=rating_desc`}
        />

        <MediaCarousel 
          title="Свежие поступления"
          items={newMovies}
          swiperKey="new-movies"
          isLoading={loading}
          onShowTrailer={handleShowTrailer}
          link="/discover?sort=year_desc&type=movie"
        />

        <MediaCarousel 
          title="Сериалы"
          items={newSeries}
          swiperKey="new-series"
          isLoading={loading}
          onShowTrailer={handleShowTrailer}
          link="/discover?sort=year_desc&type=tv"
        />

        <MediaCarousel 
          title="Ужасы"
          items={horrorMovies}
          swiperKey="horror-movies"
          isLoading={loading}
          onShowTrailer={handleShowTrailer}
          link="/discover?genre=ужасы&sort=year_desc"
        />

        <MediaCarousel 
          title="Комедия"
          items={comedyMovies}
          swiperKey="comedy-movies"
          isLoading={loading}
          onShowTrailer={handleShowTrailer}
          link="/discover?genre=комедия&sort=year_desc"
        />

        <MediaCarousel 
          title="Популярные актеры"
          items={popularActors}
          swiperKey="popular-actors"
          cardType="actor" 
          isLoading={loading}
          link="/actors"
        />

      </main>

      <Footer />
    </div>
  );
}