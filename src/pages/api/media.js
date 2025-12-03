// src/pages/api/media.js
import { query } from '@/lib/db';

export default async function handler(req, res) {
  const { type, page = 1 } = req.query;
  
  const limit = 30;
  const offset = (page - 1) * limit;

  if (!type || (type !== 'movie' && type !== 'tv')) {
    return res.status(400).json({ error: 'Invalid type parameter' });
  }

  try {
    const columns = `
      tmdb_id, kinopoisk_id, type, title_ru, title_en, overview,
      poster_path, backdrop_path, release_year, rating_tmdb,
      genres_ids, genres_names,
      created_at::TEXT, updated_at::TEXT, rating_imdb, rating_kp
    `;

    // 💡 განახლებული სორტირება პრიორიტეტებით და დუბლიკატების დაცვით
    const sql = `
      SELECT ${columns} FROM media 
      WHERE type = $1
      ORDER BY 
        CASE 
          WHEN title_ru ~ '[а-яА-ЯёЁ]' 
               AND poster_path IS NOT NULL 
               AND kinopoisk_id IS NOT NULL 
          THEN 0 
          ELSE 1 
        END ASC,
        release_year DESC NULLS LAST, 
        rating_imdb DESC NULLS LAST,  /* 💡 IMDb პრიორიტეტი */
        created_at DESC,              /* 💡 სიახლე */
        tmdb_id DESC
      LIMIT $2 OFFSET $3
    `;

    const { rows } = await query(sql, [type, limit, offset]);
    
    res.status(200).json(rows);
  } catch (error) {
    console.error("API Media Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}