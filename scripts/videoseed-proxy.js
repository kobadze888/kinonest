// src/pages/api/videoseed-proxy.js
export default async function handler(req, res) {
  const { kinopoisk_id, title } = req.query;
  const token = '1ccc47a54ed933114fe53245ec93f6c5'; // თქვენი VideoSeed ტოკენი

  if (!kinopoisk_id && !title) {
    return res.status(400).json({ error: 'No ID or Title provided' });
  }

  try {
    // დოკუმენტაციის მიხედვით, ვიყენებთ /api/list ენდპოინტს
    let apiUrl = `https://videoseed.tv/api/list?token=${token}`;

    if (kinopoisk_id) {
      apiUrl += `&kp_id=${kinopoisk_id}`;
    } else if (title) {
      apiUrl += `&title=${encodeURIComponent(title)}`;
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    // VideoSeed API აბრუნებს "results" მასივს
    if (data.results && data.results.length > 0) {
      // ვიღებთ iframe ველს პირველი შედეგიდან
      let link = data.results[0].iframe_src || data.results[0].iframe;
      
      if (!link) {
          return res.status(404).json({ error: 'Iframe not found in response' });
      }

      // HTTPS გასწორება
      if (link.startsWith('//')) link = 'https:' + link;
      else if (link.startsWith('http:')) link = link.replace('http:', 'https:');

      return res.status(200).json({ link });
    } else {
      return res.status(404).json({ error: 'Not found in VideoSeed' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}