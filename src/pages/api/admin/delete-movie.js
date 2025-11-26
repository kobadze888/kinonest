import { query } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'არაავტორიზებული' });

  if (req.method !== 'DELETE') return res.status(405).json({ message: 'Method Not Allowed' });

  const { tmdb_id } = req.body;

  try {
    await query('DELETE FROM media WHERE tmdb_id = $1', [tmdb_id]);
    await query('DELETE FROM media_actors WHERE media_id = $1', [tmdb_id]); // კავშირების წაშლა
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}