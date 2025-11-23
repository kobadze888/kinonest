// src/components/PlayerContainer.js
import React, { useState, useEffect } from 'react';

export default function PlayerContainer({ kinopoisk_id, imdb_id, tmdb_id, title, trailer_url, type }) {
  const [activeTab, setActiveTab] = useState('main');

  const players = [
    { id: 'main', label: 'KinoBD (Основной)' },
    { id: 'trailer', label: 'Трейлер' },
    // { id: 'player2', label: 'Запасной' }, // აქ შეგიძლია დაამატო სხვა პლეერები
  ];

  // KinoBD სკრიპტის ჩატვირთვა მხოლოდ 'main' ტაბზე
  useEffect(() => {
    if (activeTab === 'main' && kinopoisk_id) {
      const scriptId = 'kinobd-player-script';
      const oldScript = document.getElementById(scriptId);
      if (oldScript) oldScript.remove();

      const script = document.createElement('script');
      script.src = 'https://kinobd.net/js/player_.js';
      script.id = scriptId;
      script.async = true;
      document.body.appendChild(script);

      return () => {
        const s = document.getElementById(scriptId);
        if (s) s.remove();
      };
    }
  }, [activeTab, kinopoisk_id]);

  const renderPlayer = () => {
    switch (activeTab) {
      case 'main':
        return (
            <div className="w-full h-full relative bg-black">
                <div data-kinopoisk={kinopoisk_id} id="kinobd" className="absolute inset-0 w-full h-full"></div>
            </div>
        );
      
      case 'trailer':
        if (!trailer_url) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-black text-gray-500">
                    <p>Трейлер не найден</p>
                </div>
            );
        }
        // YouTube embed ლინკად გადაკეთება (თუ უკვე არ არის)
        let embedUrl = trailer_url;
        if (trailer_url.includes('watch?v=')) {
             embedUrl = trailer_url.replace('watch?v=', 'embed/');
        } else if (trailer_url.includes('youtu.be/')) {
             embedUrl = trailer_url.replace('youtu.be/', 'youtube.com/embed/');
        }

        return (
            <iframe 
                src={`${embedUrl}?autoplay=1`} 
                className="w-full h-full" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
            ></iframe>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto mb-12 px-4 sm:px-6 lg:px-8">
      
      {/* ტაბები */}
      <div className="flex flex-wrap gap-3 mb-4">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => setActiveTab(player.id)}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 border ${
              activeTab === player.id
                ? 'bg-brand-red border-brand-red text-white shadow-lg shadow-red-900/40 scale-105'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white hover:border-gray-500'
            }`}
          >
            {player.label}
          </button>
        ))}
      </div>

      {/* პლეერის ჩარჩო (გასწორებული ზომებით) */}
      <div className="relative w-full aspect-video max-h-[650px] overflow-hidden bg-black shadow-2xl border border-gray-800 rounded-xl z-20">
         {renderPlayer()}
      </div>
    </div>
  );
}