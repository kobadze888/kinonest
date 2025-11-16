// src/pages/api/sync-db.js (გასწორებული გზებით)
import { query } from '../../lib/db'; // <-- გზა გასწორებულია: ორი დონე ზემოთ
import { slugify } from '../../lib/utils'; // <-- გზა გასწორებულია: ორი დონე ზემოთ

const PLAYER_API_ENDPOINT = 'https://kinobd.net/api/films';

// ... (დანარჩენი კოდი უცვლელია) ...

async function insertMovie(movie) {
  const {
    tmdb_id, kinopoisk_id, name_russian, description, year,
    time_minutes, small_poster, big_poster, rating_kp,
    rating_imdb, genre_ru, name_original
  } = movie;

  const movieSlug = slugify(name_russian || name_original);

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
    tmdb_id,
    kinopoisk_id,
    movieSlug,
    name_russian || name_original,
    description,
    year ? `${year}-01-01` : null,
    time_minutes,
    small_poster,
    big_poster,
    rating_kp || rating_imdb,
    genre_ru,
  ];

  await query(insertQuery, values);
}


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  let currentPage = 1;
  let hasMore = true;
  let moviesInserted = 0;
  
  const MAX_PAGES_TO_FETCH = 5; 

  try {
    while (hasMore && currentPage <= MAX_PAGES_TO_FETCH) {
      const url = `${PLAYER_API_ENDPOINT}?page=${currentPage}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return res.status(500).json({ error: `API fetch failed for page ${currentPage}`, status: response.status });
      }

      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        for (const movie of result.data) {
          if (movie.tmdb_id) { 
             try {
                await insertMovie(movie);
                moviesInserted++;
              } catch (insertError) {
                if (!insertError.message.includes('duplicate key')) {
                  console.error(`Failed to insert movie ${movie.tmdb_id}`, insertError.message);
                }
              }
          }
        }
      }

      hasMore = result.has_more || false;
      if (hasMore) {
        currentPage++;
        await new Promise(resolve => setTimeout(resolve, 500)); 
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Successfully synced ${moviesInserted} movies. Fetched ${currentPage - 1} pages.` 
    });

  } catch (error) {
    console.error('Fatal sync error:', error);
    res.status(500).json({ error: 'Fatal error during sync process.' });
  }
}