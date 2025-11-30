// src/lib/api.js
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_API_URL = 'https://api.themoviedb.org/3';

export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// 🚀 ULTRA OPTIMIZATION: 'original'-ის ნაცვლად ვიყენებთ 'w1280'-ს.
// ეს დრამატულად ამცირებს LCP-ს (7 წამიდან -> 1-2 წამამდე).
export const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';

// 📱 MOBILE OPTIMIZATION: კიდევ უფრო მსუბუქი ვერსია მობილურებისთვის
export const MOBILE_BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w780';

export async function fetchData(endpoint, params = '') {
  if (!API_KEY) return null;
  const url = `${BASE_API_URL}${endpoint}?api_key=${API_KEY}&language=ru-RU${params}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return null;
  }
}