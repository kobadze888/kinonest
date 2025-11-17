// src/pages/api/sync-db.js (Final Minimal Insert)
import { query } from '../../lib/db';
import { slugify } from '../../lib/utils';
import { fetchData } from '../../lib/api';

const PLAYER_API_ENDPOINT = 'https://kinobd.net/api/films';

async function insertMovie(movie, tmdbData) {
  const movieTitle = movie.name_russian || tmdbData.title || tmdbData.name || 'Неизвестное название';
  
  let movieSlug = slugify(movieTitle);
  if (!movieSlug) {
      movieSlug = `tmdb-id-${tmdbData.id}`; 
  }

  // ვწერთ მხოლოდ აბსოლუტურ მინიმუმს, რომ დარწმუნდეთ, კავშირი მუშაობს
  const insertQuery = `
    INSERT INTO movies(
      tmdb_id, slug, title_ru, kinopoisk_id
    )
    VALUES($1, $2, $3, $4)
    ON CONFLICT (tmdb_id) DO NOTHING;
  `;
  
  const values = [
    parseInt(tmdbData.id), 
    movieSlug,
    movieTitle,
    movie.kinopoisk_id ? parseInt(movie.kinopoisk_id) : null,
  ];

  await query(insertQuery, values);
  return { status: 'inserted' };
}


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const MAX_PAGES_TO_FETCH = 5; 
  let currentPage = 1;
  let moviesInserted = 0;
  
  try {
    for (let i = 0; i < MAX_PAGES_TO_FETCH; i++) {
      const tmdbList = await fetchData('/movie/popular', `&page=${currentPage}`); 
      const tmdbMovies = tmdbList?.results || [];

      if (tmdbMovies.length === 0) break;

      for (const tmdbMovie of tmdbMovies) {
        const tmdbId = tmdbMovie.id;
        
        const playerUrl = `${PLAYER_API_ENDPOINT}/${tmdbId}`;
        const playerResponse = await fetch(playerUrl);
        const playerData = playerResponse.status === 200 ? await playerResponse.json() : null;
        const movieData = playerData?.data ? playerData.data[0] : null;

        if (movieData && movieData.tmdb_id) {
          await insertMovie(movieData, tmdbMovie);
          moviesInserted++;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      currentPage++;
    }

    res.status(200).json({ 
      success: true, 
      message: `Minimal sync complete. Inserted: ${moviesInserted} movies.` 
    });

  } catch (error) {
    console.error('Fatal sync error:', error);
    res.status(500).json({ error: 'Fatal error during sync process.' });
  }
}