// src/pages/api/admin/add-movie.js (დიაგნოსტიკური რეჟიმი)
import { query } from '@/lib/db';
import { slugify } from '@/lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { movie } = req.body;

  if (!movie || !movie.tmdb_id || !movie.kinopoisk_id) {
    return res.status(400).json({ error: 'Missing required IDs' });
  }

  try {
    const movieTitle = movie.name_russian || movie.name_original || 'Неизвестное название';
    
    let movieSlug = slugify(movieTitle);
    if (!movieSlug) {
      movieSlug = `tmdb-id-${movie.tmdb_id}`;
    }

    const insertQuery = `
      INSERT INTO movies(
        tmdb_id, slug, title_ru, kinopoisk_id
      )
      VALUES($1, $2, $3, $4)
      ON CONFLICT (tmdb_id) DO NOTHING;
    `;
    
    const values = [
      parseInt(movie.tmdb_id), 
      movieSlug,
      movieTitle,
      movie.kinopoisk_id ? parseInt(movie.kinopoisk_id) : null,
    ];

    await query(insertQuery, values);
    res.status(200).json({ success: true, inserted_id: movie.tmdb_id });

  } catch (e) {
    // --- 💡 მთავარი ცვლილება ---
    // ჩვენ ახლა ვაბრუნებთ ზუსტ შეცდომის ტექსტს კლიენტთან
    console.error("ADD-MOVIE API FAILED:", e.message);
    res.status(500).json({ 
      error: 'Database insert failed (სერვერის შეცდომა)', 
      message: e.message, // (მაგ: "connection timed out")
      code: e.code,       // (მაგ: "ETIMEDOUT")
      stack: e.stack      // (სრული სტეკი)
    });
    // --- დასასრული ---
  }
}