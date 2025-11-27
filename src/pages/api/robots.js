export default function handler(req, res) {
  // Получаем текущий домен
  const host = req.headers.host || '';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  
  // 🛡️ Если в адресе есть "vercel.app", считаем это тестом и блокируем
  const isTestDomain = host.includes('vercel.app');

  let content = '';

  if (isTestDomain) {
    // ⛔ ТЕСТОВЫЙ РЕЖИМ: Закрываем от Google
    content = `User-agent: *\nDisallow: /`;
  } else {
    // ✅ БОЕВОЙ РЕЖИМ: Открываем для Google
    content = `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: ${protocol}://${host}/sitemap.xml`;
  }

  res.setHeader('Content-Type', 'text/plain');
  res.write(content);
  res.end();
}