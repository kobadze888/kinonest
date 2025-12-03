import React, { useState, useEffect, useRef } from 'react';

// --- 1. KinoBD Player ---
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

// --- 2. VideoSeed Player (Cached) ---
const VideoSeedPlayer = ({ kinopoiskId, type }) => {
  const [iframeUrl, setIframeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true); setError(false);
    async function fetchPlayer() {
      try {
        const res = await fetch(`/api/get-videoseed-link?kp_id=${kinopoiskId}&type=${type}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setIframeUrl(data.link);
        } else if (isMounted) setError(true);
      } catch (e) { if (isMounted) setError(true); }
      finally { if (isMounted) setLoading(false); }
    }
    if (kinopoiskId) fetchPlayer();
    return () => { isMounted = false; };
  }, [kinopoiskId, type]);

  if (loading) return <div className="absolute inset-0 flex items-center justify-center bg-black text-gray-400"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-red"></div></div>;
  if (error || !iframeUrl) return <div className="absolute inset-0 flex items-center justify-center bg-black text-gray-500"><p>Плеер не найден (VideoSeed)</p></div>;
  return <iframe src={iframeUrl} className="absolute inset-0 w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>;
};

// --- 3. Kodik Player (Cached) ---
const KodikPlayer = ({ kinopoiskId }) => {
  const [iframeUrl, setIframeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true); setError(false);
    async function fetchPlayer() {
      try {
        const res = await fetch(`/api/get-kodik-link?kp_id=${kinopoiskId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setIframeUrl(data.link);
        } else if (isMounted) setError(true);
      } catch (e) { if (isMounted) setError(true); }
      finally { if (isMounted) setLoading(false); }
    }
    if (kinopoiskId) fetchPlayer();
    return () => { isMounted = false; };
  }, [kinopoiskId]);

  if (loading) return <div className="absolute inset-0 flex items-center justify-center bg-black text-gray-400"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-red"></div></div>;
  if (error || !iframeUrl) return <div className="absolute inset-0 flex items-center justify-center bg-black text-gray-500"><p>Плеер не найден (Kodik)</p></div>;
  return <iframe src={iframeUrl} className="absolute inset-0 w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>;
};

// --- 4. FlixCDN Player (Cached + No Black Screen) ---
const FlixCDNPlayer = ({ kinopoiskId, imdbId }) => {
  const [iframeUrl, setIframeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true); setError(false);

    async function fetchPlayer() {
      if (!kinopoiskId && !imdbId) {
        if (isMounted) { setError(true); setLoading(false); }
        return;
      }

      try {
        const queryParams = new URLSearchParams();
        if (kinopoiskId) queryParams.append('kp_id', kinopoiskId);
        if (imdbId) queryParams.append('imdb_id', imdbId);

        // აქ უკვე მიმართავს ჩვენს დაქეშილ API-ს
        const res = await fetch(`/api/get-flixcdn-link?${queryParams.toString()}`);

        if (res.ok) {
          const data = await res.json();
          if (isMounted) setIframeUrl(data.link);
        } else {
          if (isMounted) setError(true);
        }
      } catch (e) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPlayer();
    return () => { isMounted = false; };
  }, [kinopoiskId, imdbId]);

  if (loading) return <div className="absolute inset-0 flex items-center justify-center bg-black text-gray-400"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-red"></div></div>;

  if (error || !iframeUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black text-gray-500 flex-col gap-2">
        <p>Плеер не найден (FlixCDN)</p>
      </div>
    );
  }

  return <iframe src={iframeUrl} className="absolute inset-0 w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>;
};

// --- Main Container ---
export default function PlayerContainer({ kinopoisk_id, imdb_id, tmdb_id, title, trailer_url, type }) {
  const [activeTab, setActiveTab] = useState('videoseed');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modified to new order:
  const players = [
    { id: 'videoseed', label: 'Плеер 1' }, // VideoSeed
    { id: 'flixcdn', label: 'Плеер 2' },   // FlixCDN
    { id: 'kodik', label: 'Плеер 3' },     // Kodik
    { id: 'main', label: 'Плеер 4' },      // KinoBD (now Player 4)
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

    if (activeTab === 'main') return <KinoBDPlayer key={contentKey} kinopoiskId={kinopoisk_id} />;
    if (activeTab === 'videoseed') return <VideoSeedPlayer key={contentKey} kinopoiskId={kinopoisk_id} type={type} />;
    if (activeTab === 'kodik') return <KodikPlayer key={contentKey} kinopoiskId={kinopoisk_id} />;
    if (activeTab === 'flixcdn') return <FlixCDNPlayer key={contentKey} kinopoiskId={kinopoisk_id} imdbId={imdb_id} />;

    if (activeTab === 'trailer') {
      if (!trailer_url) return <div key={contentKey} className="absolute inset-0 flex items-center justify-center bg-black text-gray-500"><p>Трейлер не найден</p></div>;
      let embedUrl = trailer_url;
      if (trailer_url.includes('watch?v=')) embedUrl = trailer_url.replace('watch?v=', 'embed/');
      else if (trailer_url.includes('youtu.be/')) embedUrl = trailer_url.replace('youtu.be/', 'youtube.com/embed/');
      return <iframe key={contentKey} src={`${embedUrl}?autoplay=0`} className="absolute inset-0 w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>;
    }
    return null;
  };

  return (
    <div id="tv-player-container" className="w-full max-w-7xl mx-auto mb-0 px-0 sm:px-6 lg:px-8 relative z-10">
      <div className="bg-[#151a21] border-y md:border border-gray-800 md:rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-[#1a1f26] border-b border-gray-800 relative z-[50]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex bg-black/40 p-1 rounded-lg border border-gray-700/50 whitespace-nowrap">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleTabClick(player.id)}
                  className={`
                        px-3 py-1.5 md:px-4 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wide transition-all duration-200 cursor-pointer
                        ${activeTab === player.id
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
          <div className="flex items-center gap-3 pl-2">
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
        <div className="player-wrapper relative w-full bg-black z-10 overflow-hidden">
          {renderPlayer()}
        </div>
      </div>
    </div>
  );
}