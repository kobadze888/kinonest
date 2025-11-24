/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // ⚡ ჩართულია შეკუმშვა
  swcMinify: true,
  compress: true,
  poweredByHeader: false,

  images: {
    // 💡 მნიშვნელოვანი: ვუთითებთ ზუსტ ზომებს ოპტიმიზაციისთვის
    deviceSizes: [320, 420, 768, 1024, 1200], 
    imageSizes: [16, 32, 48, 64, 96],
    
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/avif', 'image/webp'], // AVIF ტელევიზორებისთვის ძალიან კარგია
    minimumCacheTTL: 60,
    
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
  
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
    ]
  },
};

export default nextConfig;