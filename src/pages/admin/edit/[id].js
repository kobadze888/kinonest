import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Link from 'next/link';

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) return { redirect: { destination: '/api/auth/signin', permanent: false } };

  const { id } = context.params;

  try {
    const res = await query(`
      SELECT tmdb_id, kinopoisk_id, title_ru, title_en, trailer_url, poster_path, backdrop_path, release_year, type, is_hidden
      FROM media
      WHERE tmdb_id = $1
    `, [id]);

    if (res.rows.length === 0) return { notFound: true };

    const movie = JSON.parse(JSON.stringify(res.rows[0]));
    return { props: { movie } };
  } catch (e) {
    return { notFound: true };
  }
}

export default function EditPage({ movie }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    tmdb_id: movie.tmdb_id,
    kinopoisk_id: movie.kinopoisk_id || '',
    title_ru: movie.title_ru || '',
    trailer_url: movie.trailer_url || '',
    poster_path: movie.poster_path || '',
    backdrop_path: movie.backdrop_path || '',
    is_hidden: movie.is_hidden || false, // ახალი ველი
  });

  const [status, setStatus] = useState({ type: '', msg: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus({ type: '', msg: '' });

    try {
      const res = await fetch('/api/admin/update-movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) setStatus({ type: 'success', msg: '✅ შენახულია!' });
      else setStatus({ type: 'error', msg: `❌ შეცდომა: ${data.error}` });
    } catch (err) {
      setStatus({ type: 'error', msg: '❌ კავშირის შეცდომა.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResync = async () => {
    if (!confirm("გინდა განაახლო მონაცემები TMDB-დან? (სახელი, რეიტინგი, სურათები)")) return;
    setIsResyncing(true);
    try {
        const res = await fetch('/api/admin/resync-movie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tmdb_id: movie.tmdb_id, type: movie.type }),
        });
        if (res.ok) {
            alert("განახლდა! გვერდი გადაიტვირთება.");
            router.reload();
        } else {
            alert("ვერ განახლდა.");
        }
    } catch (e) { alert("შეცდომა."); }
    finally { setIsResyncing(false); }
  };

  const handleDelete = async () => {
    if (!confirm('დარწმუნებული ხარ?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-movie', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: movie.tmdb_id }),
      });
      if (res.ok) router.push('/admin');
      else alert('ვერ წაიშალა.');
    } catch (error) { alert('შეცდომა.'); } 
    finally { setIsDeleting(false); }
  };

  const publicLink = `/${movie.type === 'movie' ? 'movie' : 'tv'}/${movie.tmdb_id}-link`;

  return (
    <div className="bg-[#10141A] text-white min-h-screen font-sans">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 pt-32 pb-20">
        {/* ზედა პანელი */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4 bg-[#151a21] p-4 rounded-xl border border-gray-800">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">&larr;</button>
            <div>
                <h1 className="text-xl font-bold">{movie.title_ru}</h1>
                <span className="text-xs text-gray-500 uppercase">{movie.type} | {movie.release_year}</span>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button 
              type="button"
              onClick={handleResync}
              disabled={isResyncing}
              className="bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-900 px-4 py-2 rounded-lg transition text-sm flex items-center gap-2"
            >
              {isResyncing ? '⏳' : '🔄 Resync API'}
            </button>

            <Link href={publicLink} target="_blank" className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition text-sm flex items-center gap-2 border border-gray-600">
              საიტზე
            </Link>
            
            <button 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900 px-4 py-2 rounded-lg transition text-sm"
            >
              {isDeleting ? '...' : 'წაშლა'}
            </button>
          </div>
        </div>

        {status.msg && (
          <div className={`p-4 rounded-lg mb-6 ${status.type === 'success' ? 'bg-green-900/50 text-green-200 border border-green-700' : 'bg-red-900/50 text-red-200 border border-red-700'}`}>
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#151a21] p-6 md:p-8 rounded-xl border border-gray-800 shadow-2xl space-y-6 relative">
          {/* დამალვის გადამრთველი */}
          <div className="absolute top-6 right-8">
             <label className="inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    name="is_hidden"
                    checked={formData.is_hidden}
                    onChange={handleChange}
                    className="sr-only peer" 
                />
                <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-300">საიტიდან დამალვა</span>
            </label>
          </div>

          <h2 className="text-lg font-bold border-b border-gray-700 pb-2">მთავარი ინფორმაცია</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-bold mb-2 text-gray-300">Kinopoisk ID</label>
                <input type="number" name="kinopoisk_id" value={formData.kinopoisk_id} onChange={handleChange} className="w-full bg-[#0d1116] border border-gray-700 rounded-lg p-3 text-white focus:border-brand-red focus:outline-none" />
            </div>
            <div>
                <label className="block text-sm font-bold mb-2 text-gray-300">სათაური (RU)</label>
                <input type="text" name="title_ru" value={formData.title_ru} onChange={handleChange} className="w-full bg-[#0d1116] border border-gray-700 rounded-lg p-3 text-white focus:border-brand-red focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">ტრეილერი (Embed URL)</label>
            <input type="text" name="trailer_url" value={formData.trailer_url} onChange={handleChange} className="w-full bg-[#0d1116] border border-gray-700 rounded-lg p-3 text-white focus:border-brand-red focus:outline-none" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-300">Poster Path</label>
              <input type="text" name="poster_path" value={formData.poster_path} onChange={handleChange} className="w-full bg-[#0d1116] border border-gray-700 rounded-lg p-3 text-white text-xs font-mono" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-300">Backdrop Path</label>
              <input type="text" name="backdrop_path" value={formData.backdrop_path} onChange={handleChange} className="w-full bg-[#0d1116] border border-gray-700 rounded-lg p-3 text-white text-xs font-mono" />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-800 flex justify-end">
            <button type="submit" disabled={isSaving} className={`px-8 py-3 rounded-lg font-bold text-white shadow-lg transition-all hover:scale-[1.02] ${isSaving ? 'bg-gray-600 cursor-not-allowed' : 'bg-brand-red hover:bg-red-700'}`}>
              {isSaving ? 'ინახება...' : 'შენახვა'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}