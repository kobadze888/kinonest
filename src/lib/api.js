// --- ⚠️ ВАЖНО! TMDB API ключ ---
// -----------------------------------------------------------------
const API_KEY = 'f44912cf0212276fe1d1c6149f14803a'; // <-- ჩასვით თქვენი გასაღები აქ
// -----------------------------------------------------------------

const BASE_API_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
export const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

/**
 * მთავარი ფუნქცია API-დან მონაცემების წამოსაღებად (TMDB)
 * ეს ფუნქცია იმუშავებს სერვერზე (Next.js-ის getServerSideProps-ში)
 */
export async function fetchData(endpoint, params = '') {
  if (API_KEY === 'YOUR_TMDB_API_KEY_HERE' || !API_KEY) {
    console.error('API Key is missing in src/lib/api.js!');
    // პროდაქშენზე შეცდომის ნაცვლად, უბრალოდ დავაბრუნოთ null
    return null;
  }
  
  // ენა დაყენებულია რუსულზე (როგორც პროტოტიპში)
  const url = `${BASE_API_URL}${endpoint}?api_key=${API_KEY}&language=ru-RU${params}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`HTTP error! status: ${response.status} for URL: ${url}`);
        return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}:`, error);
    return null;
  }
}