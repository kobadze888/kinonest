// src/pages/api/sync-db.js (მხოლოდ TMDB მონაცემების ჩაწერა)
import { query } from '../../lib/db'; 
import { slugify } from '../../lib/utils';
import { fetchData } from '../../lib/api'; 

const PLAYER_API_ENDPOINT = 'https://kinobd.net/api/films'; // დროებით იგნორირებულია

async function insertMovie(tmdbMovie) { 
  const movieTitle = tmdbMovie.title || tmdbMovie.name || 'Неизвестное название';
  let movieSlug = slugify(movieTitle);
  if (!movieSlug) { movieSlug = `tmdb-id-${tmdbMovie.id}`; }

  // --- SQL: ვიყენებთ მხოლოდ სუფთა TMDB ველებს ---
  const insertQuery = `
    INSERT INTO movies(
      tmdb_id, slug, title_ru, overview, release_date
    )
    VALUES($1, $2, $3, $4, $5)
    ON CONFLICT (tmdb_id) DO NOTHING;
  `;
  
  const values = [
    parseInt(tmdbMovie.id), 
    movieSlug,
    movieTitle,
    tmdbMovie.overview,
    // უსაფრთხო თარიღის კონვერტაცია (თუ თარიღი არასრულია, უბრალოდ null ჩაიწერება)
    tmdbMovie.release_date || null, 
  ];

  await query(insertQuery, values);
  return { status: 'inserted' };
}


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const MAX_PAGES_TO_FETCH = 2; // ვამოწმებთ მხოლოდ 2 გვერდს
  let currentPage = 1;
  let moviesInserted = 0;
  
  try {
    for (let i = 0; i < MAX_PAGES_TO_FETCH; i++) {
      // 1. TMDB-დან ვიღებთ ფილმებს
      const tmdbList = await fetchData('/movie/popular', `&page=${currentPage}`); 
      const tmdbMovies = tmdbList?.results || [];

      if (tmdbMovies.length === 0) break;

      for (const tmdbMovie of tmdbMovies) {
        try {
          await insertMovie(tmdbMovie); // ვწერთ TMDB მონაცემებს პირდაპირ
          moviesInserted++;
        } catch (insertError) {
          // თუ SQL იშლება, ვლოგავთ შეცდომას
          if (!insertError.message.includes('duplicate key')) {
            console.error(`DB INSERT FAILED:`, insertError.message, 'ID:', tmdbMovie.id);
          }
        }
      }

      currentPage++;
    }

    res.status(200).json({ 
      success: true, 
      message: `TMDB-Only Sync complete. Inserted: ${moviesInserted} movies.` 
    });

  } catch (error) {
    console.error('Fatal sync error:', error);
    res.status(500).json({ error: 'Fatal error during sync process.' });
  }
}