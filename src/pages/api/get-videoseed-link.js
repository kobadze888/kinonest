// src/pages/api/get-videoseed-link.js
export default async function handler(req, res) {
  const { kp_id, type } = req.query; // type: 'movie' or 'tv'
  const token = '1ccc47a54ed933114fe53245ec93f6c5';

  if (!kp_id) {
    return res.status(400).json({ error: 'No Kinopoisk ID' });
  }

  // VideoSeed API იყენებს 'serial'-ს და არა 'tv'-ს
  const apiType = type === 'tv' ? 'serial' : 'movie';

  try {
    // ვეძებთ კონკრეტული KP ID-ით
    const url = `https://api.videoseed.tv/apiv2.php?token=${token}&list=${apiType}&kp=${kp_id}`;
    
    const response = await fetch(url);
    if (!response.ok) return res.status(404).json({ error: 'API Error' });

    const data = await response.json();

    if (data.status === 'success' && data.data && data.data.length > 0) {
      // ვიღებთ პირველივე შედეგის iframe-ს
      const iframeUrl = data.data[0].iframe;
      return res.status(200).json({ link: iframeUrl });
    } else {
      return res.status(404).json({ error: 'Not found in VideoSeed' });
    }
  } catch (error) {
    console.error("VideoSeed API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}