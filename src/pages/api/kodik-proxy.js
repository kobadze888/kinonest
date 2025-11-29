// src/pages/api/kodik-proxy.js
export default async function handler(req, res) {
  const { kinopoisk_id, imdb_id, title } = req.query;
  const token = '3dfb9a9b93cf6b9dbe6de7644bc4b3da'; // თქვენი ტოკენი სქრინიდან

  // პრიორიტეტები: KP -> IMDb -> Title
  let apiUrl = `https://kodikapi.com/search?token=${token}&limit=1&with_material_data=true`;
  
  if (kinopoisk_id) apiUrl += `&kinopoisk_id=${kinopoisk_id}`;
  else if (imdb_id) apiUrl += `&imdb_id=${imdb_id}`;
  else if (title) apiUrl += `&title=${encodeURIComponent(title)}`;
  else return res.status(400).json({ error: 'No ID provided' });

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      let link = data.results[0].link;
      // ლინკის კორექცია (დავამატოთ https თუ აკლია)
      if (link.startsWith('//')) link = 'https:' + link;
      return res.status(200).json({ link });
    } else {
      return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}