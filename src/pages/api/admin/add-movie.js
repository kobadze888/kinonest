// src/pages/api/admin/add-movie.js
import { query } from '@/lib/db';
import { slugify } from '@/lib/utils';

export default async function handler(req, res) {
  // TODO: მომავალში დავამატებთ პაროლის შემოწმებას
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { movie, tmdbData } = req.body;

  // --- უსაფრთხოების შემოწმებები ---
  if (!movie || !tmdbData || !tmdbData.id || !movie.kinopoisk_id) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  try {
    const movieTitle = movie.name_russian || tmdbData.title || tmdbData.name || 'Неизвестное название';
    let movieSlug = slugify(movieTitle);
    if (!movieSlug) {
      movieSlug = `tmdb-id-${tmdbData.id}`;
    }

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
    res.status(200).json({ success: true, inserted_id: tmdbData.id });

  } catch (e) {
    console.error("ADD-MOVIE API FAILED:", e.message);
    res.status(500).json({ error: 'Database insert failed', message: e.message });
  }
}