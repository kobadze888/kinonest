// src/pages/api/sync-db.js (გაძლიერებული, უსაფრთხო ვერსია)
import { query } from '../../lib/db';
import { slugify } from '../../lib/utils'; 

const PLAYER_API_ENDPOINT = 'https://kinobd.net/api/films';

async function insertMovie(movie) {
  const {
    tmdb_id, kinopoisk_id, name_russian, description, year,
    time_minutes, small_poster, big_poster, rating_kp,
    rating_imdb, genre_ru, name_original
  } = movie;
  
  // --- 1. კრიტიკული შემოწმებები ---
  // ვამოწმებთ, რომ აუცილებელი ველები არსებობს (tmdb_id, title_ru, slug)
  if (!tmdb_id) return { status: 'skipped', reason: 'Missing TMDB ID' };
  
  const movieTitle = name_russian || name_original || 'Неизвестное название';
  const movieSlug = slugify(movieTitle);
  
  if (!movieSlug) return { status: 'skipped', reason: 'Could not create slug' };
  // --- დასასრული ---

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
    parseInt(tmdb_id), // უზრუნველყოფს, რომ ID იყოს რიცხვი
    kinopoisk_id ? parseInt(kinopoisk_id) : null, // უსაფრთხო კონვერტაცია
    movieSlug,
    movieTitle,
    description,
    year ? `${year}-01-01` : null, 
    time_minutes || null,
    small_poster,
    big_poster,
    rating_kp || rating_imdb || null,
    genre_ru, 
  ];

  await query(insertQuery, values);
  return { status: 'inserted' };
}


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  let currentPage = 1;
  let hasMore = true;
  let moviesInserted = 0;
  let moviesSkipped = 0;
  
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
             try {
                const result = await insertMovie(movie);
                if (result.status === 'inserted') {
                  moviesInserted++;
                } else if (result.status === 'skipped') {
                  moviesSkipped++;
                }
              } catch (insertError) {
                // თუ ეს არის დუბლიკატი (უკვე არსებობს), უბრალოდ გამოვტოვოთ
                if (!insertError.message.includes('duplicate key')) {
                  console.error(`DB Insert Error for TMDB ID ${movie.tmdb_id}:`, insertError.message);
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
      message: `Successfully synced ${moviesInserted} new movies. Skipped ${moviesSkipped} items due to missing data. Fetched ${currentPage - 1} pages.` 
    });

  } catch (error) {
    console.error('Fatal sync error:', error);
    res.status(500).json({ error: 'Fatal error during sync process.' });
  }
}