// src/pages/api/media.js
import redis from '@/lib/redis';
import { query } from '@/lib/db';

export default async function handler(req, res) {
  const cacheKey = 'home_media_list';

  try {
    // 1. ვცდილობთ ქეშიდან წაკითხვას
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // 2. თუ ქეშში არაა, მივდივართ ბაზაში
    const result = await query('SELECT * FROM media ORDER BY created_at DESC LIMIT 50');
    
    // 3. ვინახავთ ქეშში 15 წუთით
    try {
      await redis.setex(cacheKey, 900, JSON.stringify(result.rows));
    } catch (e) {
      console.error("Redis error:", e.message);
    }

    res.status(200).json(result.rows);
  } catch (error) {
    // შეცდომის შემთხვევაში ბაზა მაინც იმუშავებს
    const result = await query('SELECT * FROM media ORDER BY created_at DESC LIMIT 50');
    res.status(200).json(result.rows);
  }
}