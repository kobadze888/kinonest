// src/pages/api/get-flixcdn-link.js
export default async function handler(req, res) {
  const { kp_id } = req.query;
  const token = '248da8cab617df272ec39ac68fa2bd09'; // თქვენი FlixCDN API Token

  if (!kp_id) {
    return res.status(400).json({ error: 'No Kinopoisk ID provided' });
  }

  try {
    // FlixCDN Search API
    const url = `https://api0.flixcdn.biz/api/search?token=${token}&kinopoisk_id=${kp_id}`;

    const response = await fetch(url);
    if (!response.ok) return res.status(404).json({ error: 'FlixCDN API Error' });

    const data = await response.json();

    // დოკუმენტაციის მიხედვით, შედეგი არის "result" მასივში
    if (data.result && data.result.length > 0) {
      // ვიღებთ პირველივე შედეგის iframe_url-ს
      let link = data.result[0].iframe_url;
      
      if (link) {
          // პროტოკოლის გასწორება (თუ // იწყება)
          if (link.startsWith('//')) link = 'https:' + link;
          return res.status(200).json({ link });
      }
    }
    
    return res.status(404).json({ error: 'Not found in FlixCDN' });

  } catch (error) {
    console.error("FlixCDN API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}