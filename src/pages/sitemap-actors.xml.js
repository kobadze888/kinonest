import { query } from '@/lib/db';
const EXTERNAL_DATA_URL = 'https://kinonest.tv';

export async function getServerSideProps({ res }) {
  // ქეშირება 24 საათით სერვერის დატვირთვის შესამცირებლად
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
  
  try {
    // თქვენი Prisma სქემის მიხედვით ცხრილის სახელია "actors"
    // ვიღებთ მხოლოდ id-ს, რადგან slug სვეტი ბაზაში არ არსებობს
    const result = await query(`
      SELECT id 
      FROM actors 
      ORDER BY popularity DESC 
      LIMIT 45000
    `);

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${result.rows.map(actor => `
        <url>
          <loc>${EXTERNAL_DATA_URL}/actor/${actor.id}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <priority>0.6</priority>
        </url>`).join('')}
    </urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    res.write(sitemap);
    res.end();
  } catch (error) {
    console.error("Sitemap Actors Error:", error);
    res.statusCode = 500;
    res.write('Internal Server Error');
    res.end();
  }
  return { props: {} };
}

export default function ActorsSitemap() {}