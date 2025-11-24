import React, { useState, useEffect, useRef } from 'react';

// დამხმარე კომპონენტი KinoBD პლეერისთვის (React.memo-ს გარეშე, რომ არ გაიჭედოს)
const KinoBDPlayer = ({ kinopoiskId }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !kinopoiskId) return;

    // 1. გასუფთავება
    containerRef.current.innerHTML = '';

    // 2. ელემენტის შექმნა
    const playerDiv = document.createElement('div');
    playerDiv.id = 'kinobd';
    playerDiv.setAttribute('data-kinopoisk', kinopoiskId);
    // 💡 მნიშვნელოვანი: ზომები 100%-ზე, რომ მშობელს მოერგოს
    playerDiv.style.width = '100%';
    playerDiv.style.height = '100%';
    playerDiv.style.borderRadius = '8px'; // ოდნავ მომრგვალება
    containerRef.current.appendChild(playerDiv);

    // 3. სკრიპტის ჩატვირთვა
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

  return <div ref={containerRef} className="w-full h-full bg-black rounded-xl overflow-hidden" />;
};

export default function PlayerContainer({ kinopoisk_id, trailer_url }) {
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
          <div className="w-full h-full flex items-center justify-center bg-black text-gray-500">
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
          className="w-full h-full rounded-xl" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-7xl mx-auto mb-12 px-2 sm:px-4 lg:px-8">
      
      <div className="bg-[#151a21] border border-gray-800 rounded-xl shadow-2xl">
         
         {/* ჰედერი (Toolbar) */}
         <div className="flex items-center justify-between px-3 py-2 bg-[#1a1f26] border-b border-gray-800 rounded-t-xl">
            <div className="flex items-center gap-2">
                <div className="flex bg-black/40 p-1 rounded-lg border border-gray-700/50">
                    {players.map((player) => (
                    <button
                        key={player.id}
                        onClick={() => handleTabClick(player.id)}
                        className={`
                        px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-red
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
            <div className="text-gray-600 text-[10px] sm:text-xs font-medium hidden sm:block select-none">
                KinoNest Player
            </div>
         </div>

         {/* 💡 აქ არის მთავარი შესწორება ზომაზე:
            1. aspect-video: ინარჩუნებს 16:9 პროპორციას.
            2. max-h-[75vh]: არ აძლევს უფლებას, რომ ეკრანის 75%-ზე მეტი დაიკავოს სიმაღლეში (სმარტ ტივიზე ეს მნიშვნელოვანია).
         */}
         <div className="relative w-full bg-black aspect-video max-h-[60vh] lg:max-h-[75vh] mx-auto">
            {renderPlayer()}
         </div>

      </div>
    </div>
  );
}