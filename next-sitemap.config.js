/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://kinonest.tv',
  generateRobotsTxt: true,
  sitemapSize: 7000, // 70,000 ფილმს დაყოფს 10 მოსახერხებელ ფაილად
  exclude: ['/admin', '/auth/*', '/watchlist'],
  robotsTxtOptions: {
    additionalSitemaps: [
      'https://kinonest.tv/sitemap.xml',
    ],
  },
}