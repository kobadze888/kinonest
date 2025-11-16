// src/pages/api/sync-db.js (მინიმალური ჩაწერა + ლოგირება)
import { query } from '../../lib/db';
import { slugify } from '../../lib/utils';
import { fetchData } from '../../lib/api'; 

const PLAYER_API_ENDPOINT = 'https://kinobd.net/api/films';

async function insertMovie(movie, tmdbData) {

  const movieTitle = movie.name_russian || tmdbData.title || tmdbData.name || 'Неизвестное название';
  const movieSlug = slugify(movieTitle);

  // ვამცირებთ ველებს აბსოლუტურ მინიმუმამდე (NOT NULL ველები)
  const insertQuery = `
    INSERT INTO movies(
      tmdb_id, slug, title_ru
    )
    VALUES($1, $2, $3)
    ON CONFLICT (tmdb_id) DO NOTHING;
  `;

  const values = [
    parseInt(tmdbData.id), 
    movieSlug,
    movieTitle,
  ];

  try {
    await query(insertQuery, values);
    return { status: 'inserted' };
  } catch (e) {
    // ეს არის ის, რაც გვჭირდება: ტერმინალში უნდა დაიწეროს ზუსტი შეცდომა
    console.error("POSTGRES FATAL INSERT FAILED:", e.message, "for TMDB ID:", tmdbData.id);
    return { status: 'failed', reason: e.message };
  }
}


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const tmdbList = await fetchData('/movie/popular', '&page=1'); 
  const tmdbMovies = tmdbList?.results || [];

  let moviesInserted = 0;

  try {
    for (const tmdbMovie of tmdbMovies) {
      const tmdbId = tmdbMovie.id;

      const playerUrl = `${PLAYER_API_ENDPOINT}/${tmdbId}`;
      const playerResponse = await fetch(playerUrl);

      if (!playerResponse.ok && playerResponse.status !== 404) continue;

      const playerData = playerResponse.status === 200 ? await playerResponse.json() : null;
      const movieData = playerData?.data ? playerData.data[0] : null; 

      if (movieData && movieData.tmdb_id) {
        try {
          await insertMovie(movieData, tmdbMovie);
          moviesInserted++;
        } catch (insertError) {
          // ლოგირება ხდება insertMovie-ის შიგნით
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }

    res.status(200).json({ 
      success: true, 
      message: `Minimal sync complete. Inserted: ${moviesInserted} movies.` 
    });

  } catch (error) {
    console.error('Fatal sync handler error:', error);
    res.status(500).json({ error: 'Fatal error during sync process.' });
  }
}