// src/pages/api/get-flixcdn-link.js

// ეს ცვლადი ინახავს მონაცემებს ოპერატიულ მეხსიერებაში
const cache = new Map();
const CACHE_TTL = 3600 * 1000; // 1 საათი (მილიწამებში)

export default async function handler(req, res) {
  const { kp_id, imdb_id } = req.query;
  const token = '248da8cab617df272ec39ac68fa2bd09'; 

  // უნიკალური გასაღები ქეშისთვის
  const cacheKey = `flix_${kp_id}_${imdb_id}`;

  // 1. ვამოწმებთ, ხომ არ გვაქვს უკვე დამახსოვრებული
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    // თუ 1 საათი არ გასულა, ვაბრუნებთ ქეშიდან (სერვერის დატვირთვა = 0)
    if (Date.now() - timestamp < CACHE_TTL) {
      return res.status(200).json(data);
    }
  }

  // პრიორიტეტების აწყობა
  let searchParam = '';
  if (kp_id) searchParam = `kinopoisk_id=${kp_id}`;
  else if (imdb_id) searchParam = `imdb_id=${imdb_id}`;
  else return res.status(400).json({ error: 'No ID provided' });

  try {
    // 2. თუ ქეშში არაა, ვაკეთებთ რეალურ მოთხოვნას
    const url = `https://api0.flixcdn.biz/api/search?token=${token}&${searchParam}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('API Error');

    const apiData = await response.json();

    if (apiData.result && apiData.result.length > 0) {
      let link = apiData.result[0].iframe_url;
      if (link && link.startsWith('//')) link = 'https:' + link;
      
      const successData = { link };

      // 3. ვიმახსოვრებთ პასუხს მეხსიერებაში
      cache.set(cacheKey, { data: successData, timestamp: Date.now() });
      
      // ვიცავთ მეხსიერებას გადავსებისგან (თუ 10,000-ზე მეტი დაგროვდა, ვასუფთავებთ)
      if (cache.size > 10000) cache.clear();

      return res.status(200).json(successData);
    }
    
    return res.status(404).json({ error: 'Not found' });

  } catch (error) {
    console.error("FlixCDN API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}