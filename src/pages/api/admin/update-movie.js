import { query } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'არაავტორიზებული' });

  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  // დაემატა is_hidden
  const { tmdb_id, kinopoisk_id, title_ru, trailer_url, poster_path, backdrop_path, is_hidden } = req.body;

  try {
    await query(`
      UPDATE media
      SET 
        kinopoisk_id = $1, 
        title_ru = $2, 
        trailer_url = $3, 
        poster_path = $4, 
        backdrop_path = $5,
        is_hidden = $6, 
        updated_at = NOW()
      WHERE tmdb_id = $7
    `, [
      kinopoisk_id ? parseInt(kinopoisk_id) : null,
      title_ru,
      trailer_url || null,
      poster_path,
      backdrop_path,
      is_hidden === true, // Boolean მნიშვნელობა
      tmdb_id
    ]);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}