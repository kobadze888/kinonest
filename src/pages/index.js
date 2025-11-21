// src/pages/index.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { query } from '../lib/db';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import MediaCarousel from '../components/MediaCarousel';
import Footer from '../components/Footer'; 

export async function getServerSideProps() {
  
  const columns = `
    tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
    poster_path, backdrop_path, release_year, rating_tmdb,
    genres_ids, genres_names,
    created_at::TEXT, updated_at::TEXT 
  `;

  try {
    // 1. Hero Slider (Топ рейтинг + наличие фона)
    const heroQuery = query(`
      SELECT ${columns} FROM media 
      WHERE type = 'movie' AND backdrop_path IS NOT NULL AND rating_tmdb > 7.0 
      ORDER BY rating_tmdb DESC LIMIT 5
    `);

    // 2. В кинотеатрах (შეცვლილია: 2024-ის ნაცვლად ვიღებთ 2020-ის ზევით, რომ ცარიელი არ იყოს)
    const nowPlayingQuery = query(`
      SELECT ${columns} FROM media 
      WHERE type = 'movie' AND release_year > 2020
      ORDER BY release_year DESC, popularity DESC 
      LIMIT 15
    `);

    // 3. Новые фильмы (ბაზაში ბოლოს დამატებულები)
    const newMoviesQuery = query(`
      SELECT ${columns} FROM media 
      WHERE type = 'movie' 
      ORDER BY created_at DESC 
      LIMIT 15
    `);

    // 4. Новые сериалы (სულ 7-ია ჯერჯერობით, მაგრამ გამოიტანს რაც არის)
    const newSeriesQuery = query(`
      SELECT ${columns} FROM media 
      WHERE type = 'tv' 
      ORDER BY created_at DESC 
      LIMIT 15
    `);

    // 5. Ужасы (Жанр)
    const horrorQuery = query(`
      SELECT ${columns} FROM media
      WHERE type = 'movie' AND genres_names && ARRAY['ужасы', 'Horror']
      ORDER BY release_year DESC, rating_tmdb DESC
      LIMIT 15
    `);

    // 6. Комедии (Жанр)
    const comedyQuery = query(`
      SELECT ${columns} FROM media
      WHERE type = 'movie' AND genres_names && ARRAY['комедия', 'Comedy']
      ORDER BY release_year DESC, rating_tmdb DESC
      LIMIT 15
    `);

    // 7. Популярные актеры
    const actorsQuery = query(`
      SELECT id, name, profile_path, popularity 
      FROM actors 
      ORDER BY popularity DESC 
      LIMIT 15
    `);

    // Выполняем все запросы параллельно
    const [
      heroRes, 
      nowPlayingRes, 
      newMoviesRes, 
      newSeriesRes, 
      horrorRes, 
      comedyRes, 
      actorsRes
    ] = await Promise.all([
      heroQuery, 
      nowPlayingQuery, 
      newMoviesQuery, 
      newSeriesQuery, 
      horrorQuery, 
      comedyQuery, 
      actorsQuery
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
      },
    };
  } catch (error) {
    console.error("Home Page SSR Error (Database):", error.message);
    return {
      props: {
        heroMovies: [],
        nowPlaying: [],
        newMovies: [],
        newSeries: [],
        horrorMovies: [],
        comedyMovies: [],
        popularActors: [],
      },
    };
  }
}

export default function Home({ 
  heroMovies, 
  nowPlaying, 
  newMovies, 
  newSeries, 
  horrorMovies, 
  comedyMovies, 
  popularActors 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const start = (url) => {
       if (url === '/') setLoading(true);
    };
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

  return (
    <div className="bg-[#10141A] text-white font-sans">
      <Header />
      
      <>
        {/* Hero Slider */}
        <HeroSlider movies={heroMovies} /> 

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20 pb-16" id="main-container">
          
          {/* 1. В кинотеатрах (უახლესი ფილმები) */}
          <MediaCarousel 
            title="В кинотеатрах"
            items={nowPlaying}
            swiperKey="now-playing"
            cardType="movie"
            isLoading={loading} 
          />

          {/* 2. Новые фильмы (ბოლო დამატებული) */}
          <MediaCarousel 
            title="Новые фильмы"
            items={newMovies}
            swiperKey="new-movies"
            cardType="movie" 
            isLoading={loading}
          />

          {/* 3. Новые сериалы */}
          <MediaCarousel 
            title="Новые сериалы"
            items={newSeries}
            swiperKey="new-series"
            cardType="movie"
            isLoading={loading}
          />

          {/* 4. Ужасы */}
          <MediaCarousel 
            title="Ужасы"
            items={horrorMovies}
            swiperKey="horror-movies"
            cardType="movie"
            isLoading={loading}
          />

          {/* 5. Комедии */}
          <MediaCarousel 
            title="Комедии"
            items={comedyMovies}
            swiperKey="comedy-movies"
            cardType="movie"
            isLoading={loading}
          />

          {/* 6. Популярные актеры */}
          <MediaCarousel 
            title="Популярные актеры"
            items={popularActors}
            swiperKey="popular-actors"
            cardType="actor" 
            isLoading={loading}
          />

        </main>
      </>
      <Footer />
    </div>
  );
}