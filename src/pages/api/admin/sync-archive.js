// src/pages/api/admin/sync-archive.js
// 🛠️ V5.2: Fixed BigInt Error (Rounded Popularity)

import { query } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { slugify } from '@/lib/utils';

const KINOBD_API_URL = 'https://kinobd.net/api/films';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const KODIK_TOKEN = 'b95c138cc28a8377412303d604251230';

const TARGET_YEARS = [
  1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999,
  2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
  2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019
];

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0.0.0 Safari/537.36"
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
function makeYoutubeUrl(key) { return `https://www.youtube.com/embed/${key}`; }
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTmdbDetails(tmdbId) {
  if (!tmdbId) return null;
  const endpoints = [`movie/${tmdbId}`, `tv/${tmdbId}`];
  for (const type of endpoints) {
    try {
      const url = `${TMDB_BASE_URL}/${type}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=credits,videos,external_ids`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        data.media_type = type.includes('movie') ? 'movie' : 'tv';
        return data;
      }
    } catch (e) {}
  }
  return null;
}

async function fetchEnglishTrailer(tmdbId, type) {
    try {
        const url = `${TMDB_BASE_URL}/${type}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const trailer = data.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        return trailer ? makeYoutubeUrl(trailer.key) : null;
    } catch (e) { return null; }
}

async function fetchKpIdFromWikidata(wikidataId) {
    if (!wikidataId) return null;
    try {
        const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const entity = data.entities[wikidataId];
        if (entity.claims && entity.claims.P2603) return parseInt(entity.claims.P2603[0].mainsnak.datavalue.value);
    } catch (e) { return null; }
    return null;
}

async function fetchKpIdFromKodik(title, year) {
    try {
        const url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&title=${encodeURIComponent(title)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const match = data.results.find(item => Math.abs(item.year - year) <= 1);
            if (match && match.kinopoisk_id && match.kinopoisk_id !== 'null') return parseInt(match.kinopoisk_id);
        }
    } catch (e) { return null; }
    return null;
}

async function fetchKpIdViaSearch(title, year) {
    const query = `site:kinopoisk.ru ${title} ${year}`;
    try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'User-Agent': getRandomUA() } });
        if (!res.ok) return null;
        const text = await res.text();
        let match = text.match(/kinopoisk\.ru\/(?:film|series)\/(\d+)/);
        if (match && match[1]) return parseInt(match[1]);
        match = text.match(/(?:kp|id|kinopoisk)[:\s]+(\d{6,8})/i);
        if (match && match[1]) return parseInt(match[1]);
    } catch (e) { return null; }
    return null;
}

async function upsertMediaToDB(tmdbId, kpId, tmdbItem, finalTrailer, kinobdItem) {
  const title_ru = kinobdItem?.name_russian || tmdbItem.title || tmdbItem.name || 'Без названия';
  const search_slug = slugify(title_ru);
  const release_date = tmdbItem.release_date || tmdbItem.first_air_date;
  const release_year = release_date ? parseInt(release_date.split('-')[0]) : (kinobdItem ? parseInt(kinobdItem.year) : 0);
  const runtime = tmdbItem.runtime || (tmdbItem.episode_run_time && tmdbItem.episode_run_time[0]) || null;
  
  // 💡 FIX: პოპულარობის დამრგვალება
  const popularity = Math.round(tmdbItem.popularity || 0);

  const queryText = `
    INSERT INTO media (
      tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
      poster_path, backdrop_path, release_year, rating_tmdb,
      genres_ids, genres_names, updated_at, created_at,
      trailer_url, runtime, budget, countries, rating_kp, rating_imdb,
      imdb_id, rating_kp_count, rating_imdb_count,
      age_restriction, slogan, premiere_ru, premiere_world, popularity, search_slug
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(),
      $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
    )
    ON CONFLICT (tmdb_id) DO NOTHING RETURNING tmdb_id;
  `;

  const values = [
    tmdbId, kpId, tmdbItem.media_type,
    title_ru, tmdbItem.original_title || tmdbItem.original_name, tmdbItem.overview,
    tmdbItem.poster_path, tmdbItem.backdrop_path, release_year,
    tmdbItem.vote_average,
    (tmdbItem.genres || []).map(g => g.id), (tmdbItem.genres || []).map(g => g.name), 
    finalTrailer, runtime, tmdbItem.budget || 0,
    (tmdbItem.production_countries || []).map(c => c.name), 0, 0,
    tmdbItem.external_ids?.imdb_id, 0, 0,
    null, tmdbItem.tagline, null,
    release_date, popularity, search_slug // 💡 გასწორებული popularity
  ];

  try {
    const res = await query(queryText, values);
    if (res.rows.length > 0) {
        if (tmdbItem.credits && tmdbItem.credits.cast) {
            const cast = tmdbItem.credits.cast.slice(0, 5);
            for (let i = 0; i < cast.length; i++) {
                const actor = cast[i];
                await query(`INSERT INTO actors (id, name, original_name, profile_path, popularity) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`, [actor.id, actor.name, actor.original_name, actor.profile_path, actor.popularity]);
                await query(`INSERT INTO media_actors (media_id, actor_id, character, "order") VALUES ($1, $2, $3, $4) ON CONFLICT (media_id, actor_id) DO NOTHING`, [tmdbId, actor.id, actor.character, i]);
            }
        }
        return { success: true };
    }
    return { success: false, type: 'EXISTS' }; 
  } catch (err) {
    return { success: false, type: 'ERROR', message: err.message };
  }
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'არაავტორიზებული' });
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const page = req.body.page || 1;
  const logs = [];
  let addedCount = 0;
  let skippedCount = 0;

  try {
    const response = await fetch(`${KINOBD_API_URL}?page=${page}`);
    if (!response.ok) throw new Error(`Kinobd API Error: ${response.status}`);
    
    const data = await response.json();
    const items = data.data || [];
    const lastPage = data.last_page;

    const validItems = items.filter(item => {
        const year = parseInt(item.year);
        return item.tmdb_id && TARGET_YEARS.includes(year);
    });

    logs.push(`📜 არქივი გვერდი ${page}: მუშავდება ${validItems.length} ფილმი...`);

    for (const item of validItems) {
        try {
            const tmdbId = parseInt(item.tmdb_id);
            const nameLog = item.name_russian || "უსახელო";

            const exists = await query('SELECT 1 FROM media WHERE tmdb_id = $1', [tmdbId]);
            if (exists.rows.length > 0) { 
                skippedCount++; 
                logs.push(`⚠️ [SKIP: EXISTS] ${nameLog}`);
                continue; 
            }

            const tmdbItem = await fetchTmdbDetails(tmdbId);
            if (!tmdbItem) {
                logs.push(`❌ [SKIP: TMDB ERROR] ${nameLog}`);
                continue;
            }

            const finalTitle = item.name_russian || tmdbItem.title || tmdbItem.name;
            if (!/[а-яА-ЯёЁ]/.test(finalTitle)) { 
                skippedCount++; 
                logs.push(`🚫 [SKIP: NO RU] ${finalTitle}`);
                continue; 
            }

            let kpId = item.kinopoisk_id ? parseInt(item.kinopoisk_id) : null;
            let source = "Kinobd";

            if (!kpId && tmdbItem.external_ids?.wikidata_id) {
                kpId = await fetchKpIdFromWikidata(tmdbItem.external_ids.wikidata_id);
                if (kpId) source = "Wikidata";
            }
            if (!kpId) {
                kpId = await fetchKpIdFromKodik(finalTitle, parseInt(item.year));
                if (kpId) source = "Kodik";
            }
            if (!kpId) {
                kpId = await fetchKpIdViaSearch(finalTitle, parseInt(item.year));
                if (kpId) { source = "Scraper"; await delay(1000); }
            }

            let finalTrailer = null;
            const ruTrailer = tmdbItem.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
            if (ruTrailer) finalTrailer = makeYoutubeUrl(ruTrailer.key);
            else {
                const enTrailer = await fetchEnglishTrailer(tmdbId, tmdbItem.media_type);
                if (enTrailer) finalTrailer = enTrailer;
                else if (item.trailer && item.trailer.includes('http')) finalTrailer = item.trailer;
            }

            const result = await upsertMediaToDB(tmdbId, kpId, tmdbItem, finalTrailer, item);
            
            if (result.success) {
                addedCount++;
                const idStatus = kpId ? `[${source}]` : `[⚠️ No ID]`;
                logs.push(`✅ ${idStatus} ${finalTitle}`);
            } else {
                skippedCount++;
                if (result.type === 'ERROR') {
                    logs.push(`🛑 [DB ERROR] ${finalTitle}: ${result.message}`);
                } else {
                    logs.push(`⚠️ [SKIP: EXISTS] ${finalTitle}`);
                }
            }
        } catch (innerErr) { 
            continue; 
        }
    }

    res.status(200).json({ success: true, page, lastPage, logs, added: addedCount, skipped: skippedCount });
  } catch (error) { res.status(500).json({ error: error.message, page }); }
}