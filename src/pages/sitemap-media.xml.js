import { query } from '@/lib/db';
const EXTERNAL_DATA_URL = 'https://kinonest.tv';

export async function getServerSideProps({ res }) {
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');

  const result = await query(`
    SELECT tmdb_id, type, search_slug, updated_at 
    FROM media 
    WHERE is_hidden = false 
    ORDER BY updated_at DESC 
    LIMIT 45000
  `);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${result.rows.map(item => `
      <url>
        <loc>${EXTERNAL_DATA_URL}/${item.type === 'movie' ? 'movie' : 'tv'}/${item.tmdb_id}-${item.search_slug}-smotret-onlain-besplatno</loc>
        <lastmod>${new Date(item.updated_at).toISOString()}</lastmod>
        <priority>0.8</priority>
      </url>`).join('')}
  </urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();
  return { props: {} };
}
export default function MediaSitemap() {}