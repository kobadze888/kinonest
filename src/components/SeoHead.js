import Head from 'next/head';
import { useRouter } from 'next/router';

export default function SeoHead({ 
  title, 
  description, 
  image, 
  type = 'website', 
  releaseYear,
  rating
}) {
  const router = useRouter();
  
  // 💡 ვიღებთ დომენს გარემოს ცვლადიდან. თუ არ არის, ვიყენებთ დეფოლტს
  const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://kinonest.vercel.app';
  
  // კანონიკური ლინკის აწყობა (პარამეტრების გარეშე, სუფთა URL)
  const canonicalUrl = `${domain}${router.asPath.split('?')[0]}`;
  
  const siteName = "KinoNest";
  
  // სათაურის გენერაცია (თუ წელი არის, ვამატებთ)
  const fullTitle = title 
    ? `${title} (${releaseYear || '2025'}) смотреть онлайн бесплатно | ${siteName}`
    : `${siteName} - Фильмы и сериалы онлайн бесплатно`;

  // აღწერის გენერაცია (მაქს 160 სიმბოლო SEO-სთვის)
  const finalDesc = description 
    ? description.replace(/<[^>]*>?/gm, '').slice(0, 160).trim() + (description.length > 160 ? '...' : '')
    : 'Смотрите новинки кино и сериалов бесплатно в высоком качестве HD 1080p. Большая база фильмов без регистрации.';

  // სურათის სრული URL
  const imageUrl = image && image.startsWith('/') ? `${domain}${image}` : image;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={finalDesc} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph (Facebook, Telegram, WhatsApp) */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content="ru_RU" />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDesc} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      
      {/* Robots Tag */}
      <meta name="robots" content="index, follow" />
      
      {/* დამატებითი მეტა მონაცემები */}
      {rating && <meta name="rating" content="general" />}
      <meta name="theme-color" content="#e50914" />
    </Head>
  );
}