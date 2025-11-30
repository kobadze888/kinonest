// src/pages/admin/index.js
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { getSession, signOut } from 'next-auth/react';
import { query } from '@/lib/db';
import Header from '@/components/Header';
import Pagination from '@/components/Pagination';
import Link from 'next/link';

export async function getServerSideProps(context) {
  // 1. ავტორიზაციის შემოწმება
  const session = await getSession(context);
  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
    };
  }

  const page = parseInt(context.query.page) || 1;
  const search = context.query.q || '';

  // ფილტრები URL-დან
  const statusFilter = context.query.status || 'all';
  const typeFilter = context.query.type || 'all';
  const yearFilter = context.query.year || 'all';

  const limit = 20;
  const offset = (page - 1) * limit;

  let items = [];
  let total = 0;
  let stats = {};
  let availableYears = []; // 🆕 აქ შევინახავთ წლებს ბაზიდან

  try {
    // 🆕 1. წლების წამოღება ბაზიდან (დინამიურად)
    const yearsRes = await query(`
        SELECT DISTINCT release_year 
        FROM media 
        WHERE release_year IS NOT NULL 
        ORDER BY release_year DESC
    `);
    availableYears = yearsRes.rows.map(r => r.release_year);

    // 2. სტატისტიკის წამოღება
    const statsRes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE type = 'movie') as movies,
        COUNT(*) FILTER (WHERE type = 'tv') as tv_shows,
        COUNT(*) FILTER (WHERE kinopoisk_id IS NULL) as no_kp,
        COUNT(*) FILTER (WHERE is_hidden = TRUE) as hidden
      FROM media
    `);
    stats = statsRes.rows[0];

    // 3. ფილტრაციის ლოგიკა
    let whereClause = "1=1";
    let params = [];
    let paramIndex = 1;

    if (search) {
      if (!isNaN(search)) {
        whereClause += ` AND (tmdb_id = $${paramIndex} OR kinopoisk_id = $${paramIndex})`;
      } else {
        whereClause += ` AND (title_ru ILIKE $${paramIndex} OR title_en ILIKE $${paramIndex})`;
      }
      params.push(search.trim());
      paramIndex++;
    }

    if (typeFilter !== 'all') {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(typeFilter);
      paramIndex++;
    }

    if (yearFilter !== 'all') {
      whereClause += ` AND release_year = $${paramIndex}`;
      params.push(parseInt(yearFilter));
      paramIndex++;
    }

    if (statusFilter === 'no_kp') whereClause += ` AND kinopoisk_id IS NULL`;
    if (statusFilter === 'hidden') whereClause += ` AND is_hidden = TRUE`;
    if (statusFilter === 'no_trailer') whereClause += ` AND trailer_url IS NULL`;

    // მონაცემების წამოღება
    const queryParams = [...params, limit, offset];
    const itemsRes = await query(`
SELECT tmdb_id, imdb_id, title_ru, title_en, release_year, type, kinopoisk_id, rating_imdb, is_hidden, search_slug      FROM media
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    items = itemsRes.rows;

    // რაოდენობის დათვლა
    const countRes = await query(`SELECT COUNT(*) FROM media WHERE ${whereClause}`, params);
    total = parseInt(countRes.rows[0].count);

  } catch (e) {
    console.error("Admin Error:", e);
  }

  return {
    props: {
      items: JSON.parse(JSON.stringify(items)),
      stats: JSON.parse(JSON.stringify(stats)),
      availableYears: JSON.parse(JSON.stringify(availableYears)), // 🆕 ვაწვდით კომპონენტს
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      filters: { search, status: statusFilter, type: typeFilter, year: yearFilter },
      user: session.user
    }
  };
}

// 🆕 დაემატა availableYears პროპსებში
export default function AdminDashboard({ items, stats, availableYears, currentPage, totalPages, filters, user }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(filters.search);

  const updateFilter = (key, value) => {
    router.push({
      pathname: '/admin',
      query: { ...router.query, page: 1, [key]: value },
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilter('q', searchTerm);
  };

  return (
    <div className="bg-[#10141A] text-white min-h-screen font-sans">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 pt-32 pb-20">
        {/* Header & Logout */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">ადმინ პანელი</h1>
            <Link href="/admin/sync-dashboard" className="bg-blue-900/30 border border-blue-800 text-blue-200 px-4 py-2 rounded hover:bg-blue-900/50 transition text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              სინქრონიზაცია
            </Link>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-2 rounded hover:bg-red-900/50 transition text-sm">
            გასვლა
          </button>
        </div>

        {/* 📊 სტატისტიკის ბარათები */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="სულ მედია" value={stats.total} color="bg-gray-800" />
          <StatCard label="ფილმები" value={stats.movies} color="bg-blue-900/30 border-blue-500/30" />
          <StatCard label="სერიალები" value={stats.tv_shows} color="bg-purple-900/30 border-purple-500/30" />
          <StatCard label="ID აკლია" value={stats.no_kp} color="bg-red-900/30 border-red-500/30" isWarning={stats.no_kp > 0} />
          <StatCard label="დამალული" value={stats.hidden} color="bg-gray-700/50" />
        </div>

        {/* 🔍 ფილტრები */}
        <div className="bg-[#151a21] p-4 rounded-xl border border-gray-800 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <form onSubmit={handleSearch} className="flex gap-2 flex-grow w-full md:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ძებნა (სახელი, ID)..."
              className="flex-grow bg-black/30 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-red text-white text-sm"
            />
            <button type="submit" className="bg-brand-red px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition text-sm">
              ძებნა
            </button>
          </form>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="bg-black/30 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-brand-red focus:border-brand-red block p-2.5"
            >
              <option value="all">ყველა სტატუსი</option>
              <option value="no_kp">უპლეერო (No KP)</option>
              <option value="no_trailer">უტრეილერო</option>
              <option value="hidden">დამალული</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="bg-black/30 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-brand-red focus:border-brand-red block p-2.5"
            >
              <option value="all">ყველა ტიპი</option>
              <option value="movie">ფილმი</option>
              <option value="tv">სერიალი</option>
            </select>

            {/* 🆕 დინამიური წლების ფილტრი */}
            <select
              value={filters.year}
              onChange={(e) => updateFilter('year', e.target.value)}
              className="bg-black/30 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-brand-red focus:border-brand-red block p-2.5"
            >
              <option value="all">ნებისმიერი წელი</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#151a21] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/30 text-gray-400 uppercase text-xs tracking-wider font-medium">
                <tr>
                  <th className="px-6 py-4 w-10">#</th>
                  <th className="px-6 py-4 w-24">TMDB</th>
                  <th className="px-6 py-4 w-24 text-center">KP ID</th>
                  <th className="px-6 py-4">სათაური</th>
                  <th className="px-6 py-4 w-24">სტატუსი</th>
                  <th className="px-6 py-4 text-right">მოქმედება</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {items.map((item) => (
                  <tr key={item.tmdb_id} className={`hover:bg-white/5 transition group ${item.is_hidden ? 'opacity-50 bg-black/20' : ''}`}>
                    <td className="px-6 py-4 text-gray-600">{item.type === 'movie' ? '🎬' : '📺'}</td>
                    <td className="px-6 py-4 font-mono text-blue-400 text-xs">{item.tmdb_id}</td>
                    <td className="px-6 py-4 text-center font-mono text-xs">
                      {item.kinopoisk_id ? <span className="text-green-400">{item.kinopoisk_id}</span> : <span className="text-red-500">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{item.title_ru}</div>
                      <div className="text-gray-500 text-xs">{item.title_en} ({item.release_year})</div>
                    </td>
                    <td className="px-6 py-4">
                      {item.is_hidden && <span className="bg-red-900/50 text-red-200 text-[10px] px-2 py-1 rounded uppercase font-bold">HIDDEN</span>}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      {/* Ссылка на публичную страницу */}
                      <Link
                        href={`/${item.type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}-${item.search_slug}-smotret-onlain-besplatno`}
                        target="_blank"
                        className="bg-green-900/30 hover:bg-green-900/50 text-green-200 px-3 py-1.5 rounded transition text-xs border border-green-700"
                      >
                       საიტზე ნახვა
                      </Link>
                      {/* Ссылка на редактирование */}
                      <Link href={`/admin/edit/${item.tmdb_id}`} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded transition text-xs border border-gray-600">
                        რედაკტირება
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && <div className="p-12 text-center text-gray-500">მონაცემები ვერ მოიძებნა.</div>}
        </div>

        <div className="mt-8 flex justify-center">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => updateFilter('page', p)} />
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color, isWarning }) {
  return (
    <div className={`p-4 rounded-xl border ${color} ${isWarning ? 'animate-pulse border-red-500' : 'border-gray-800'} shadow-lg`}>
      <div className="text-gray-400 text-xs uppercase font-bold mb-1">{label}</div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}