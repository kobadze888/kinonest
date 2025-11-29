// src/components/PlayerContainer.js
import React, { useState, useEffect, useRef } from 'react';

// 1. KinoBD Player (ძველი, საიმედო)
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

// 2. 🆕 FIX: Sandboxed KinoBox (CSS Lock - სქროლის სრული აკრძალვა)
const SandboxedKinoBox = ({ kinopoiskId, imdbId, tmdbId, title }) => {
  
  const iframeHtml = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        /* სრული რესეტი */
        * { box-sizing: border-box; outline: none; }
        
        html, body {
            margin: 0;
            padding: 0;
            width: 100vw;  /* მხოლოდ ხილული სიგანე */
            height: 100vh; /* მხოლოდ ხილული სიმაღლე */
            overflow: hidden !important; /* სქროლის აკრძალვა */
            background-color: #000;
            position: fixed; /* ფიქსაცია */
            top: 0; left: 0;
        }
        
        /* სქროლბარის დამალვა */
        ::-webkit-scrollbar { display: none; width: 0; height: 0; }

        /* პლეერის იძულებითი გაწელვა */
        .kinobox_player {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            width: 100% !important;
            height: 100% !important;
            border: none;
            z-index: 10;
        }
      </style>
    </head>
    <body>
      <div class="kinobox_player"></div>
      <script src="https://kinobox.tv/kinobox.min.js"></script>
      <script>
        new Kinobox('.kinobox_player', {
          search: {
            kinopoisk: '${kinopoiskId || ''}',
            imdb: '${imdbId || ''}',
            tmdb: '${tmdbId || ''}',
            title: '${title ? title.replace(/'/g, "\\'") : ''}'
          },
          menu: {
            enable: true,
            default: 'menu_list',
            mobile: 'menu_button',
            format: '{N} :: {T} ({Q})'
          },
          players: {},
          params: {
            all: { poster: '' }
          }
        }).init();
      </script>
    </body>
    </html>
  `;

  return (
    <iframe
      srcDoc={iframeHtml}
      className="w-full h-full absolute inset-0 block border-none overflow-hidden"
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      frameBorder="0"
      allowFullScreen
      sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-fullscreen"
      title="KinoBox Player"
      scrolling="no"
    />
  );
};

// 3. 🆕 Alloha Player (VideoCDN-ის ნაცვლად)
const AllohaPlayer = ({ kinopoiskId }) => {
    if (!kinopoiskId) return <div className="text-gray-500 flex justify-center items-center h-full">Нет KP ID</div>;

    // Alloha-ს ოფიციალური Embed
    const src = `https://api.linktodo.ws/embed/kp/${kinopoiskId}`;

    return (
        <iframe 
            src={src}
            className="w-full h-full absolute inset-0 border-none overflow-hidden"
            frameBorder="0"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-fullscreen allow-forms"
            title="Alloha"
            scrolling="no"
        />
    );
}

export default function PlayerContainer({ kinopoisk_id, imdb_id, tmdb_id, title, trailer_url }) {
  const [activeTab, setActiveTab] = useState('kinobox'); 
  const [refreshKey, setRefreshKey] = useState(0);

  const players = [
    { id: 'kinobox', label: 'Мульти (KinoBox)' },
    { id: 'alloha', label: 'Плеер 2 (Alloha)' },
    { id: 'kinobd', label: 'Плеер 3 (KinoBD)' },
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

    if (activeTab === 'kinobox') {
      return (
        <SandboxedKinoBox 
            key={contentKey}
            kinopoiskId={kinopoisk_id} 
            imdbId={imdb_id} 
            tmdbId={tmdb_id} 
            title={title} 
        />
      );
    }

    if (activeTab === 'alloha') {
        return <AllohaPlayer key={contentKey} kinopoiskId={kinopoisk_id} />;
    }

    if (activeTab === 'kinobd') {
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
         <div className="flex items-center justify-between px-4 py-3 bg-[#1a1f26] border-b border-gray-800 relative z-[50]">
            <div className="flex items-center gap-2 overflow-x-auto">
                <div className="flex bg-black/40 p-1 rounded-lg border border-gray-700/50">
                    {players.map((player) => (
                    <button
                        key={player.id}
                        onClick={() => handleTabClick(player.id)}
                        className={`
                        px-3 py-1.5 md:px-4 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wide transition-all duration-200 cursor-pointer whitespace-nowrap
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
         <div className="player-wrapper relative w-full bg-black z-10 overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {renderPlayer()}
         </div>

      </div>
    </div>
  );
}