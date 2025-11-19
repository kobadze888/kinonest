// src/lib/api.js
// ⚠️ API Key ახლა მოდის .env.local ფაილიდან უსაფრთხოებისთვის

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_API_URL = 'https://api.themoviedb.org/3';

export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
export const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

/**
 * მთავარი ფუნქცია API-დან მონაცემების წამოსაღებად (TMDB)
 */
export async function fetchData(endpoint, params = '') {
  // 1. შემოწმება: გვაქვს თუ არა გასაღები?
  if (!API_KEY) {
    console.error('🔥 შეცდომა: TMDB API Key ვერ მოიძებნა! შეამოწმეთ .env.local ფაილი.');
    return null;
  }
  
  // 2. URL-ის აწყობა
  const url = `${BASE_API_URL}${endpoint}?api_key=${API_KEY}&language=ru-RU${params}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
        console.error(`HTTP შეცდომა! სტატუსი: ${response.status} მისამართზე: ${url}`);
        return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`მონაცემების წამოღების შეცდომა (${endpoint}):`, error);
    return null;
  }
}