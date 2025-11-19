// src/pages/watchlist.js
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaCard from '@/components/MediaCard';
import MediaCardSkeleton from '@/components/MediaCardSkeleton'; 
import { useWatchlist } from '@/lib/useWatchlist';

export default function WatchlistPage() {
  const { watchlist } = useWatchlist();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWatchlistMovies() {
      if (watchlist.length === 0) {
        setMovies([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/media-by-ids?ids=${watchlist.join(',')}`);
        if (res.ok) {
          const data = await res.json();
          setMovies(data);
        }
      } catch (error) {
        console.error("Failed to fetch watchlist:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWatchlistMovies();
  }, [watchlist]);

  return (
    <div className="bg-[#10141A] text-white font-sans min-h-screen flex flex-col">
      <Head>
        <title>Избранное | KinoNest</title>
      </Head>
      
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 w-full">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
           <span className="text-brand-red">❤️</span> Избранное
           {!loading && movies.length > 0 && <span className="text-gray-500 text-lg font-normal">({movies.length})</span>}
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {loading ? (
             Array.from({ length: watchlist.length || 10 }).map((_, i) => <MediaCardSkeleton key={i} />)
          ) : movies.length > 0 ? (
             movies.map(item => (
               <MediaCard key={item.tmdb_id} item={item} />
             ))
          ) : (
             <div className="col-span-full text-center py-20 bg-gray-900/50 rounded-xl">
               <div className="text-6xl mb-4">💔</div>
               <h2 className="text-xl font-bold mb-2">Список пуст</h2>
               <p className="text-gray-400">Добавляйте фильмы и сериалы, чтобы не потерять их.</p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}