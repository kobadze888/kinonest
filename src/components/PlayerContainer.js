// src/components/PlayerContainer.js
import React, { useState, useEffect, useRef } from 'react';

// 💡 დამხმარე კომპონენტი KinoBD პლეერისთვის (უსაფრთხო იზოლაცია)
// ეს კომპონენტი ხელით მართავს DOM-ს, რათა თავიდან ავიცილოთ React-ის შეცდომები
const KinoBDPlayer = ({ kinopoiskId }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !kinopoiskId) return;

    // 1. გასუფთავება: ვშლით ყველაფერს კონტეინერში (თუ რამე დარჩა)
    containerRef.current.innerHTML = '';

    // 2. ელემენტის შექმნა: ხელით ვქმნით div-ს პლეერისთვის
    const playerDiv = document.createElement('div');
    playerDiv.id = 'kinobd';
    playerDiv.setAttribute('data-kinopoisk', kinopoiskId);
    playerDiv.style.width = '100%';
    playerDiv.style.height = '100%';
    containerRef.current.appendChild(playerDiv);

    // 3. სკრიპტის ჩატვირთვა
    const scriptId = 'kinobd-script-loader';
    // ძველი სკრიპტის წაშლა (თუ არსებობს), რომ თავიდან ჩაიტვირთოს
    const oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.src = 'https://kinobd.net/js/player_.js';
    script.id = scriptId;
    script.async = true;
    document.body.appendChild(script);

    // Cleanup: კომპონენტის წაშლისას (ან ტაბის გადართვისას) ვასუფთავებთ ყველაფერს
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''; // ვშლით პლეერს
      }
      const s = document.getElementById(scriptId);
      if (s) s.remove(); // ვშლით სკრიპტს
    };
  }, [kinopoiskId]);

  // React-ს ვეუბნებით, რომ ამ div-ს არ შეეხოს (ჩვენ ვმართავთ useEffect-იდან)
  return <div ref={containerRef} className="w-full h-full bg-black" />;
};

export default function PlayerContainer({ kinopoisk_id, imdb_id, tmdb_id, title, trailer_url, type }) {
  const [activeTab, setActiveTab] = useState('main');
  const [refreshKey, setRefreshKey] = useState(0); // 🔄 რესტარტის გასაღები

  const players = [
    { id: 'main', label: 'Фильм' },
    { id: 'trailer', label: 'Трейлер' },
  ];

  const handleTabClick = (tabId) => {
    if (activeTab === tabId) {
      // თუ იგივე ტაბს ვაჭერთ -> ვარეფრეშებთ (შავი ეკრანის გასასწორებლად)
      setRefreshKey((prev) => prev + 1);
    } else {
      // თუ სხვა ტაბზე გადავდივართ
      setActiveTab(tabId);
      setRefreshKey(0); // რესეტი
    }
  };

  const renderPlayer = () => {
    // 💡 key={refreshKey} აიძულებს React-ს, რომ კომპონენტი თავიდან შექმნას
    // ეს არის "ხელოვნური გადატვირთვა"
    const contentKey = `${activeTab}-${refreshKey}`;

    if (activeTab === 'main') {
      return <KinoBDPlayer key={contentKey} kinopoiskId={kinopoisk_id} />;
    }

    if (activeTab === 'trailer') {
      if (!trailer_url) {
        return (
          <div key={contentKey} className="w-full h-full flex items-center justify-center bg-black text-gray-500">
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
          className="w-full h-full" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-7xl mx-auto mb-12 px-4 sm:px-6 lg:px-8">
      
      <div className="bg-[#151a21] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
         
         {/* ჰედერი (Toolbar) */}
         <div className="flex items-center justify-between px-4 py-3 bg-[#1a1f26] border-b border-gray-800">
            <div className="flex items-center gap-2">
                <div className="flex bg-black/40 p-1 rounded-lg border border-gray-700/50">
                    {players.map((player) => (
                    <button
                        key={player.id}
                        onClick={() => handleTabClick(player.id)}
                        className={`
                        px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all duration-200
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
            <div className="text-gray-500 text-xs font-medium hidden sm:block select-none">
                KinoNest Player
            </div>
         </div>

         {/* პლეერის სივრცე */}
         <div className="relative w-full aspect-video bg-black">
            {renderPlayer()}
         </div>

      </div>
    </div>
  );
}