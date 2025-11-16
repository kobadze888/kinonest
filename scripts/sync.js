// scripts/sync.js
// ეს სკრიპტი იტვირთება და მუშაობს პირდაპირ Node-ში.

require('dotenv').config({ path: './.env.local' });
const { query } = require('../src/lib/db'); // db.js უნდა იყოს CommonJS ფორმატში

const PLAYER_API_ENDPOINT = 'https://kinobd.net/api/films';

// --- (აქ ჩავსვამთ insertMovie ლოგიკას) ---
async function insertMovie(movie, tmdbData) {
  const movieTitle = movie.name_russian || tmdbData.title || tmdbData.name || 'Неизвестное название';
  
  let movieSlug = movieTitle.toLowerCase() // Simple slugify for CLI
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-');
  
  if (!movieSlug) { movieSlug = `tmdb-id-${tmdbData.id}`; }

  const insertQuery = `
    INSERT INTO movies(
      tmdb_id, slug, title_ru, overview, release_date
    )
    VALUES($1, $2, $3, $4, $5)
    ON CONFLICT (tmdb_id) DO NOTHING;
  `;
  
  const values = [
    parseInt(tmdbData.id), 
    movieSlug,
    movieTitle,
    movie.description || tmdbData.overview || 'Описание отсутствует.',
    movie.year ? `${movie.year}-01-01` : null,
  ];

  await query(insertQuery, values);
}
// --- (დასასრული) ---


async function runSync() {
  console.log('--- Начат процесс синхронизации базы KinoNest ---');
  
  // 1. Get a list of top movies from TMDB
  const tmdbList = await fetch('https://api.themoviedb.org/3/movie/popular?api_key=f44912cf0212276fe1d1c6149f14803a&language=ru-RU&page=1')
                           .then(res => res.json());

  const tmdbMovies = tmdbList?.results || [];

  let moviesInserted = 0;
  let moviesFailed = 0;
  
  for (const tmdbMovie of tmdbMovies) {
    const tmdbId = tmdbMovie.id;
    
    // 2. Fetch the corresponding player data by ID
    const playerUrl = `${PLAYER_API_ENDPOINT}/${tmdbId}`;
    let movieData = null;

    try {
      const playerResponse = await fetch(playerUrl);
      if (playerResponse.ok) {
        const playerData = await playerResponse.json();
        movieData = playerData?.data ? playerData.data[0] : null;
      }
    } catch (e) {
      console.log(`[СКИП] TMDB ID ${tmdbId}: Player API connection failed.`);
      moviesFailed++;
      continue;
    }


    if (movieData && movieData.kinopoisk_id) {
      // 3. Insert into our Postgres database
      try {
        await insertMovie(movieData, tmdbMovie);
        moviesInserted++;
      } catch (insertError) {
        console.error(`[SQL FAIL] TMDB ID ${tmdbId}:`, insertError.message);
        moviesFailed++;
      }
    } else {
      moviesFailed++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 300)); 
  }

  console.log('--- Синхронизация завершена ---');
  console.log(`Успешно добавлено: ${moviesInserted}`);
  console.log(`Пропущено (нет плеера/ошибка): ${moviesFailed}`);
}

runSync().catch(err => {
  console.error('Критическая ошибка запуска синхронизации:', err.message);
  process.exit(1);
});