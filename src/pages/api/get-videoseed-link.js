// src/pages/api/get-videoseed-link.js

const cache = new Map();
const CACHE_TTL = 3600 * 1000; // 1 საათი

export default async function handler(req, res) {
  const { kp_id, type } = req.query;
  const token = '1ccc47a54ed933114fe53245ec93f6c5';

  if (!kp_id) return res.status(400).json({ error: 'No ID' });

  const apiType = type === 'tv' ? 'serial' : 'movie';
  const cacheKey = `vs_${kp_id}_${apiType}`;

  // 1. ქეშის შემოწმება
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL) {
      return res.status(200).json(data);
    }
  }

  try {
    const url = `https://api.videoseed.tv/apiv2.php?token=${token}&list=${apiType}&kp=${kp_id}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('API Error');

    const data = await response.json();

    if (data.status === 'success' && data.data && data.data.length > 0) {
      const iframeUrl = data.data[0].iframe;
      const successData = { link: iframeUrl };

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