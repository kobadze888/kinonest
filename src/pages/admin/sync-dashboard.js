import React, { useState, useRef, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Header from '@/components/Header';
import Link from 'next/link';

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) return { redirect: { destination: '/api/auth/signin', permanent: false } };
  return { props: { user: session.user } };
}

export default function SyncDashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ added: 0, skipped: 0, page: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  
  // 🔘 სინქრონიზაციის ტიპის არჩევა
  const [syncMode, setSyncMode] = useState('new'); // 'new', 'archive', 'videoseed'

  const stopRef = useRef(false);
  const logsEndRef = useRef(null);

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const startSync = async () => {
    if (isRunning) return;
    setIsRunning(true);
    stopRef.current = false;
    
    // ვირჩევთ სწორ API-ს
    let apiEndpoint = '';
    let modeTitle = '';

    if (syncMode === 'new') {
        apiEndpoint = '/api/admin/sync-run';
        modeTitle = "🚀 ახალი ფილმები (TMDB)";
    } else if (syncMode === 'archive') {
        apiEndpoint = '/api/admin/sync-archive';
        modeTitle = "📜 არქივი (1990-2019)";
    } else if (syncMode === 'videoseed') {
        apiEndpoint = '/api/admin/sync-videoseed';
        modeTitle = "🧩 Videoseed (სრული ბაზა)";
    }

    setLogs([`${modeTitle} - სინქრონიზაცია დაიწყო...`, '---']);
    
    let page = currentPage;

    while (!stopRef.current) {
      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page }),
        });

        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        
        const data = await res.json();
        
        if (data.logs && data.logs.length > 0) {
            data.logs.forEach(log => addLog(log));
        } else {
            addLog(`ℹ️ გვერდი ${page}: შედეგი არ არის.`);
        }

        setStats(prev => ({
            added: prev.added + (data.added || 0),
            skipped: prev.skipped + (data.skipped || 0),
            page: page
        }));

        if (data.lastPage && page >= data.lastPage) {
            addLog('🏁 სინქრონიზაცია დასრულდა! (ბოლო გვერდი)');
            setIsRunning(false);
            break;
        }

        // თუ Videoseed-ია და მონაცემი არ მოვიდა, ვწყვეტთ
        if (syncMode === 'videoseed' && data.added === 0 && data.skipped === 0 && data.logs.length <= 1) {
             addLog('⚠️ მონაცემები შეწყდა. სინქრონიზაცია ჩერდება.');
             setIsRunning(false);
             break;
        }

        page++;
        setCurrentPage(page);
        await new Promise(r => setTimeout(r, 1000));

      } catch (error) {
        addLog(`❌ შეცდომა: ${error.message}`);
        addLog('⚠️ 5 წამი პაუზა და თავიდან ცდა...');
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    setIsRunning(false);
  };

  const stopSync = () => {
    stopRef.current = true;
    addLog('🛑 გაჩერების ბრძანება მიღებულია...');
  };

  return (
    <div className="bg-[#10141A] text-white min-h-screen font-sans">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 pt-32 pb-20">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">სინქრონიზაციის მართვა</h1>
            <Link href="/admin" className="text-gray-400 hover:text-white">
                &larr; უკან ადმინკაში
            </Link>
        </div>

        {/* Controls & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            {/* Control Panel */}
            <div className="bg-[#151a21] p-6 rounded-xl border border-gray-800 shadow-lg">
                <h2 className="text-lg font-bold mb-4">პარამეტრები</h2>
                <div className="flex flex-col gap-4">
                    
                    {/* 🔘 რეჟიმის არჩევა */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-400">აირჩიე რეჟიმი:</label>
                        <select 
                            value={syncMode} 
                            onChange={(e) => setSyncMode(e.target.value)}
                            disabled={isRunning}
                            className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-brand-red outline-none"
                        >
                            <option value="new">🚀 ახალი (TMDB 2020+)</option>
                            <option value="videoseed">🧩 Videoseed (Source)</option> {/* ✅ ახალი ოფცია */}
                            <option value="archive">📜 არქივი (1990-2019)</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>დაწყების გვერდი:</span>
                        <input 
                            type="number" 
                            value={currentPage} 
                            onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                            disabled={isRunning}
                            className="w-20 bg-black/30 border border-gray-700 rounded px-2 py-1 text-white text-center"
                        />
                    </div>
                    
                    {!isRunning ? (
                        <button 
                            onClick={startSync}
                            className={`w-full font-bold py-3 rounded-lg transition shadow-lg flex items-center justify-center gap-2 ${
                                syncMode === 'videoseed' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-900/20' : 
                                syncMode === 'new' ? 'bg-green-600 hover:bg-green-700 shadow-green-900/20' : 
                                'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-900/20 text-white'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            დაწყება
                        </button>
                    ) : (
                        <button 
                            onClick={stopSync}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-red-900/20 animate-pulse"
                        >
                            გაჩერება
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Panel */}
            <div className="md:col-span-2 bg-[#151a21] p-6 rounded-xl border border-gray-800 shadow-lg flex items-center justify-around">
                <div className="text-center">
                    <p className="text-gray-500 text-sm uppercase font-bold mb-1">გვერდი</p>
                    <p className="text-4xl font-mono text-blue-400">{stats.page}</p>
                </div>
                <div className="text-center">
                    <p className="text-gray-500 text-sm uppercase font-bold mb-1">დაემატა</p>
                    <p className="text-4xl font-mono text-green-400">+{stats.added}</p>
                </div>
                <div className="text-center">
                    <p className="text-gray-500 text-sm uppercase font-bold mb-1">გამოტოვა</p>
                    <p className="text-4xl font-mono text-gray-400">{stats.skipped}</p>
                </div>
            </div>
        </div>

        {/* Live Logs */}
        <div className="bg-black rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-2 text-xs text-gray-400 font-mono">Live Logs</span>
            </div>
            <div className="h-96 overflow-y-auto p-4 font-mono text-sm space-y-1">
                {logs.length === 0 && <p className="text-gray-600">...მზადყოფნაში...</p>}
                {logs.map((log, i) => (
                    <div key={i} className={`
                        ${log.includes('✅') ? 'text-green-400' : ''}
                        ${log.includes('❌') ? 'text-red-400' : ''}
                        ${log.includes('⚠️') ? 'text-yellow-400' : ''}
                        ${log.includes('📄') || log.includes('🧩') ? 'text-blue-400 mt-4 border-t border-gray-800 pt-2' : 'text-gray-300'}
                    `}>
                        {log}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        </div>

      </main>
    </div>
  );
}