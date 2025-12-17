/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: 'https://kinonest.tv',
  generateRobotsTxt: true,
  sitemapSize: 5000, 
  exclude: ['/admin', '/auth/*', '/watchlist'],
  robotsTxtOptions: {
    additionalSitemaps: [
      'https://kinonest.tv/sitemap.xml',       // მთავარი ინდექსი
      'https://kinonest.tv/sitemap-media.xml', // ფილმები და სერიალები
      'https://kinonest.tv/sitemap-actors.xml' // მსახიობები
    ],
  },
}