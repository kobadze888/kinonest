/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  images: {
    remotePatterns: [
      {
        // 1. Доверенный домен для TMDB (уже был)
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      },
      // 💡 --- ВОТ ИСПРАВЛЕНИЕ --- 💡
      {
        // 2. Добавляем 'placehold.co' для запасных картинок
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**', // Разрешаем все пути на этом домене
      },
    ],
  },
};

export default nextConfig;