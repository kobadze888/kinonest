// src/pages/api/kodik-proxy.js
export default async function handler(req, res) {
  const { kinopoisk_id } = req.query;
  const token = '3dfb9a9b93cf6b9dbe6de7644bc4b3da';

  // თუ KP ID არ არის, ეგრევე ვწყვეტთ
  if (!kinopoisk_id) {
      return res.status(400).json({ error: 'No Kinopoisk ID' });
  }

  // ვეძებთ ყველა ტიპს, მაგრამ ლიმიტი 1 საკმარისია, რადგან ID უნიკალურია
  const baseParams = `token=${token}&limit=1&with_material_data=true&types=foreign-movie,russian-movie,cartoon,foreign-cartoon,russian-cartoon,anime,multi-part-film,foreign-serial,russian-serial,cartoon-serial,documentary-serial,anime-serial`;

  try {
    const url = `https://kodikapi.com/search?${baseParams}&kinopoisk_id=${kinopoisk_id}`;
    const response = await fetch(url);
    
    if (!response.ok) return res.status(404).json({ error: 'API Error' });
    
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      let link = data.results[0].link;
      
      // HTTPS-ის გასწორება
      if (link.startsWith('//')) link = 'https:' + link;
      else if (link.startsWith('http:')) link = link.replace('http:', 'https:');
      
      return res.status(200).json({ link });
    } else {
      // თუ ID-ით ვერ იპოვა, ვაბრუნებთ 404-ს (არაფერს ვსვამთ)
      return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}