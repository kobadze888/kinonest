// src/pages/api/media-by-ids.js
import { query } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { ids } = req.query;

  if (!ids) {
    return res.status(200).json([]);
  }

  // ID-ების მასივად ქცევა (მაგ: "101,102" -> [101, 102])
  const idArray = ids.split(',').map(id => parseInt(id)).filter(n => !isNaN(n));

  if (idArray.length === 0) {
    return res.status(200).json([]);
  }

  try {
    // ვიღებთ ფილმებს, რომელთა ID არის ჩვენს სიაში
    const sql = `
      SELECT 
        tmdb_id, title_ru, poster_path, release_year, rating_tmdb, type, search_slug
      FROM media 
      WHERE tmdb_id = ANY($1::int[])
    `;
    
    const { rows } = await query(sql, [idArray]);
    
    res.status(200).json(rows);
  } catch (error) {
    console.error("API Error (media-by-ids):", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}