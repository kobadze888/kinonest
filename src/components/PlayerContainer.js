// src/components/PlayerContainer.js
import React, { useState, useEffect, useRef } from 'react';

const KinoBDPlayer = ({ kinopoiskId }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !kinopoiskId) return;

    containerRef.current.innerHTML = '';

    const playerDiv = document.createElement('div');
    playerDiv.id = 'kinobd';
    playerDiv.setAttribute('data-kinopoisk', kinopoiskId);
    containerRef.current.appendChild(playerDiv);

    const scriptId = 'kinobd-script-loader';
    const oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.src = 'https://kinobd.net/js/player_.js';
    script.id = scriptId;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, [kinopoiskId]);

  return <div ref={containerRef} className="w-full h-full relative bg-black" />;
};

export default function PlayerContainer({ kinopoisk_id, imdb_id, tmdb_id, title, trailer_url, type }) {
  const [activeTab, setActiveTab] = useState('main');
  const [refreshKey, setRefreshKey] = useState(0);

  const players = [
    { id: 'main', label: 'Фильм' },
    { id: 'trailer', label: 'Трейлер' },
  ];

  const handleTabClick = (tabId) => {
    if (activeTab === tabId) {
      setRefreshKey((prev) => prev + 1);
    } else {
      setActiveTab(tabId);
      setRefreshKey(0);
    }
  };

  const renderPlayer = () => {
    const contentKey = `${activeTab}-${refreshKey}`;

    if (activeTab === 'main') {
      return <KinoBDPlayer key={contentKey} kinopoiskId={kinopoisk_id} />;
    }

    if (activeTab === 'trailer') {
      if (!trailer_url) {
        return (
          <div key={contentKey} className="absolute inset-0 flex items-center justify-center bg-black text-gray-500">
            <p>Трейлер не найден</p>
          </div>
        );
      }
      
      let embedUrl = trailer_url;
      if (trailer_url.includes('watch?v=')) {
        embedUrl = trailer_url.replace('watch?v=', 'embed/');
      } else if (trailer_url.includes('youtu.be/')) {
        embedUrl = trailer_url.replace('youtu.be/', 'youtube.com/embed/');
      }

      return (
        <iframe 
          key={contentKey}
          src={`${embedUrl}?autoplay=0`} 
          className="absolute inset-0 w-full h-full" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      );
    }
    return null;
  };

  return (
    <div id="tv-player-container" className="w-full max-w-7xl mx-auto mb-0 px-0 sm:px-6 lg:px-8 relative z-10">
      <div className="bg-[#151a21] border-y md:border border-gray-800 md:rounded-xl overflow-hidden shadow-2xl flex flex-col">
         
         {/* Toolbar */}
         <div className="flex items-center justify-between px-4 py-3 bg-[#1a1f26] border-b border-gray-800 z-20 relative">
            <div className="flex items-center gap-2">
                <div className="flex bg-black/40 p-1 rounded-lg border border-gray-700/50">
                    {players.map((player) => (
                    <button
                        key={player.id}
                        onClick={() => handleTabClick(player.id)}
                        className={`
                        px-3 py-1.5 md:px-4 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wide transition-all duration-200
                        ${
                            activeTab === player.id
                            ? 'bg-brand-red text-white shadow-md'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }
                        `}
                    >
                        {player.label}
                    </button>
                    ))}
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                    title="Перезагрузить плеер"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
            </div>
         </div>

         {/* 💡 FIX: Оптимизация высоты для больших экранов.
            - Добавлен класс `player-wrapper`
            - xl:max-h-[65vh] (или 600px) не дает плееру стать слишком высоким
            - aspect-video сохраняет пропорции 16:9
            - mx-auto центрирует его
         */}
         <div className="player-wrapper w-full relative bg-black h-[360px] sm:h-[450px] lg:h-auto lg:aspect-video xl:max-h-[65vh] 2xl:max-h-[600px] z-10 mx-auto transition-all duration-300">
            {renderPlayer()}
         </div>

      </div>
    </div>
  );
}