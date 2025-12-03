// src/pages/api/get-kodik-link.js
export default async function handler(req, res) {
  const { kp_id } = req.query;
  const token = '3dfb9a9b93cf6b9dbe6de7644bc4b3da'; // თქვენი Kodik API Key

  if (!kp_id) {
    return res.status(400).json({ error: 'No Kinopoisk ID provided' });
  }

  try {
    // ვეძებთ ყველა ტიპის მასალას (ფილმი/სერიალი/ანიმე) KP ID-ით
    const url = `https://kodikapi.com/search?token=${token}&kinopoisk_id=${kp_id}&with_material_data=true`;

    const response = await fetch(url);
    if (!response.ok) return res.status(404).json({ error: 'Kodik API Error' });

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // ვიღებთ პირველივე შედეგის ლინკს
      let link = data.results[0].link;
      
      // ვასწორებთ პროტოკოლს (თუ http-ით მოვიდა)
      if (link.startsWith('//')) link = 'https:' + link;
      
      return res.status(200).json({ link });
    } else {
      return res.status(404).json({ error: 'Not found in Kodik' });
    }
  } catch (error) {
    console.error("Kodik API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}