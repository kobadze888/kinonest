import { query } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'არაავტორიზებული' });

  const { tmdb_id, type } = req.body; // type გვჭირდება (movie/tv)

  try {
    // 1. TMDB მოთხოვნა
    const url = `${TMDB_BASE_URL}/${type}/${tmdb_id}?api_key=${TMDB_API_KEY}&language=ru-RU`;
    const tmdbRes = await fetch(url);
    
    if (!tmdbRes.ok) throw new Error("TMDB Data not found");
    
    const data = await tmdbRes.json();

    // 2. ბაზის განახლება (განვაახლებთ რეიტინგს, პოსტერს, აღწერას და სტატუსს)
    await query(`
      UPDATE media
      SET 
        rating_tmdb = $1,
        poster_path = $2,
        backdrop_path = $3,
        overview = $4,
        updated_at = NOW()
      WHERE tmdb_id = $5
    `, [
      data.vote_average,
      data.poster_path,
      data.backdrop_path,
      data.overview,
      tmdb_id
    ]);

    res.status(200).json({ success: true, message: "მონაცემები განახლდა TMDB-დან" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}