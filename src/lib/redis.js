import Redis from 'ioredis';

// ლოკალურ გარემოში რომ არ გაჭედოს, თუ Redis არ გაქვს დაყენებული
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  lazyConnect: true, // არ დაელოდოს კავშირს გაშვებისას
  maxRetriesPerRequest: 1, // ბევრჯერ არ სცადოს, რომ საიტი არ გაჩერდეს
  retryStrategy: (times) => {
    if (times > 1) return null; // თუ ერთხელ ვერ დაუკავშირდა, გაჩერდეს
    return 50;
  }
});

redis.on('error', (err) => {
  // ლოკალურად რომ არ ამოაგდოს Error Screen, უბრალოდ კონსოლში დაწეროს
  console.warn('Redis connection failed. Caching is disabled locally.', err.message);
});

export default redis;