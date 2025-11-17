// src/pages/api/sync-db.js (Final, Robust Sync Logic)
import { query } from '../../lib/db'; // <-- სწორი გზა
import { slugify } from '../../lib/utils'; // <-- სწორი გზა
import { fetchData } from '../../lib/api';

const PLAYER_API_ENDPOINT = 'https://kinobd.net/api/films';

async function insertMovie(movie, tmdbData) {
  const movieTitle = movie.name_russian || tmdbData.title || tmdbData.name || 'Неизвестное название';
  
  let movieSlug = slugify(movieTitle);
  if (!movieSlug) {
      movieSlug = `tmdb-id-${tmdbData.id}`; // უსაფრთხო ფოლბექი
  }

  const insertQuery = `
    INSERT INTO movies(
      tmdb_id, kinopoisk_id, slug, title_ru, overview, 
      release_date, runtime, poster_path, backdrop_path, 
      vote_average, genres
    )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (tmdb_id) DO NOTHING;
  `;
  
  const values = [
    parseInt(tmdbData.id), 
    movie.kinopoisk_id ? parseInt(movie.kinopoisk_id) : null,
    movieSlug,
    movieTitle,
    movie.description || tmdbData.overview,
    movie.year ? `${movie.year}-01-01` : null, 
    movie.time_minutes || tmdbData.runtime || null,
    movie.small_poster || tmdbData.poster_path,
    movie.big_poster || tmdbData.backdrop_path,
    movie.rating_kp || tmdbData.vote_average || null,
    movie.genre_ru || (tmdbData.genres ? JSON.stringify(tmdbData.genres.map(g => g.name)) : null),
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
  let hasMore = true;
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
          try {
            await insertMovie(movieData, tmdbMovie);
            moviesInserted++;
          } catch (insertError) {
            // იგნორირება თუ უკვე არსებობს
            if (!insertError.message.includes('duplicate key')) {
              console.error(`DB Insert Error for TMDB ID ${tmdbId}:`, insertError.message);
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 300)); // API თავაზიანობა
      }

      hasMore = tmdbList?.total_pages > currentPage;
      if (hasMore) currentPage++; else break;
    }

    res.status(200).json({ 
      success: true, 
      message: `Sync complete. Inserted: ${moviesInserted} new/updated movies. Total checked: ${currentPage * 20}.` 
    });

  } catch (error) {
    console.error('Fatal sync error:', error);
    res.status(500).json({ error: 'Fatal error during sync process.' });
  }
}