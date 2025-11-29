// src/components/PlayerContainer.js
import React, { useState, useEffect, useRef } from 'react';

// --- КОМПОНЕНТЫ ПЛЕЕРОВ ---

// 1. Kodik (Официальный плеер через ваш токен)
const KodikPlayer = ({ kinopoiskId, title, imdbId }) => {
  // Используем токен, который был в ваших скриптах
  const token = 'b95c138cc28a8377412303d604251230'; 
  
  // Формируем URL поиска плеера
  let src = `https://kodik.info/find-player?token=${token}&types=film,serial,anime`;
  if (kinopoiskId) src += `&kinopoiskID=${kinopoiskId}`;
  else if (imdbId) src += `&imdbID=${imdbId}`;
  else src += `&title=${encodeURIComponent(title)}`;

  return (
    <iframe 
      src={src} 
      className="w-full h-full absolute inset-0 border-none"
      allowFullScreen 
      allow="autoplay *; fullscreen *"
      title="Kodik"
    />
  );
};

// 2. Collaps (Стабильный плеер)
const CollapsPlayer = ({ kinopoiskId }) => {
  if (!kinopoiskId) return <div className="flex items-center justify-center h-full text-gray-500">Нет ID Кинопоиска</div>;
  
  return (
    <iframe 
      src={`https://api.hp-api.com/embed/${kinopoiskId}`} 
      className="w-full h-full absolute inset-0 border-none"
      allowFullScreen 
      allow="autoplay *; fullscreen *"
      title="Collaps"
    />
  );
};

// 3. VideoCDN (Прямой плеер)
const VideoCDNPlayer = ({ kinopoiskId, title }) => {
  const src = kinopoiskId 
    ? `https://videocdn.tv/v17/iframe?kp_id=${kinopoiskId}` 
    : `https://videocdn.tv/v17/iframe?title=${encodeURIComponent(title)}`;

  return (
    <iframe 
      src={src} 
      className="w-full h-full absolute inset-0 border-none"
      allowFullScreen 
      allow="autoplay *; fullscreen *"
      title="VideoCDN"
    />
  );
};

// 4. KinoBD (Ваш старый плеер, через скрипт)
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
    };
  }, [kinopoiskId]);

  return <div ref={containerRef} className="w-full h-full relative bg-black" />;
};

// --- ГЛАВНЫЙ КОНТЕЙНЕР ---

export default function PlayerContainer({ kinopoisk_id, imdb_id, tmdb_id, title, trailer_url }) {
  const [activeTab, setActiveTab] = useState('kodik'); // Kodik по умолчанию
  const [refreshKey, setRefreshKey] = useState(0);

  const players = [
    { id: 'kodik', label: 'Kodik (Лучший)' },
    { id: 'collaps', label: 'Collaps' },
    { id: 'videocdn', label: 'VideoCDN' },
    { id: 'kinobd', label: 'KinoBD' },
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
    const key = `${activeTab}-${refreshKey}`;

    switch (activeTab) {
      case 'kodik':
        return <KodikPlayer key={key} kinopoiskId={kinopoisk_id} imdbId={imdb_id} title={title} />;
      case 'collaps':
        return <CollapsPlayer key={key} kinopoiskId={kinopoisk_id} />;
      case 'videocdn':
        return <VideoCDNPlayer key={key} kinopoiskId={kinopoisk_id} title={title} />;
      case 'kinobd':
        return <KinoBDPlayer key={key} kinopoiskId={kinopoisk_id} />;
      case 'trailer':
        if (!trailer_url) return <div className="flex items-center justify-center h-full text-gray-500">Трейлер не найден</div>;
        let embedUrl = trailer_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
        return (
          <iframe 
            key={key}
            src={`${embedUrl}?autoplay=0`} 
            className="w-full h-full absolute inset-0 border-none"
            allowFullScreen
          />
        );
      default:
        return null;
    }
  };

  return (
    <div id="tv-player-container" className="w-full max-w-7xl mx-auto mb-0 px-0 sm:px-6 lg:px-8 relative z-10">
      <div className="bg-[#151a21] border-y md:border border-gray-800 md:rounded-xl overflow-hidden shadow-2xl flex flex-col">
         
         {/* Меню переключения */}
         <div className="flex items-center justify-between px-4 py-3 bg-[#1a1f26] border-b border-gray-800 relative z-[50]">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
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
            
            {/* Кнопка перезагрузки */}
            <div className="flex items-center gap-3">
                <button onClick={() => setRefreshKey(prev => prev + 1)} className="text-gray-400 hover:text-white transition-colors p-1 cursor-pointer" title="Перезагрузить">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
            </div>
         </div>

         {/* Контейнер: строгая фиксация 16:9 без скроллов */}
         <div className="player-wrapper relative w-full bg-black z-10 overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {renderPlayer()}
         </div>

      </div>
    </div>
  );
}