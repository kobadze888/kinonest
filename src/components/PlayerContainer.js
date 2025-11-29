// src/components/PlayerContainer.js
import React, { useState, useEffect, useRef } from 'react';

// --- Iframe-ის სტილი (სქროლის გარეშე) ---
const iframeStyle = {
  width: '100%',
  height: '100%',
  border: 'none',
  overflow: 'hidden',
  position: 'absolute',
  top: 0,
  left: 0
};

// 1. Alloha (Kinogo-ს მთავარი პლეერი)
const AllohaPlayer = ({ kinopoiskId, title }) => {
  // თუ KP ID არ გვაქვს, სახელით ვეძებთ
  const src = kinopoiskId 
    ? `https://api.linktodo.ws/embed/kp/${kinopoiskId}`
    : `https://api.linktodo.ws/embed/search?q=${encodeURIComponent(title)}`;

  return <iframe src={src} style={iframeStyle} allowFullScreen title="Alloha" />;
};

// 2. Collaps (სწრაფი პლეერი)
const CollapsPlayer = ({ kinopoiskId, imdbId }) => {
  if (!kinopoiskId && !imdbId) return <div className="flex justify-center items-center h-full text-gray-500">ID не найден</div>;
  
  // Collaps ხშირად იყენებს embed/kp ან embed/imdb
  const src = kinopoiskId 
    ? `https://api.hp-api.com/embed/kp/${kinopoiskId}`
    : `https://api.hp-api.com/embed/imdb/${imdbId}`;

  return <iframe src={src} style={iframeStyle} allowFullScreen title="Collaps" />;
};

// 3. Kodik (სერიალები/ანიმე) - თქვენი ტოკენით
const KodikPlayer = ({ kinopoiskId, imdbId, title }) => {
  const token = 'b95c138cc28a8377412303d604251230'; // თქვენი ტოკენი
  let src = `https://kodik.info/find-player?token=${token}&types=film,serial,anime`;
  
  if (kinopoiskId) src += `&kinopoiskID=${kinopoiskId}`;
  else if (imdbId) src += `&imdbID=${imdbId}`;
  else src += `&title=${encodeURIComponent(title)}`;

  return <iframe src={src} style={iframeStyle} allowFullScreen title="Kodik" />;
};

// 4. VideoCDN (რეზერვი)
const VideoCDNPlayer = ({ kinopoiskId, title }) => {
  const src = kinopoiskId 
    ? `https://videocdn.tv/v17/iframe?kp_id=${kinopoiskId}`
    : `https://videocdn.tv/v17/iframe?title=${encodeURIComponent(title)}`;

  return <iframe src={src} style={iframeStyle} allowFullScreen title="VideoCDN" />;
};

// 5. KinoBD (თქვენი ძველი პლეერი)
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

export default function PlayerContainer({ kinopoisk_id, imdb_id, tmdb_id, title, trailer_url }) {
  // დეფოლტად Alloha (როგორც Kinogo-ზე)
  const [activeTab, setActiveTab] = useState('alloha'); 
  const [refreshKey, setRefreshKey] = useState(0);

  const players = [
    { id: 'alloha', label: 'Плеер 1 (Alloha)' },   // Kinogo Main
    { id: 'collaps', label: 'Плеер 2 (Collaps)' },  // Kinogo Alt
    { id: 'kodik', label: 'Плеер 3 (Kodik)' },      // For Series
    { id: 'videocdn', label: 'Плеер 4 (CDN)' },     // Backup
    { id: 'kinobd', label: 'Плеер 5 (KinoBD)' },    // Backup
    { id: 'trailer', label: 'Трейлер' },
  ];

  const handleTabClick = (tabId) => {
    if (activeTab === tabId) setRefreshKey(prev => prev + 1);
    else { setActiveTab(tabId); setRefreshKey(0); }
  };

  const renderPlayer = () => {
    const key = `${activeTab}-${refreshKey}`;

    switch (activeTab) {
      case 'alloha': return <AllohaPlayer key={key} kinopoiskId={kinopoisk_id} title={title} />;
      case 'collaps': return <CollapsPlayer key={key} kinopoiskId={kinopoisk_id} imdbId={imdb_id} />;
      case 'kodik': return <KodikPlayer key={key} kinopoiskId={kinopoisk_id} imdbId={imdb_id} title={title} />;
      case 'videocdn': return <VideoCDNPlayer key={key} kinopoiskId={kinopoisk_id} title={title} />;
      case 'kinobd': return <KinoBDPlayer key={key} kinopoiskId={kinopoisk_id} />;
      case 'trailer':
        if (!trailer_url) return <div className="flex justify-center items-center h-full text-gray-500">Трейлер не найден</div>;
        let embedUrl = trailer_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
        return <iframe key={key} src={`${embedUrl}?autoplay=0`} style={iframeStyle} allowFullScreen />;
      default: return null;
    }
  };

  return (
    <div id="tv-player-container" className="w-full max-w-7xl mx-auto mb-0 px-0 sm:px-6 lg:px-8 relative z-10">
      <div className="bg-[#151a21] border-y md:border border-gray-800 md:rounded-xl overflow-hidden shadow-2xl flex flex-col">
         
         {/* მენიუ */}
         <div className="flex items-center justify-between px-4 py-3 bg-[#1a1f26] border-b border-gray-800 relative z-[50]">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                <div className="flex bg-black/40 p-1 rounded-lg border border-gray-700/50">
                    {players.map((player) => (
                    <button
                        key={player.id}
                        onClick={() => handleTabClick(player.id)}
                        className={`
                        px-3 py-1.5 md:px-4 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wide transition-all duration-200 cursor-pointer whitespace-nowrap
                        ${activeTab === player.id ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                        `}
                    >
                        {player.label}
                    </button>
                    ))}
                </div>
            </div>
            
            <button onClick={() => setRefreshKey(prev => prev + 1)} className="text-gray-400 hover:text-white p-1" title="Перезагрузить">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
            </button>
         </div>

         {/* პლეერის კონტეინერი (Aspect Ratio 16:9) */}
         <div className="player-wrapper relative w-full bg-black z-10 overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {renderPlayer()}
         </div>

      </div>
    </div>
  );
}