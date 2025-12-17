const EXTERNAL_DATA_URL = 'https://kinonest.tv';

export async function getServerSideProps({ res }) {
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
      <loc>${EXTERNAL_DATA_URL}/sitemap-media.xml</loc>
    </sitemap>
    <sitemap>
      <loc>${EXTERNAL_DATA_URL}/sitemap-actors.xml</loc>
    </sitemap>
  </sitemapindex>`;

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemapIndex);
  res.end();

  return { props: {} };
}

export default function SiteMapIndex() {}