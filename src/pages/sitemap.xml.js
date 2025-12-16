import { query } from '@/lib/db'; //

const EXTERNAL_DATA_URL = 'https://kinonest.tv';

function generateSiteMap(media) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url><loc>${EXTERNAL_DATA_URL}</loc><priority>1.0</priority></url>
     <url><loc>${EXTERNAL_DATA_URL}/movies</loc><priority>0.9</priority></url>
     <url><loc>${EXTERNAL_DATA_URL}/tv-shows</loc><priority>0.9</priority></url>
     ${media.map(({ tmdb_id, type, search_slug, updated_at }) => {
       const path = type === 'movie' ? 'movie' : 'tv';
       return `
       <url>
           <loc>${EXTERNAL_DATA_URL}/${path}/${tmdb_id}-${search_slug}-smotret-onlain-besplatno</loc>
           <lastmod>${new Date(updated_at).toISOString()}</lastmod>
           <priority>0.8</priority>
       </url>`;
     }).join('')}
   </urlset>`;
}

export async function getServerSideProps({ res }) {
  // ვიღებთ ყველა ჩანაწერს ბაზიდან ლიმიტის გარეშე
  const result = await query(`
    SELECT tmdb_id, type, search_slug, updated_at 
    FROM media 
    WHERE is_hidden = false 
    ORDER BY updated_at DESC
  `);

  const sitemap = generateSiteMap(result.rows);

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return { props: {} };
}

export default function SiteMap() {}