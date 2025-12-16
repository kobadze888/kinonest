/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: 'https://kinonest.tv',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  exclude: ['/admin', '/auth/*', '/watchlist'],
  robotsTxtOptions: {
    additionalSitemaps: [
      'https://kinonest.tv/sitemap.xml',
    ],
  },
}