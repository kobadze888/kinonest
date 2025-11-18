/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  images: {
    // 💡 Разрешаем SVG (нужно для placehold.co)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**', 
      },
    ],
  },
};

export default nextConfig;