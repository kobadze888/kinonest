export default function handler(req, res) {
  const host = req.headers.host || 'kinonest.tv';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  
  const isTestDomain = host.includes('vercel.app');

  let content = '';

  if (isTestDomain) {
    content = `User-agent: *\nDisallow: /`;
  } else {
    // დარწმუნდით, რომ Allow: / არის პირველი
    content = `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /auth/\n\nSitemap: ${protocol}://${host}/sitemap.xml`;
  }

  res.setHeader('Content-Type', 'text/plain');
  res.write(content);
  res.end();
}