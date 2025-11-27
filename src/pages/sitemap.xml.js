import { query } from '@/lib/db';

const EXTERNAL_DATA_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kinonest.vercel.app';

function generateSiteMap(movies, tvs) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>${EXTERNAL_DATA_URL}</loc>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     <url>
       <loc>${EXTERNAL_DATA_URL}/movies</loc>
       <changefreq>daily</changefreq>
       <priority>0.9</priority>
     </url>
     <url>
       <loc>${EXTERNAL_DATA_URL}/tv-shows</loc>
       <changefreq>daily</changefreq>
       <priority>0.9</priority>
     </url>
     ${movies
       .map(({ tmdb_id, search_slug, updated_at }) => {
         return `
       <url>
           <loc>${EXTERNAL_DATA_URL}/movie/${tmdb_id}-${search_slug}-smotret-onlain-besplatno</loc>
           <lastmod>${new Date(updated_at).toISOString()}</lastmod>
           <changefreq>weekly</changefreq>
           <priority>0.8</priority>
       </url>
     `;
       })
       .join('')}
     ${tvs
       .map(({ tmdb_id, search_slug, updated_at }) => {
         return `
       <url>
           <loc>${EXTERNAL_DATA_URL}/tv/${tmdb_id}-${search_slug}-smotret-onlain-besplatno</loc>
           <lastmod>${new Date(updated_at).toISOString()}</lastmod>
           <changefreq>weekly</changefreq>
           <priority>0.8</priority>
       </url>
     `;
       })
       .join('')}
   </urlset>
 `;
}

export async function getServerSideProps({ res }) {
  // ვიღებთ 10,000 ფილმს და 5,000 სერიალს (ლიმიტი სისწრაფისთვის)
  const moviesRes = await query(`
    SELECT tmdb_id, search_slug, updated_at 
    FROM media 
    WHERE type='movie' 
    ORDER BY updated_at DESC 
    LIMIT 10000
  `);
  
  const tvRes = await query(`
    SELECT tmdb_id, search_slug, updated_at 
    FROM media 
    WHERE type='tv' 
    ORDER BY updated_at DESC 
    LIMIT 5000
  `);

  const sitemap = generateSiteMap(moviesRes.rows, tvRes.rows);

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return { props: {} };
}

export default function SiteMap() {}