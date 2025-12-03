// src/pages/api/get-kodik-link.js

const cache = new Map();
const CACHE_TTL = 3600 * 1000; // 1 საათი

export default async function handler(req, res) {
  const { kp_id } = req.query;
  const token = '3dfb9a9b93cf6b9dbe6de7644bc4b3da'; 

  if (!kp_id) return res.status(400).json({ error: 'No KP ID' });

  const cacheKey = `kodik_${kp_id}`;

  // 1. ქეშის შემოწმება
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL) {
      return res.status(200).json(data);
    }
  }

  try {
    const url = `https://kodikapi.com/search?token=${token}&kinopoisk_id=${kp_id}&with_material_data=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('API Error');

    const apiData = await response.json();

    if (apiData.results && apiData.results.length > 0) {
      let link = apiData.results[0].link;
      if (link.startsWith('//')) link = 'https:' + link;
      
      const successData = { link };
      
      // 2. დამახსოვრება
      cache.set(cacheKey, { data: successData, timestamp: Date.now() });
      if (cache.size > 10000) cache.clear();

      return res.status(200).json(successData);
    } else {
      return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}