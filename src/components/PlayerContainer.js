import React, { useState, useEffect, useRef } from 'react';

// 1. KinoBD Player (თქვენი ძირითადი პლეერი)
const KinoBDPlayer = ({ kinopoiskId }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !kinopoiskId) return;

    containerRef.current.innerHTML = '';

    const playerDiv = document.createElement('div');
    playerDiv.id = 'kinobd';
    playerDiv.setAttribute('data-kinopoisk', kinopoiskId);
    
    playerDiv.style.width = '100%';
    playerDiv.style.height = '100%';
    playerDiv.style.position = 'absolute';
    playerDiv.style.top = '0';
    playerDiv.style.left = '0';
    
    containerRef.current.appendChild(playerDiv);

    const script = document.createElement('script');
    script.src = 'https://kinobd.net/js/player_.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [kinopoiskId]);

  return <div ref={containerRef} className="w-full h-full relative bg-black" />;
};

// 2. 🆕 უსაფრთხო Iframe პლეერი (VideoCDN / Alloha)
// ეს არ იყენებს სკრიპტს, არამედ პირდაპირ ლინკს, რაც გამორიცხავს რედირექტებს.
const SafeIframePlayer = ({ kinopoiskId, title }) => {
  // ვიყენებთ VideoCDN-ს როგორც ყველაზე სანდო ალტერნატივას
  // თუ KP ID არ გვაქვს, ვეძებთ სათაურით
  const src = kinopoiskId 
    ? `https://videocdn.tv/v17/iframe?kp_id=${kinopoiskId}`
    : `https://videocdn.tv/v17/iframe?title=${encodeURIComponent(title)}`;

  return (
    <iframe
      src={src}
      className="w-full h-full absolute inset-0"
      frameBorder="0"
      allowFullScreen
      // 🛡️ SANDBOX: ეს არის მთავარი დაცვა!
      // ეს კრძალავს პლეერს თქვენი საიტის გადამისამართებისგან (allow-top-navigation-ის გარეშე)
      sandbox="allow-scripts allow-same-origin allow-presentation allow-fullscreen allow-forms"
      title="Alternative Player"
    />
  );
};

export default function PlayerContainer({ kinopoisk_id, imdb_id, tmdb_id, title, trailer_url }) {
  const [activeTab, setActiveTab] = useState('main');
  const [refreshKey, setRefreshKey] = useState(0);

  const players = [
    { id: 'main', label: 'Плеер 1' }, // KinoBD
    { id: 'alt', label: 'Плеер 2' },  // VideoCDN (Safe)
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

    // პლეერი 1 (KinoBD - Script)
    if (activeTab === 'main') {
      return <KinoBDPlayer key={contentKey} kinopoiskId={kinopoisk_id} />;
    }

    // პლეერი 2 (VideoCDN - Iframe)
    if (activeTab === 'alt') {
      return (
        <SafeIframePlayer 
            key={contentKey} 
            kinopoiskId={kinopoisk_id} 
            title={title} 
        />
      );
    }

    // ტრეილერი
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
         <div className="flex items-center justify-between px-4 py-3 bg-[#1a1f26] border-b border-gray-800 relative z-[50]">
            <div className="flex items-center gap-2">
                <div className="flex bg-black/40 p-1 rounded-lg border border-gray-700/50">
                    {players.map((player) => (
                    <button
                        key={player.id}
                        onClick={() => handleTabClick(player.id)}
                        className={`
                        px-3 py-1.5 md:px-4 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wide transition-all duration-200 cursor-pointer
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
                    className="text-gray-400 hover:text-white transition-colors p-1 cursor-pointer"
                    title="Перезагрузить плеер"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
            </div>
         </div>

         {/* კონტეინერი */}
         <div className="player-wrapper relative w-full bg-black z-10 overflow-hidden">
            {renderPlayer()}
         </div>

      </div>
    </div>
  );
}